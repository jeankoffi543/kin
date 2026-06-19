<?php

namespace App\Http\Controllers;

use App\Http\Requests\TitleRequest;
use App\Services\TitleService;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group Admin: Titles
 *
 * Manage support ticket category titles (admin-only CRUD).
 */
class TitleController extends BaseController
{
    /** @var TitleService */
    protected $service;

    public function getServices(): array
    {
        return [
            'service' => TitleService::class,
        ];
    }

    public function index(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->index();
        });
    }

    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    public function store(TitleRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->store($request->validated());
        });
    }

    public function update(int $id, TitleRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->update($id, $request->validated());
        });
    }

    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroy($id);
        });
    }
}
