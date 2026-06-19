<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────

test('user can register with valid data', function () {
    $response = $this->postJson('/api/user/register', [
        'name'     => 'Jean Koffi',
        'email'    => 'jean@kin.test',
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['token', 'user' => ['user_id', 'name', 'email']]);

    expect(User::where('email', 'jean@kin.test')->exists())->toBeTrue();
});

test('register fails when name is missing', function () {
    $this->postJson('/api/user/register', [
        'email'    => 'jean@kin.test',
        'password' => 'secret123',
    ])
    ->assertStatus(400)->assertJsonStructure(['errors' => ['name']]);
});

test('register fails with invalid email', function () {
    $this->postJson('/api/user/register', [
        'name'     => 'Jean',
        'email'    => 'not-an-email',
        'password' => 'secret123',
    ])
    ->assertStatus(400)->assertJsonStructure(['errors' => ['email']]);
});

test('register fails with duplicate email', function () {
    User::factory()->create(['email' => 'taken@kin.test']);

    $this->postJson('/api/user/register', [
        'name'     => 'Jean',
        'email'    => 'taken@kin.test',
        'password' => 'secret123',
    ])
    ->assertStatus(400)->assertJsonStructure(['errors' => ['email']]);
});

test('register fails when password is too short', function () {
    $this->postJson('/api/user/register', [
        'name'     => 'Jean',
        'email'    => 'jean@kin.test',
        'password' => 'short',
    ])
    ->assertStatus(400)->assertJsonStructure(['errors' => ['password']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

test('user can login with correct credentials', function () {
    User::factory()->create([
        'email'    => 'login@kin.test',
        'password' => bcrypt('password123'),
    ]);

    $this->postJson('/api/user/login', [
        'email'    => 'login@kin.test',
        'password' => 'password123',
    ])
    ->assertOk()
    ->assertJsonStructure(['token', 'user' => ['user_id', 'email']]);
});

test('login fails with wrong password', function () {
    User::factory()->create(['email' => 'wrong@kin.test', 'password' => bcrypt('correct')]);

    $this->postJson('/api/user/login', [
        'email'    => 'wrong@kin.test',
        'password' => 'bad-password',
    ])->assertStatus(422);
});

test('login fails with unknown email', function () {
    $this->postJson('/api/user/login', [
        'email'    => 'nobody@kin.test',
        'password' => 'anything',
    ])->assertStatus(422);
});

test('login fails when email is missing', function () {
    $this->postJson('/api/user/login', ['password' => 'secret123'])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['email']]);
});

test('login fails when password is missing', function () {
    $this->postJson('/api/user/login', ['email' => 'jean@kin.test'])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['password']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout / Me
// ─────────────────────────────────────────────────────────────────────────────

test('authenticated user can logout', function () {
    $user  = User::factory()->create();
    $token = $user->createToken('user-token')->plainTextToken;

    $this->withToken($token)->postJson('/api/user/logout')
        ->assertOk()->assertJsonPath('message', 'Logged out successfully.');
});

test('unauthenticated request to logout returns 401', function () {
    $this->postJson('/api/user/logout')->assertUnauthorized();
});

test('authenticated user can retrieve their own profile', function () {
    $user = User::factory()->create(['name' => 'My Profile']);

    $this->actingAs($user, 'sanctum')->getJson('/api/user/me')
        ->assertOk()
        ->assertJsonPath('data.user_id', $user->id)
        ->assertJsonPath('data.name', 'My Profile');
});

test('unauthenticated request to me returns 401', function () {
    $this->getJson('/api/user/me')->assertUnauthorized();
});
