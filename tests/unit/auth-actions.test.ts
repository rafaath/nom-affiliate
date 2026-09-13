import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import {
  requestPasswordResetAction,
  signInAction,
  signInWithGoogleAction,
  updatePasswordAction,
} from "@/app/actions/auth";

function redirectError(path: string) {
  return new Error(`REDIRECT:${path}`);
}

describe("Google-only auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://affiliate.nom.enterprises";
    mocks.redirect.mockImplementation((path: string) => {
      throw redirectError(path);
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: mocks.getUser,
        resetPasswordForEmail: mocks.resetPasswordForEmail,
        signInWithOAuth: mocks.signInWithOAuth,
        updateUser: mocks.updateUser,
      },
    });
    mocks.signInWithOAuth.mockResolvedValue({
      data: {
        url: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
      },
      error: null,
    });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  it("rejects legacy password login while preserving a safe destination", async () => {
    const form = new FormData();
    form.set("email", "partner@example.com");
    form.set("password", "old-password");
    form.set("returnTo", "/apply");
    await expect(signInAction(form)).rejects.toThrow("REDIRECT:/login?notice=google-only&returnTo=%2Fapply");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("does not send password reset emails or update shared passwords", async () => {
    await expect(requestPasswordResetAction()).rejects.toThrow("REDIRECT:/login?notice=google-only");
    await expect(updatePasswordAction()).rejects.toThrow("REDIRECT:/login?notice=google-only");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("starts Google OAuth with a safe return path through the affiliate callback", async () => {
    const formData = new FormData();
    formData.set("returnTo", "/apply");

    await expect(signInWithGoogleAction(formData)).rejects.toThrow(
      "REDIRECT:https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
    );
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://affiliate.nom.enterprises/auth/callback?next=%2Fapply",
        skipBrowserRedirect: true,
      },
    });
  });

  it("does not allow Google OAuth to return to an external origin", async () => {
    const formData = new FormData();
    formData.set("returnTo", "https://attacker.example/steal-session");

    await expect(signInWithGoogleAction(formData)).rejects.toThrow(
      "REDIRECT:https://accounts.google.com/o/oauth2/v2/auth?state=opaque",
    );
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://affiliate.nom.enterprises/auth/callback?next=%2Fpartner",
        skipBrowserRedirect: true,
      },
    });
  });

});
