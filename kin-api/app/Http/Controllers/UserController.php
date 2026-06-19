<?php

namespace App\Http\Controllers;

use App\Http\Requests\AuthUserRequest;
use App\Http\Requests\UserRequest;
use App\Services\AuthUserService;
use App\Services\UserService;
use Illuminate\Http\Request;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group User: Authentication
 *
 * Endpoints for parent / user account lifecycle (register, login, logout, profile).
 * Routes under `auth:admin-sanctum` share this controller for CRUD; those are tagged separately via `@group` on each method.
 */
class UserController extends BaseController
{
    /** @var UserService */
    protected $service;

    /** @var AuthUserService */
    protected $authService;

    public function getServices(): array
    {
        return [
            'service' => UserService::class,
            'authService' => AuthUserService::class,
        ];
    }

    public function register(UserRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->authService->register($request->validated());
        });
    }

    public function login(AuthUserRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->authService->login($request->only('email', 'password'));
        });
    }

    public function logout(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->authService->logout($request->user());
        });
    }

    public function me(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->show($request->user()->id);
        });
    }

    /**
     * @group Admin: User Management
     */
    public function index(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->index();
        });
    }

    /**
     * @group Admin: User Management
     */
    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    /**
     * @group Admin: User Management
     */
    public function store(UserRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->createParent($request->validated());
        });
    }

    /**
     * @group Admin: User Management
     */
    public function update(int $id, UserRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->updateParent($id, $request->validated());
        });
    }

    /**
     * @group Admin: User Management
     */
    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroy($id);
        });
    }
}
