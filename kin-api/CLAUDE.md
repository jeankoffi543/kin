# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kin** is a parental-control platform. This repo (`kin-api`) is its Laravel 13 / PHP 8.4 API, serving three distinct, strictly-separated clients through `routes/api.php`:

- **Parent/user app** — `auth:sanctum` guard, `App\Models\User`
- **Admin backoffice** (Next.js) — `auth:admin-sanctum` guard, `App\Models\Admin` (own provider/table, fully isolated from users)
- **Child monitoring device** (React Native) — `App\Http\Middleware\CheckDeviceToken`, authenticated via `X-Device-UUID` header (or `device_uuid` param), resolves `App\Models\Device` and binds it to `$request->attributes->get('device')`

## Commands

- Local dev stack (server + queue listener + Pail logs + Vite, all concurrently): `composer dev`
- First-time setup (deps, `.env`, key, migrate, npm build): `composer setup`
- Tests: `php artisan test --compact` (filter with `--filter=name` or a file path). Tests run against SQLite `:memory:` with `QUEUE_CONNECTION=sync` (see `phpunit.xml`); `tests/Pest.php` does **not** globally enable `RefreshDatabase` — add `uses(RefreshDatabase::class)` per-file as needed (see `tests/Feature/DeviceSyncTest.php`).
- Queue worker for the `telemetry` queue and other async jobs (requires Redis): `php artisan horizon`
- Seed default admin (`admin@kjosguard.com` / `password123`) and support-ticket `titles`: `php artisan kjos:broadcast-init`
- Scaffold a new resource (controller/service/model/migration/resource/requests following this repo's conventions): `php artisan kjos:make:api {Name} --factory --test`, see `config/3kjos-command.php` for path/endpoint conventions.

## Architecture

### Zero-logic controllers (`kjos/command` package)

Every controller extends `App\Http\Controllers\Controller` → `Kjos\Command\Managers\Controller` (`packages/kjos/command/src/Managers/Controller.php`, namespace `Kjos\Command`, autoloaded from `packages/kjos/command/src`). This base class:

- Calls `resolveServices()` in its constructor, which reads the controller's `getServices(): array` method (`['propertyName' => ServiceClass::class, ...]`) and binds each via `app()`. Declare the service(s) you need this way instead of using `__construct`.
- Provides `invokeWithCatching(callable $callback)`, which **every** controller action wraps its body in. It re-throws `HttpResponseException`, converts `ModelNotFoundException` to a 404 JSON response, and converts any other `Throwable` to a 500 JSON response (`{message, error}`).

Controllers must contain **no business logic** — everything is delegated to the resolved service(s). When adding an endpoint, follow this pattern exactly (see `app/Http/Controllers/DeviceSyncController.php` for a minimal example).

### Service layer (`App\Services\Service`)

All services extend `App\Services\Service` (`app/Services/Service.php`), which provides generic CRUD built on `$this->model` / `$this->resource` (or `model()`/`resource()` overrides):

- `index()` auto-applies QueryMaster's `filterOnRequest()/searchOnRequest()/sortOnRequest()` scopes when the model uses those traits, and paginates with `?limit=` or `config('3kjos-command.route.pagination.limit')` (default 10).
- `show()`, `store()`, `update()`, `destroy()` — `store`/`update`/`destroy` optionally dispatch events declared in `$this->dispatchEvents` (`['created' => ..., 'updated' => ..., 'deleted' => ...]`).
- `saveFile()`/`fileKey()`/`filePath()` — generic upload persistence using `Str::ulid()` filenames; override `fileKey()`/`filePath()` per service.
- `isAdmin(): bool` — checks the `admin-sanctum` guard. Used throughout to branch admin-wide vs. user-scoped queries (e.g. `DeviceService::resolveDevice()`, `ConversationService::sendMessage()`).

### QueryMaster (`keky/query-master` package, namespace `Keky\QueryMaster`, `packages/keky/query-master/src`)

Models opt in via the `HasFilters`, `IsSearchable`, `IsSortable` traits and implement `filters()`, `searchable()`, and a `$sortable` array (see `app/Models/Device.php`, `app/Models/User.php`). Telemetry feed endpoints chain these scopes directly, e.g. `DeviceService::getCallsFeed()`:
```php
DeviceCall::query()->where('device_id', $device->id)
    ->filterOnRequest()->searchOnRequest()->sortOnRequest()->paginate($limit);
```

### Device telemetry sync pipeline

`POST /api/device/sync` (`DeviceSyncController::sync` → `DeviceSyncService::processDeviceSync`, `app/Services/DeviceSyncService.php`) is the core ingestion endpoint for the React Native device. It accepts a batch keyed by channel — `calls`, `sms`, `contacts`, `notifications`, `gps_locations`, `geofence_alerts`, `social_messages`, `browser_history`, `installed_apps`, `files`, `media` — mapped to tables/mappers in `DeviceSyncService::CHANNELS`.

Flow per channel:
1. Collect unique `sync_hash` values from the batch.
2. Query `ingested_payloads` for hashes already seen for this device; anything new is **chunk-inserted (500/batch)** into `ingested_payloads` first — this is the dedup lock.
3. Only rows whose hash was newly locked are mapped and dispatched via `ProcessTelemetryBatch` (`app/Jobs/ProcessTelemetryBatch.php`) onto the Horizon `telemetry` queue for the actual bulk insert.
4. All hashes (new + already-ingested) are reported back as `cleared` so the device can purge its local SQLite queue. If the lock insert fails, nothing is cleared for that channel (device retries next sync).
5. If `ProcessTelemetryBatch` permanently fails (after 3 tries / `[10, 30, 60]`s backoff), its `failed()` hook deletes its hashes from `ingested_payloads` to release the lock.

Every telemetry table also carries SSoT reconciliation fields: `local_sqlite_id`, `local_status` (`App\Enums\LocalStatus`: pending/processing/completed/failed), and `deleted_at_source`.

The same `CheckDeviceToken`-guarded group also exposes `device_restriction_rules` (pull) and `device_remote_commands` (C2-style `screenshot` / `screen_recording` / `live_mic` commands, pulled then answered via `respondToCommand`, which accepts an uploaded result file stored under `devices/commands/results`).

### Enums

All string-backed enums (`app/Enums/*.php`) use the `App\Enums\Values` trait, which adds a static `values(): array` used directly in migration `enum()` column definitions and for `tryFrom`/`from` casts. Follow this pattern for any new enum.

### Real-time broadcasting

- Support chat (`ConversationService`): `SendMessageBroadCast`, `TypingBroadcast`, `ConversationUpdatedBroadcast`, `UnreadCountBroadCast`, `MessageStatusBroadcast`. Channel authorization lives in `App\Broadcasting\ConversationAdminUser` (private — admins join any conversation, parents only their own) and `ConversationAdminUserPresence`.
- Device C2 (`DeviceService::executeRemoteCommand`): `ReceptBroadcast` is pushed to a per-device channel keyed by `device->uuid`, paired with an FCM push via `FcmService`.
- `BROADCAST_CONNECTION=log` locally; swap to Reverb/Pusher for real delivery.

### Subscriptions / payments (in progress, not yet wired to routes)

- `App\Pipes\BeforePaymentInitialize` and `PaymentVerified` are `Illuminate\Pipeline` stages over a `['user_id', 'amount', 'transaction_id', ...]` payload. `PaymentVerified` sets `User::subscription_status` to `ACTIVE`, clears `trial_ends_at`, and fires `PaymentCreated`.
- `App\Http\Middleware\CheckTrial` (not yet attached to any route group) gates access based on `SubscriptionStatus` (`ACTIVE`, or `TRIAL` with a future `trial_ends_at`).
- `App\Support\AmountResolver` (cents conversion, currency formatting) and `App\Support\CountryCurrencyResolver` (country → currency map) support this flow.

### Misc

- `is_admin()` (`app/Support/helpers.php`) checks the `admin-sanctum` guard first, falling back to a `role` attribute on the default-guard user.
- `App\Providers\HorizonServiceProvider` grants Horizon dashboard access to authenticated `admin-sanctum` users (in addition to local env).

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4
- laravel/framework (LARAVEL) - v13
- laravel/horizon (HORIZON) - v5
- laravel/pint (PINT) - v1
- laravel/prompts (PROMPTS) - v0
- laravel/reverb (REVERB) - v1
- laravel/sanctum (SANCTUM) - v4
- laravel/boost (BOOST) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- pestphp/pest (PEST) - v4
- phpunit/phpunit (PHPUNIT) - v12

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Follow existing application Enum naming conventions.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

## Pest

- This project uses Pest for testing. Create tests: `php artisan make:test --pest {name}`.
- The `{name}` argument should not include the test suite directory. Use `php artisan make:test --pest SomeFeatureTest` instead of `php artisan make:test --pest Feature/SomeFeatureTest`.
- Run tests: `php artisan test --compact` or filter: `php artisan test --compact --filter=testName`.
- Do NOT delete tests without approval.

</laravel-boost-guidelines>
