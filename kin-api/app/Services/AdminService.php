<?php

namespace App\Services;

use App\Http\Resources\AuthAdminResource;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminService extends Service
{
    protected $model = Admin::class;
    protected $resource = AuthAdminResource::class;

    public function createAdmin(array $data): mixed
    {
        $data['password'] = Hash::make($data['password']);
        return $this->store($data);
    }

    public function updateAdmin(int $id, array $data): mixed
    {
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        return $this->update($id, $data);
    }
}
