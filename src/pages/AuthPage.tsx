import { SignInCard } from '@/components/auth/SignInCard';
import { useAuth } from '@/usecase/auth/use-auth';

/** Unauthenticated landing screen. Renders the sign-in card centered. */
export function AuthPage() {
  const { loading, error, fabricAuthEnabled, signIn } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <SignInCard
        loading={loading}
        error={error}
        fabricAuthEnabled={fabricAuthEnabled}
        onSignIn={() => {
          void signIn().catch(() => {
            /* error surfaced via context state */
          });
        }}
      />
    </div>
  );
}
