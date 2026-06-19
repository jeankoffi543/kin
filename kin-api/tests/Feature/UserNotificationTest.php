<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('parent can list notifications addressed to all or to them', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Notification::create(['audience' => 'all', 'title' => 'Global', 'body' => 'For everyone']);
    Notification::create(['audience' => 'specific', 'user_ids' => [$user->id], 'title' => 'Mine', 'body' => 'Just for me']);
    Notification::create(['audience' => 'specific', 'user_ids' => [$other->id], 'title' => 'Others', 'body' => 'Not mine']);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/user/notifications');

    $response->assertOk()->assertJsonCount(2, 'data');
    $titles = collect($response->json('data'))->pluck('title');
    expect($titles)->toContain('Global')->toContain('Mine')->not->toContain('Others');
});

test('parent can view a specific notification for all', function () {
    $user = User::factory()->create();
    $notif = Notification::create(['audience' => 'all', 'title' => 'Broadcast', 'body' => 'Body']);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/notifications/{$notif->id}")
        ->assertOk()->assertJsonPath('data.title', 'Broadcast');
});

test('parent cannot view a specific-audience notification meant for another user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $notif = Notification::create(['audience' => 'specific', 'user_ids' => [$other->id], 'title' => 'Private', 'body' => 'Not yours']);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/notifications/{$notif->id}")
        ->assertNotFound();
});

test('parent notification list supports pagination', function () {
    $user = User::factory()->create();

    for ($i = 1; $i <= 5; $i++) {
        Notification::create(['audience' => 'all', 'title' => "Alert {$i}", 'body' => "Body {$i}"]);
    }

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/user/notifications?limit=3');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.total', 5);
});

test('unauthenticated request to user notifications returns 401', function () {
    $this->getJson('/api/user/notifications')->assertUnauthorized();
});
