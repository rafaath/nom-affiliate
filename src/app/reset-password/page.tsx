import { redirect } from 'next/navigation';

export default function ResetPasswordPage() {
  redirect('/login?notice=google-only');
}
