import { GuideContent } from '@/components/guide/GuideContent';
import { PageHeader } from '@/components/shared/PageHeader';

/** Static help screen explaining MDM concepts and how to use this app. */
export function GuidePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="MDMガイド"
        description="マスタデータ管理の概念と、このアプリの使い方"
      />
      <GuideContent />
    </div>
  );
}
