<?php

namespace App\Services;

use App\Http\Resources\AuthUserResource;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService extends Service
{
    protected $model = User::class;
    protected $resource = AuthUserResource::class;

    public function createParent(array $data): mixed
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }
        return $this->store($data);
    }

    public function updateParent(int $id, array $data): mixed
    {
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        return $this->update($id, $data);
    }
}
