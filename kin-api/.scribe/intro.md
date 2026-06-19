# Introduction

Kin Parental Control Platform REST API. Three guard-separated client surfaces: Parent app (Bearer Sanctum), Admin backoffice (Bearer admin-sanctum), and Child device (X-Device-UUID header).

<aside>
    <strong>Base URL</strong>: <code>http://localhost:8000</code>
</aside>

    This documentation covers all endpoints of the **Kin Parental Control API**.

    ## Authentication

    - **Parent / User** routes require a `Bearer` token obtained from `POST /api/user/login`.
    - **Admin Backoffice** routes require a `Bearer` token from `POST /api/admin/login`.
    - **Child Device** routes require the device UUID in the `X-Device-UUID` header.

    <aside>Use the tabs on the right to switch between Shell, JavaScript and PHP code examples.</aside>

