<?php

namespace App\Enums;

enum SocialPlatform: string
{
    use Values;

    case WHATSAPP = 'whatsapp';
    case FACEBOOK = 'facebook';
    case TIKTOK = 'tiktok';
    case INSTAGRAM = 'instagram';
    case TWITTER = 'twitter';
    case TELEGRAM = 'telegram';
    case MESSENGER = 'messenger';
}
