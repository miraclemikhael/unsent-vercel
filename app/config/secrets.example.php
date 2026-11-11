<?php
/* Unsent · copy this file to  config/secrets.php  and fill in the values. secrets.php is git-ignored.
   Full step-by-step guide: see SETUP-EMAIL.md in the project root. */
return [
    /* Continue with Google. Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application).
       Authorized JavaScript origins must contain the exact address you open the site on, e.g. http://localhost  (and http://unsent.test if you use that). */
    'GOOGLE_CLIENT_ID' => '',

    /* Emails (password reset code + "Email this letter"). A Gmail address and its 16-letter App Password. */
    'GMAIL_USER' => '',
    'GMAIL_APP_PASSWORD' => '',

    /* optional: calls on mobile data */
    'TURN_URL' => '',
    'TURN_USER' => '',
    'TURN_PASS' => '',
];
