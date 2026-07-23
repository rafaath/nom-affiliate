export const APPLICATION_TERMS_VERSION = '2026-07-23-v1' as const;
export const APPLICATION_TERMS_EFFECTIVE_DATE = '23 July 2026';

export const applicationTerms = [
  {
    title: 'Application only',
    body:
      'Submitting this form asks Nom to review you for its partner program. It does not approve you, appoint you as a partner, or allow you to submit restaurant leads. Nom may approve, decline, defer, or request more information.',
  },
  {
    title: 'Your information',
    body:
      'You confirm that the application is accurate and that links or documents you provide are yours to share. You will tell Nom if important application information changes.',
  },
  {
    title: 'Capacity and authority',
    body:
      'You confirm that you are at least 18 years old, legally competent to make this application, and, if applying for an organisation, authorised to apply on its behalf.',
  },
  {
    title: 'Account and review',
    body:
      'You must control the email address used for the application and keep your account secure. Nom may use the application to assess fit, prevent fraud and duplicate applications, and administer its review.',
  },
  {
    title: 'Privacy and application contact',
    body:
      'Nom handles application information as described in the Partner Program Privacy Notice. Nom may contact you by email, phone, or WhatsApp about your application, account, and approval process. This is not consent to unrelated promotional marketing.',
  },
  {
    title: 'Agreement after approval',
    body:
      'If Nom approves you, you must separately accept the current Referral Partner Agreement before submitting leads or earning commissions. Approval does not create employment, agency, franchise, or authority to bind Nom.',
  },
] as const;
