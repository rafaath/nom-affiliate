# Supabase confirmation email

The branded signup-confirmation source is:

- Subject: `supabase/templates/confirmation.subject.txt`
- HTML: `supabase/templates/confirmation.html`

For a hosted Supabase project, open **Authentication → Email Templates → Confirm signup**, copy the subject and HTML, preview the message, and save it. Keep `{{ .ConfirmationURL }}` unchanged.

Use a production custom SMTP provider before public launch. Supabase's built-in sender is intended for testing and has delivery and rate limitations.

The template is intentionally short and transactional. It contains one confirmation link, no marketing copy, and no user-supplied values.
