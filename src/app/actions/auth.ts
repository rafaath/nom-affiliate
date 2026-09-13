"use server";

import { redirect } from "next/navigation";
import { getSafeAuthRedirectPath } from "@/lib/supabase/auth-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getAuthCallbackUrl(next: string) {
  const applicationUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3021",
  );
  const callbackUrl = new URL("/auth/callback", applicationUrl);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

export async function signInWithGoogleAction(formData: FormData) {
  const returnTo = getSafeAuthRedirectPath(
    String(formData.get("returnTo") || "/partner"),
  );
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(returnTo),
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    const message =
      error?.message ||
      "Google sign-in could not be started. Please try again.";
    redirect(`/login?error=${encodeURIComponent(message)}` as never);
  }

  redirect(data.url);
}

// Keep stale forms safe without issuing emails or changing shared credentials.
export async function signInAction(formData: FormData) {
  const returnTo = getSafeAuthRedirectPath(String(formData.get("returnTo") || "/partner"));
  redirect(`/login?notice=google-only&returnTo=${encodeURIComponent(returnTo)}`);
}

export async function requestPasswordResetAction() {
  redirect("/login?notice=google-only");
}

export async function updatePasswordAction() {
  redirect("/login?notice=google-only");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
