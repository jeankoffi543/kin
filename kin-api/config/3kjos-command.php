<?php
return [
   /* 
      Relative to base path
    */
   'paths' => [
      'controllers' => 'app/Http/Controllers',
      'requests' => 'app/Http/Requests',
      'resources' => 'app/Http/Resources',
      'services' => 'app/Services',
      'models' => 'app/Models',
      'factories' => 'database/factories',
      'migrations' => 'database/migrations',
      'seeders' => 'database/seeders',
      'views' => 'resources/views',
      'datasets' => 'tests/Datasets',
      'tests' => 'tests/Feature',
      'routes' => [
         'api' => 'routes/api.php',
         'web' => 'routes/web.php',
         'console' => 'routes/console.php',
      ]

   ],
   /* 
         Use option --endpoint_type to change this default endpoint
         values are: group, standalone, apiResource, resource
       */
   'route' => [
      'endpoint_type' => Kjos\Command\Enums\EndpointType::GROUP,
      'pagination' => [
         'limit' => 10,
      ]
   ],

   'tests' => [
      'dataset' => [
         'create_many_limit' => 5
      ]
   ],
   'seeders' => [
      'create_many_limit' => 5
   ],
];
