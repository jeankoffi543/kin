<?php

namespace App\Support;

class AmountResolver
{
    /**
     * Convert float amount to cents (integer) for Stripe/payment processors.
     */
    public static function toCents(float $amount): int
    {
        return (int) round($amount * 100);
    }

    /**
     * Convert cents (integer) back to float.
     */
    public static function fromCents(int $cents): float
    {
        return $cents / 100.0;
    }

    /**
     * Format currency amount for display.
     */
    public static function format(float $amount, string $currency = 'EUR', string $locale = 'fr_FR'): string
    {
        $formatter = new \NumberFormatter($locale, \NumberFormatter::CURRENCY);
        return $formatter->formatCurrency($amount, $currency);
    }
}
