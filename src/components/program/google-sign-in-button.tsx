import { signInWithGoogleAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/program/submit-button";

export function GoogleSignInButton({
  returnTo,
  label = "Continue with Google",
}: {
  returnTo: string;
  label?: string;
}) {
  return (
    <form action={signInWithGoogleAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton className="w-full" variant="outline" pendingLabel="Opening Google…">
        <span aria-hidden="true" className="font-display text-base">
          G
        </span>
        {label}
      </SubmitButton>
    </form>
  );
}
