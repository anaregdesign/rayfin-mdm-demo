import { useNavigate, useParams } from 'react-router-dom';

import { ProductForm } from '@/components/product/ProductForm';
import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useProductForm } from '@/usecase/products/use-product-form';

/** Create/edit product screen. `id` param switches the form into edit mode. */
export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vm = useProductForm(id);

  if (vm.loading) return <LoadingState />;

  if (vm.notFound) {
    return (
      <div className="space-y-4">
        <ErrorState message="編集対象の製品が見つかりません。" />
        <Button variant="secondary" onClick={() => navigate('/products')}>
          一覧へ戻る
        </Button>
      </div>
    );
  }

  if (!vm.permitted) {
    return (
      <div className="space-y-4">
        <ErrorState
          message={
            vm.isEdit
              ? 'この製品を編集する権限がありません。担当のデータスチュワード、または管理者に連絡してください。'
              : '製品を新規登録する権限がありません。管理者に連絡してください。'
          }
        />
        <Button
          variant="secondary"
          onClick={() => navigate(id ? `/products/${id}` : '/products')}
        >
          {id ? '詳細へ戻る' : '一覧へ戻る'}
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const result = await vm.submit();
    if (result.status === 'saved') navigate(`/products/${result.record.id}`);
    else if (result.status === 'requested')
      navigate('/approvals', {
        state: { notice: '承認申請を作成しました。管理者の承認をお待ちください。' },
      });
  };

  const cancel = () => {
    if (id) navigate(`/products/${id}`);
    else navigate('/products');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={vm.isEdit ? '製品情報の編集' : '製品の新規登録'}
        description="必須項目を入力してください。重複候補は自動で検出されます。"
      />
      <ProductForm
        draft={vm.draft}
        errors={vm.errors}
        duplicateMatches={vm.duplicateMatches}
        categoryOptions={vm.categoryOptions}
        saving={vm.saving}
        submitError={vm.submitError}
        isEdit={vm.isEdit}
        approvalRequired={vm.approvalRequired}
        onField={vm.setField}
        onSubmit={handleSubmit}
        onCancel={cancel}
      />
    </div>
  );
}
