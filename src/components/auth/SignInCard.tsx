import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';

interface SignInCardProps {
  loading: boolean;
  error: string | null;
  fabricAuthEnabled: boolean;
  onSignIn: () => void;
}

/** Sign-in panel. Shows the Fabric vs local-dev mode and any auth error. */
export function SignInCard({
  loading,
  error,
  fabricAuthEnabled,
  onSignIn,
}: SignInCardProps) {
  return (
    <div className="mx-auto mt-24 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-center text-lg font-semibold text-slate-900">
        マスタデータ管理
      </h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        MDM PoC — 製品マスタ・顧客マスタ
      </p>

      <div className="mt-6 space-y-4">
        {error && <ErrorState message={error} />}
        <Button
          onClick={onSignIn}
          disabled={loading}
          className="w-full"
        >
          {loading
            ? 'サインイン中…'
            : fabricAuthEnabled
              ? 'Microsoft Fabric でサインイン'
              : 'ローカル開発モードでサインイン'}
        </Button>
        <p className="text-center text-xs text-slate-400">
          {fabricAuthEnabled
            ? 'Fabric ワークスペースの認証を使用します'
            : 'ローカルのモック認証を使用します'}
        </p>
      </div>
    </div>
  );
}
