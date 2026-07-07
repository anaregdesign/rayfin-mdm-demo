import { useNavigate, useParams } from 'react-router-dom';

import { CustomerForm } from '@/components/customer/CustomerForm';
import { Button } from '@/components/shared/Button';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCustomerForm } from '@/usecase/customers/use-customer-form';

/** Create/edit customer screen. `id` param switches the form into edit mode. */
export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vm = useCustomerForm(id);

  if (vm.loading) return <LoadingState />;

  if (vm.notFound) {
    return (
      <div className="space-y-4">
        <ErrorState message="編集対象の顧客が見つかりません。" />
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          一覧へ戻る
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const saved = await vm.submit();
    if (saved) navigate(`/customers/${saved.id}`);
  };

  const cancel = () => {
    if (id) navigate(`/customers/${id}`);
    else navigate('/customers');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={vm.isEdit ? '顧客情報の編集' : '顧客の新規登録'}
        description="必須項目を入力してください。重複候補は自動で検出されます。"
      />
      <CustomerForm
        draft={vm.draft}
        errors={vm.errors}
        duplicateMatches={vm.duplicateMatches}
        saving={vm.saving}
        submitError={vm.submitError}
        isEdit={vm.isEdit}
        onField={vm.setField}
        onSubmit={handleSubmit}
        onCancel={cancel}
      />
    </div>
  );
}
