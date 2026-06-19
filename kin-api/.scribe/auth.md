# Authenticating requests

To authenticate requests, include an **`Authorization`** header with the value **`"Bearer {BEARER_TOKEN}"`**.

All authenticated endpoints are marked with a `requires authentication` badge in the documentation below.

Get a token via `POST /api/user/login` (parent), `POST /api/admin/login` (admin), or pass `X-Device-UUID` header (child device).
