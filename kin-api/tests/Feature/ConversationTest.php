<?php

use App\Enums\ConversationStatus;
use App\Models\Admin;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Title;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

function conversationAdmin(): Admin
{
    return Admin::create([
        'name'     => 'Conv Admin',
        'email'    => 'conv-admin@kin.test',
        'password' => bcrypt('password123'),
        'role'     => 'support',
    ]);
}

function conversationTitle(): Title
{
    return Title::create(['name' => 'General Support']);
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent: open, list, show, message
// ─────────────────────────────────────────────────────────────────────────────

test('parent can open a new support ticket conversation', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/conversations', ['title_id' => $title->id])
        ->assertStatus(201)
        ->assertJsonStructure(['data' => ['conversation_id', 'status', 'code']])
        ->assertJsonPath('data.status', 'pending');
});

test('opening conversation fails without title_id', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/conversations', [])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['title_id']]);
});

test('opening conversation fails with non-existent title', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/conversations', ['title_id' => 99999])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['title_id']]);
});

test('parent can list their own conversations with pagination', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();

    Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-AAAA']);
    Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-BBBB']);

    $other = User::factory()->create();
    Conversation::create(['user_id' => $other->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-CCCC']);

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/user/conversations?limit=10')
        ->assertOk()->assertJsonCount(2, 'data');
});

test('parent can view their own conversation thread', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-MY']);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/conversations/{$conv->id}")
        ->assertOk()->assertJsonPath('data.conversation_id', $conv->id);
});

test('parent cannot view another parent conversation', function () {
    $user  = User::factory()->create();
    $other = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $other->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-OTHER']);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/conversations/{$conv->id}")
        ->assertNotFound();
});

test('parent can send a message in their conversation', function () {
    Event::fake();

    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-MSG']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/message", ['content' => 'Hello support!'])
        ->assertStatus(201)
        ->assertJsonStructure(['data' => ['message_id', 'content', 'sender']])
        ->assertJsonPath('data.content', 'Hello support!');

    expect(Message::where('conversation_id', $conv->id)->count())->toBe(1);
});

test('message fails without content', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-NOCON']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/message", [])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['content']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-time: typing indicator + read receipts
// ─────────────────────────────────────────────────────────────────────────────

test('parent can broadcast a typing indicator', function () {
    Event::fake();

    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-TYPING']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/typing", ['is_typing' => true])
        ->assertOk()->assertJsonPath('success', true);
});

test('typing indicator fails without is_typing field', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-NOTYP']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/typing", [])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['is_typing']]);
});

test('parent can mark messages as read', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-READ']);
    $msg   = Message::create(['conversation_id' => $conv->id, 'sender' => 'user', 'content' => 'Hey', 'status' => 'sent']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/read", ['last_message_id' => $msg->id])
        ->assertOk()->assertJsonPath('success', true);

    expect($msg->fresh()->status->value)->toBe('read');
});

test('mark as read fails with non-existent message id', function () {
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-RDNOX']);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/conversations/{$conv->id}/read", ['last_message_id' => 99999])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['last_message_id']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin: list all, show any, message, filter, destroy
// ─────────────────────────────────────────────────────────────────────────────

test('admin can list all conversations with filter and sort', function () {
    $admin = conversationAdmin();
    $user  = User::factory()->create();
    $title = conversationTitle();

    Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-P1']);
    Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-A1']);

    // list all
    $this->actingAs($admin, 'admin-sanctum')
        ->getJson('/api/admin/conversations')
        ->assertOk()->assertJsonStructure(['data']);

    // filter by status
    $response = $this->actingAs($admin, 'admin-sanctum')
        ->getJson('/api/admin/conversations?status__eq=pending')
        ->assertOk();
    collect($response->json('data'))->each(fn ($c) => expect($c['status'])->toBe('pending'));

    // filter by code
    $response = $this->actingAs($admin, 'admin-sanctum')
        ->getJson('/api/admin/conversations?code__iLike=CONV-A')
        ->assertOk();
    expect($response->json('data.0.code'))->toBe('CONV-A1');
});

test('admin can view any conversation full thread', function () {
    $admin = conversationAdmin();
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-SHOW']);

    $this->actingAs($admin, 'admin-sanctum')
        ->getJson("/api/admin/conversations/{$conv->id}")
        ->assertOk()->assertJsonPath('data.conversation_id', $conv->id);
});

test('admin can reply to a conversation', function () {
    Event::fake();

    $admin = conversationAdmin();
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::ACTIVE, 'code' => 'CONV-REPLY']);

    $this->actingAs($admin, 'admin-sanctum')
        ->postJson("/api/admin/conversations/{$conv->id}/message", ['content' => 'Admin reply'])
        ->assertStatus(201)
        ->assertJsonPath('data.sender', 'admin');
});

test('admin can close (destroy) a conversation', function () {
    $admin = conversationAdmin();
    $user  = User::factory()->create();
    $title = conversationTitle();
    $conv  = Conversation::create(['user_id' => $user->id, 'title_id' => $title->id, 'status' => ConversationStatus::PENDING, 'code' => 'CONV-DEL']);

    $this->actingAs($admin, 'admin-sanctum')
        ->deleteJson("/api/admin/conversations/{$conv->id}")
        ->assertOk()->assertJsonPath('success', true);
});
