import { signInWithGoogleAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

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
      <Button className="w-full" type="submit" variant="outline">
        <span aria-hidden="true" className="font-display text-base">
          G
        </span>
        {label}
      </Button>
    </form>
  );
}
