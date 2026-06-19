<?php

use App\Models\Admin;
use App\Models\Notification;
use App\Models\Title;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function adminActor(): Admin
{
    return Admin::create([
        'name'     => 'Actor Admin',
        'email'    => 'actor@kin.test',
        'password' => bcrypt('password123'),
        'role'     => 'admin',
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin CRUD (/admin/admins)
// ─────────────────────────────────────────────────────────────────────────────

test('admin can list all admins with pagination', function () {
    $actor = adminActor();
    Admin::create(['name' => 'Admin B', 'email' => 'b@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/admins?limit=1')
        ->assertOk()
        ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
        ->assertJsonCount(1, 'data');
});

test('admin can search admins by name', function () {
    $actor = adminActor();
    Admin::create(['name' => 'Unique Alice', 'email' => 'alice@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/admins?search=Alice')
        ->assertOk()->assertJsonFragment(['name' => 'Unique Alice']);
});

test('admin can filter admins by role', function () {
    $actor = adminActor();
    Admin::create(['name' => 'Support One', 'email' => 's1@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $response = $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/admins?role__eq=support')
        ->assertOk();

    collect($response->json('data'))->each(fn ($a) => expect($a['role'])->toBe('support'));
});

test('admin can sort admins by name descending', function () {
    $actor = adminActor();
    Admin::create(['name' => 'Zebra Admin', 'email' => 'z@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $response = $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/admins?sort_by=name&sort_desc=true')
        ->assertOk();

    $names = collect($response->json('data'))->pluck('name')->values();
    expect($names->first())->toBe('Zebra Admin');
});

test('admin can show a specific admin', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson("/api/admin/admins/{$actor->id}")
        ->assertOk()
        ->assertJsonPath('data.admin_id', $actor->id);
});

test('show non-existent admin returns 404', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/admins/99999')
        ->assertNotFound();
});

test('admin can create another admin', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/admins', [
            'name'     => 'New Admin',
            'email'    => 'new@kin.test',
            'password' => 'secret123',
            'role'     => 'support',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'New Admin');

    expect(Admin::where('email', 'new@kin.test')->exists())->toBeTrue();
});

test('admin creation fails with duplicate email', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/admins', [
            'name'     => 'Dup',
            'email'    => 'actor@kin.test',
            'password' => 'secret123',
            'role'     => 'admin',
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['email']]);
});

test('admin creation fails with invalid role', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/admins', [
            'name'     => 'Bad',
            'email'    => 'bad@kin.test',
            'password' => 'secret123',
            'role'     => 'superuser',
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['role']]);
});

test('admin can update another admin', function () {
    $actor  = adminActor();
    $target = Admin::create(['name' => 'Old Name', 'email' => 'old@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $this->actingAs($actor, 'admin-sanctum')
        ->putJson("/api/admin/admins/{$target->id}", ['name' => 'New Name'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name');
});

test('admin can delete another admin', function () {
    $actor  = adminActor();
    $target = Admin::create(['name' => 'To Delete', 'email' => 'del@kin.test', 'password' => bcrypt('pw'), 'role' => 'support']);

    $this->actingAs($actor, 'admin-sanctum')
        ->deleteJson("/api/admin/admins/{$target->id}")
        ->assertOk()->assertJsonPath('success', true);

    expect(Admin::find($target->id))->toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// User CRUD (/admin/users)
// ─────────────────────────────────────────────────────────────────────────────

test('admin can list all parent users', function () {
    $actor = adminActor();
    User::factory()->count(3)->create();

    $response = $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/users')
        ->assertOk()->assertJsonStructure(['data']);

    expect(count($response->json('data')))->toBeGreaterThanOrEqual(3);
});

test('admin can show a specific user', function () {
    $actor = adminActor();
    $user  = User::factory()->create(['name' => 'Target User']);

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson("/api/admin/users/{$user->id}")
        ->assertOk()->assertJsonPath('data.name', 'Target User');
});

test('admin can create a user', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/users', [
            'name'     => 'Created User',
            'email'    => 'created@kin.test',
            'password' => 'secret123',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'Created User');

    expect(User::where('email', 'created@kin.test')->exists())->toBeTrue();
});

test('admin can update a user', function () {
    $actor = adminActor();
    $user  = User::factory()->create(['name' => 'Before']);

    $this->actingAs($actor, 'admin-sanctum')
        ->putJson("/api/admin/users/{$user->id}", ['name' => 'After'])
        ->assertOk()
        ->assertJsonPath('data.name', 'After');
});

test('admin can delete a user', function () {
    $actor = adminActor();
    $user  = User::factory()->create();

    $this->actingAs($actor, 'admin-sanctum')
        ->deleteJson("/api/admin/users/{$user->id}")
        ->assertOk()->assertJsonPath('success', true);

    expect(User::find($user->id))->toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// Title CRUD (/admin/titles)
// ─────────────────────────────────────────────────────────────────────────────

test('admin can list titles with pagination and search', function () {
    $actor = adminActor();
    Title::create(['name' => 'Billing Support']);
    Title::create(['name' => 'Technical Issue']);

    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/titles?search=Billing')
        ->assertOk()->assertJsonFragment(['name' => 'Billing Support']);
});

test('admin can sort titles by name asc', function () {
    $actor = adminActor();
    Title::create(['name' => 'Z Title']);
    Title::create(['name' => 'A Title']);

    $response = $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/titles?sort_by=name')
        ->assertOk();

    expect($response->json('data.0.name'))->toBe('A Title');
});

test('admin can create a title', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/titles', ['name' => 'New Ticket Category'])
        ->assertStatus(201)
        ->assertJsonPath('data.name', 'New Ticket Category');

    expect(Title::where('name', 'New Ticket Category')->exists())->toBeTrue();
});

test('title creation fails without name', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/titles', [])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['name']]);
});

test('admin can show and update and delete a title', function () {
    $actor = adminActor();
    $title = Title::create(['name' => 'Old Title']);

    // show
    $this->actingAs($actor, 'admin-sanctum')
        ->getJson("/api/admin/titles/{$title->id}")
        ->assertOk()->assertJsonPath('data.name', 'Old Title');

    // update
    $this->actingAs($actor, 'admin-sanctum')
        ->putJson("/api/admin/titles/{$title->id}", ['name' => 'Updated Title'])
        ->assertOk()->assertJsonPath('data.name', 'Updated Title');

    // delete
    $this->actingAs($actor, 'admin-sanctum')
        ->deleteJson("/api/admin/titles/{$title->id}")
        ->assertOk()->assertJsonPath('success', true);

    expect(Title::find($title->id))->toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification CRUD (/admin/notifications)
// ─────────────────────────────────────────────────────────────────────────────

test('admin can create a broadcast notification for all users', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/notifications', [
            'audience' => 'all',
            'title'    => 'Platform Update',
            'body'     => 'We have released version 2.0.',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.title', 'Platform Update')
        ->assertJsonPath('data.audience', 'all');
});

test('admin can create a notification targeted at specific users', function () {
    $actor = adminActor();
    $user  = User::factory()->create();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/notifications', [
            'audience' => 'specific',
            'user_ids' => [$user->id],
            'title'    => 'Personal Alert',
            'body'     => 'This is just for you.',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.audience', 'specific');
});

test('notification creation fails when audience is specific and user_ids is missing', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/notifications', [
            'audience' => 'specific',
            'title'    => 'No users',
            'body'     => 'Problem.',
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['user_ids']]);
});

test('notification creation fails with invalid audience value', function () {
    $actor = adminActor();

    $this->actingAs($actor, 'admin-sanctum')
        ->postJson('/api/admin/notifications', [
            'audience' => 'none',
            'title'    => 'Bad audience',
            'body'     => 'Problem.',
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['audience']]);
});

test('admin can list, show, update, and delete notifications', function () {
    $actor        = adminActor();
    $notification = Notification::create(['audience' => 'all', 'title' => 'Old', 'body' => 'Body']);

    // list
    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/notifications')
        ->assertOk()->assertJsonStructure(['data']);

    // filter by audience
    $this->actingAs($actor, 'admin-sanctum')
        ->getJson('/api/admin/notifications?audience__eq=all')
        ->assertOk();

    // show
    $this->actingAs($actor, 'admin-sanctum')
        ->getJson("/api/admin/notifications/{$notification->id}")
        ->assertOk()->assertJsonPath('data.title', 'Old');

    // update
    $this->actingAs($actor, 'admin-sanctum')
        ->putJson("/api/admin/notifications/{$notification->id}", ['title' => 'Updated'])
        ->assertOk()->assertJsonPath('data.title', 'Updated');

    // delete
    $this->actingAs($actor, 'admin-sanctum')
        ->deleteJson("/api/admin/notifications/{$notification->id}")
        ->assertOk()->assertJsonPath('success', true);

    expect(Notification::find($notification->id))->toBeNull();
});
