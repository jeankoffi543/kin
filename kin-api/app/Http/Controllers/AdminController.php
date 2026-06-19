<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminRequest;
use App\Http\Requests\AuthAdminRequest;
use App\Services\AdminService;
use App\Services\AuthAdminService;
use Illuminate\Http\Request;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group Admin: Authentication
 *
 * Admin backoffice login/logout and admin account CRUD.
 */
class AdminController extends BaseController
{
    /** @var AdminService */
    protected $service;

    /** @var AuthAdminService */
    protected $authService;

    public function getServices(): array
    {
        return [
            'service' => AdminService::class,
            'authService' => AuthAdminService::class,
        ];
    }

    public function login(AuthAdminRequest $request): mixed
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

    /**
     * @group Admin: Admin Management
     */
    public function index(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->index();
        });
    }

    /**
     * @group Admin: Admin Management
     */
    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    /**
     * @group Admin: Admin Management
     */
    public function store(AdminRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->createAdmin($request->validated());
        });
    }

    /**
     * @group Admin: Admin Management
     */
    public function update(int $id, AdminRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->updateAdmin($id, $request->validated());
        });
    }

    /**
     * @group Admin: Admin Management
     */
    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroy($id);
        });
    }
}
