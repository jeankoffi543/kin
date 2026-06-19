<?php

namespace App\Services;

use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Kjos\Command\Concerns\InterractWithServices;

/**
 * Abstract Base Service orchestrating pagination, query filters,
 * standard storage persistence, and transactional execution hooks.
 */
class Service
{
    use InterractWithServices;

    protected $model;
    protected $resource;
    protected $relations = [];
    protected $dispatchEvents = [];

    protected function model(mixed $mixed = null): string { return ''; }
    protected function resource(mixed $mixed = null): string { return ''; }
    protected function deleted($model): mixed { return ''; }

    public function resources($model)
    {
        return ($this->resource ?? $this->resource())::make($model);
    }

    public function resourcesCollection($resource)
    {
        return ($this->resource ?? $this->resource())::collection($resource);
    }

    protected function isAdmin(): bool
    {
        return Auth::guard('admin-sanctum')->check();
    }

    public function index($all = false): AnonymousResourceCollection
    {
        $limit = request()->integer('limit');
        $limit = $limit > 0 ? $limit : config('3kjos-command.route.pagination.limit', 10);

        $modelClass = $this->model ?? $this->model();
        $traits = class_uses_recursive($modelClass);
        $query = $modelClass::query();

        if (in_array(HasFilters::class, $traits)) { $query->filterOnRequest(); }
        if (in_array(IsSearchable::class, $traits)) { $query->searchOnRequest(); }
        if (in_array(IsSortable::class, $traits)) { $query->sortOnRequest(); }

        return $this->resourcesCollection($all ? $query->get() : $query->paginate($limit));
    }

    public function show($id): mixed
    {
        $model = ($this->model ?? $this->model())::findOrFail($id);
        return $this->resources($model);
    }

    public function store(array $data): mixed
    {
        $model = ($this->model ?? $this->model())::create($this->saveFile($data));
        if (! empty($this->dispatchEvents) && $event = data_get($this->dispatchEvents, 'created', null)) {
            $event::dispatch($model);
        }
        return $this->resources($model);
    }

    public function update(int $id, array $data): mixed
    {
        $model = ($this->model ?? $this->model())::findOrFail($id);
        if (count($data)) {
            $model->update($this->saveFile($data, true, $model));
            if (! empty($this->dispatchEvents) && $event = data_get($this->dispatchEvents, 'updated', null)) {
                $event::dispatch($model);
            }
        }
        return $this->resources($model);
    }

    /**
     * Delete model resources and associated storage files.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id): \Illuminate\Http\JsonResponse
    {
        $model = call_user_func([($this->model ?? $this->model()), 'find'], (int) $id);
        if ($model) {
            $fileKey = $this->fileKey();
            if (isset($model->{$fileKey}) && $model->{$fileKey}) { 
                Storage::delete($model->{$fileKey}); 
            }
            $model->delete();
            if (! empty($this->dispatchEvents) && $event = data_get($this->dispatchEvents, 'deleted', null)) {
                $event::dispatch($id, $this->deleted($model));
            }
        }
        return response()->json(['success' => true], 200);
    }

    public function saveFile($data, $update = false, $model = null): array
    {
        $fileKey = $this->fileKey();
        $file = data_get($data, $fileKey);
        if (! $file instanceof UploadedFile) { return $data; }

        if ($update && $model) {
            $existingFile = $model->{$fileKey};
            if ($existingFile) { Storage::delete($existingFile); }
        }
        $fileName = Str::ulid().'.'.$file->getClientOriginalExtension();
        $data[$fileKey] = $file->storeAs($this->filePath(), $fileName);
        return $data;
    }

    public function fileKey(): string { return 'image'; }
    public function filePath(): string { return 'image'; }
}
