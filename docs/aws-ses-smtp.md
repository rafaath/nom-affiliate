# Amazon SES SMTP for Nom Affiliate

Nom Affiliate uses Supabase Auth to send signup confirmation and account emails. The production integration therefore uses the Amazon SES SMTP interface rather than calling the SES API from the Next.js application.

## Architecture

- `ses-shared-domain.yaml` owns the reusable `nom.enterprises` SES identity in `ap-south-1`.
- `ses-supabase-smtp.yaml` owns an app-specific IAM user for Nom Affiliate.
- The app-specific policy permits only `ses:SendRawEmail`, only through the shared domain identity, and only when the From address is `hello@nom.enterprises`.
- Each additional app should receive its own IAM principal and sender policy. Do not share SMTP credentials between apps.
- The SMTP password is Region-specific and is not stored in this repository or in Vercel.

## CloudFormation stacks

Deploy the templates in this order:

1. `nom-ses-shared` from `infra/aws/ses-shared-domain.yaml`
2. `nom-affiliate-smtp` from `infra/aws/ses-supabase-smtp.yaml`

The shared identity has retain policies so deleting the stack cannot silently disable every application's email.

## Namecheap DNS

Use the shared stack outputs to add:

- Three DKIM CNAME records.
- One MX record for host `mail` with priority `10` and value `feedback-smtp.ap-south-1.amazonses.com`.
- One TXT record for host `mail` with value `v=spf1 include:amazonses.com -all`.
- One monitoring-only DMARC TXT record for host `_dmarc` with value `v=DMARC1; p=none;`.

Keep the existing Google Workspace MX record for `nom.enterprises`. The SES MX record belongs only on the `mail.nom.enterprises` subdomain.

## Supabase Auth settings

Configure custom SMTP on Supabase project `wuryzsyfytlbrysfnwtj`:

- Sender email: `hello@nom.enterprises`
- Sender name: `Nom Partner Program`
- Host: `email-smtp.ap-south-1.amazonaws.com`
- Port: `587`
- Username: the SES SMTP username derived from the app IAM access key ID
- Password: the Region-specific SES SMTP password derived for `ap-south-1`

Also configure:

- Site URL: `https://affiliate.nom.enterprises`
- Redirect URL: `https://affiliate.nom.enterprises/auth/callback`
- Vercel production environment: `NEXT_PUBLIC_APP_URL=https://affiliate.nom.enterprises`

## Credential rotation

Create a second access key for the CloudFormation-managed SMTP user, derive its SES SMTP password for `ap-south-1`, update Supabase, verify delivery, and then delete the old access key. Never commit either credential or add it to Vercel.
