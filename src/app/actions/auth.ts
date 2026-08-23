"use server";

import { redirect } from "next/navigation";
import {
  getSafeAuthRedirectPath,
  validatePasswordReset,
} from "@/lib/supabase/auth-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function authErrorRedirect(
  path: "/forgot-password" | "/reset-password",
  message: string,
): never {
  redirect(`${path}?error=${encodeURIComponent(message)}` as never);
}

function getAuthCallbackUrl(next: string) {
  const applicationUrl = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3021",
  );
  const callbackUrl = new URL("/auth/callback", applicationUrl);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}

function getPasswordRecoveryCallbackUrl() {
  return getAuthCallbackUrl("/reset-password");
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

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const returnTo = String(formData.get("returnTo") || "/partner");

  if (!email || !password) {
    redirect("/login?error=missing-credentials");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(getSafeAuthRedirectPath(returnTo) as never);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    authErrorRedirect(
      "/forgot-password",
      "Enter the email address for your account.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryCallbackUrl(),
  });

  if (error) {
    authErrorRedirect("/forgot-password", error.message);
  }

  redirect("/forgot-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("passwordConfirmation") || "");
  const validationMessage = validatePasswordReset(password, confirmation);

  if (validationMessage) {
    authErrorRedirect("/reset-password", validationMessage);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    authErrorRedirect(
      "/forgot-password",
      "This password-reset link is invalid or expired. Request a new one.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    authErrorRedirect("/reset-password", error.message);
  }

  redirect("/apply?notice=password-updated");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
