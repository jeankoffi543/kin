<?php

namespace App\Support;

class CountryCurrencyResolver
{
    private static array $mappings = [
        'FR' => 'EUR',
        'DE' => 'EUR',
        'IT' => 'EUR',
        'ES' => 'EUR',
        'GB' => 'GBP',
        'US' => 'USD',
        'CA' => 'CAD',
        'AU' => 'AUD',
        'JP' => 'JPY',
        'CH' => 'CHF',
    ];

    /**
     * Resolve currency code from ISO country code.
     */
    public static function resolve(string $countryCode, string $default = 'EUR'): string
    {
        $code = strtoupper(trim($countryCode));
        return self::$mappings[$code] ?? $default;
    }
}
