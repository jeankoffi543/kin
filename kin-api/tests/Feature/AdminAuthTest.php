<?php

use App\Models\Admin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeAdmin(string $email = 'admin@kin.test', string $role = 'admin'): Admin
{
    return Admin::create([
        'name'     => 'Test Admin',
        'email'    => $email,
        'password' => bcrypt('password123'),
        'role'     => $role,
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

test('admin can login with correct credentials', function () {
    makeAdmin();

    $this->postJson('/api/admin/login', [
        'email'    => 'admin@kin.test',
        'password' => 'password123',
    ])
    ->assertOk()
    ->assertJsonStructure(['token', 'admin' => ['admin_id', 'email', 'role']]);
});

test('admin login fails with wrong password', function () {
    makeAdmin();

    $this->postJson('/api/admin/login', [
        'email'    => 'admin@kin.test',
        'password' => 'wrong-password',
    ])->assertStatus(422);
});

test('admin login fails with unknown email', function () {
    $this->postJson('/api/admin/login', [
        'email'    => 'ghost@kin.test',
        'password' => 'password123',
    ])->assertStatus(422);
});

test('admin login fails when email is missing', function () {
    $this->postJson('/api/admin/login', ['password' => 'password123'])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['email']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────────────────

test('authenticated admin can logout', function () {
    $admin = makeAdmin();
    $token = $admin->createToken('admin-token')->plainTextToken;

    $this->withToken($token)->postJson('/api/admin/logout')
        ->assertOk()->assertJsonPath('message', 'Logged out successfully.');
});

test('unauthenticated request to admin logout returns 401', function () {
    $this->postJson('/api/admin/logout')->assertUnauthorized();
});

test('user token cannot access admin routes', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/admin/admins')
        ->assertUnauthorized();
});
