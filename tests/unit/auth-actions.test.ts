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
  signInWithGoogleAction,
  updatePasswordAction,
} from "@/app/actions/auth";

function redirectError(path: string) {
  return new Error(`REDIRECT:${path}`);
}

describe("auth recovery actions", () => {
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

  it("sends recovery links back through the affiliate auth callback", async () => {
    const formData = new FormData();
    formData.set("email", "partner@example.com");

    await expect(requestPasswordResetAction(formData)).rejects.toThrow(
      "REDIRECT:/forgot-password?sent=1",
    );
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "partner@example.com",
      {
        redirectTo:
          "https://affiliate.nom.enterprises/auth/callback?next=%2Freset-password",
      },
    );
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

  it("does not call Supabase when the password confirmation is invalid", async () => {
    const formData = new FormData();
    formData.set("password", "new-password");
    formData.set("passwordConfirmation", "different-password");

    await expect(updatePasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/reset-password?error=The%20password%20confirmation%20does%20not%20match.",
    );
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("updates the authenticated recovery user and resumes application recovery", async () => {
    const formData = new FormData();
    formData.set("password", "new-password");
    formData.set("passwordConfirmation", "new-password");

    await expect(updatePasswordAction(formData)).rejects.toThrow(
      "REDIRECT:/apply?notice=password-updated",
    );
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
});
