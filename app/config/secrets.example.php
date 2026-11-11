<?php
/* Unsent · copy this file to  config/secrets.php  and fill in the values. secrets.php is git-ignored.
   Full step-by-step guide: see SETUP-EMAIL.md in the project root. */
return [
    /* Continue with Google. Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application).
       Authorized JavaScript origins must contain the exact address you open the site on, e.g. http://localhost  (and http://unsent.test if you use that). */
    'GOOGLE_CLIENT_ID' => '',

    /* Emails (password reset code + "Email this letter"). A Gmail address and its 16-letter App Password.
       How to get an App Password:
       1. Go to https://myaccount.google.com → Security.
       2. Enable "2-Step Verification" if it's off.
       3. Click "App passwords" → "Select app: Mail" → "Select device: Other (Custom name)" → generate.
       4. Copy the 16-character code (e.g., abcdefghijklmnop).
       The code is stored only in .env and config/secrets.php, never in the repo. */
    'GMAIL_USER' => '',
    'GMAIL_APP_PASSWORD' => '',

    /* optional: calls on mobile data */
    /* TURN server configuration (for WebRTC calls to work on mobile data).
       Free options: metered.ca free tier, or self-host with coturn.
       Example values for metered.ca free tier:
         TURN_URL=tcp:turn.metered.ca:443
         TURN_USER=your-account
         TURN_PASS=your-password
       These are stored only in .env or config/secrets.php. */
];
