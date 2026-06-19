<?php

namespace Kjos\Command\Managers;

use Illuminate\Routing\Controller as LaravelController;
use Illuminate\Validation\ValidationException;
use Kjos\Command\Concerns\InterractWithServices;
use Throwable;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpFoundation\Response;

class Controller extends LaravelController
{
    use InterractWithServices;

    public function __construct()
    {
        $this->resolveServices();
    }

    protected function invokeWithCatching(callable $callback)
    {
        try {
            return $callback();
        } catch (HttpResponseException $e) {
            throw $e;
        } catch (ValidationException $e) {
            // Re-throw so Laravel's global handler renders a proper 422 JSON response.
            throw $e;
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Resource not found',
                'error' => $e->getMessage()
            ], Response::HTTP_NOT_FOUND);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'An error occurred',
                'error' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
