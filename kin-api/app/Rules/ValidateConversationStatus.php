<?php

namespace App\Rules;

use App\Enums\ConversationStatus;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidateConversationStatus implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $validStatuses = ConversationStatus::values();
        
        if (!in_array($value, $validStatuses, true)) {
            $fail("The field :attribute must be a valid conversation status (" . implode(', ', $validStatuses) . ").");
        }
    }
}
