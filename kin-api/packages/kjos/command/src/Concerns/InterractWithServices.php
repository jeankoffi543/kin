<?php

namespace Kjos\Command\Concerns;

trait InterractWithServices
{
    protected function resolveServices()
    {
        if (method_exists($this, 'getServices')) {
            foreach ($this->getServices() as $property => $serviceClass) {
                $this->{$property} = app($serviceClass);
            }
        }
    }
}
