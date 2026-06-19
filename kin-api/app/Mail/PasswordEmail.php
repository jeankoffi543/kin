<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordEmail extends Mailable
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(string $resetUrl)
    {
        $this->resetUrl = $resetUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Kin - Password Reset Request',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: "<p>You requested a password reset. Click the link below to proceed:</p><a href='{$this->resetUrl}'>Reset Password</a>",
        );
    }
}
