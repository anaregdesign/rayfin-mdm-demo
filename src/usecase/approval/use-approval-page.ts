import { useCallback, useMemo, useState } from 'react';

import type { StatusTone } from '@/domain/models/master-status';
import type { FieldChange } from '@/domain/models/change-log';
import type {
  ChangeRequest,
  ChangeRequestEntityType,
} from '@/domain/models/change-request';
import {
  changeRequestOperationLabel,
  changeRequestStatusLabel,
  changeRequestStatusTone,
  CHANGE_REQUEST_ENTITY_LABELS,
} from '@/domain/models/change-request';
import type { CustomerInput } from '@/domain/models/customer';
import { customerToInput } from '@/domain/models/customer';
import type { ProductInput } from '@/domain/models/product';
import { productToInput } from '@/domain/models/product';
import { canApprove, reviewBlockReason } from '@/domain/policies/approval-policy';
import { diffRecords } from '@/domain/policies/diff-policy';
import { useAuth } from '@/usecase/auth/use-auth';
import { useCustomers } from '@/usecase/customers/use-customers';
import { useProducts } from '@/usecase/products/use-products';
import { formatDateTime } from '@/lib/format';

import { useChangeRequests } from './use-change-requests';

/** One row in the approval queue, pre-computed for render-only components. */
export interface ApprovalItem {
  request: ChangeRequest;
  entityLabel: string;
  operationLabel: string;
  statusLabel: string;
  statusTone: StatusTone;
  /** Field-level preview of the proposed change (current → proposed). */
  changes: FieldChange[];
  requestedAtLabel: string;
  reviewedAtLabel: string | null;
  /** True when the current actor may act on this request. */
  canReview: boolean;
  /** Why review is blocked, or null when allowed. */
  blockReason: string | null;
}

export interface ApprovalPageViewModel {
  items: ApprovalItem[];
  pendingCount: number;
  loading: boolean;
  error: string | null;
  reviewError: string | null;
  reviewingId: string | null;
  /** True when the actor is a checker (admin). */
  isApprover: boolean;
  /** Self-approval guard toggle (page-local demo control). */
  enforceSegregation: boolean;
  setEnforceSegregation: (value: boolean) => void;
  review: (
    request: ChangeRequest,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => Promise<boolean>;
}

/**
 * Approval-queue page view-model (#8). Composes the customer/product stores to
 * (a) apply an approved payload to the correct master and (b) compute a diff
 * preview against the current record, then delegates the reviewed decision to
 * the store-agnostic `useChangeRequests` controller. All rules live in the
 * domain policy; this hook only orchestrates and shapes view data.
 */
export function useApprovalPage(): ApprovalPageViewModel {
  const { actor } = useAuth();
  const customers = useCustomers();
  const products = useProducts();
  const [enforceSegregation, setEnforceSegregation] = useState(false);

  const options = useMemo(() => ({ enforceSegregation }), [enforceSegregation]);

  // Apply an approved request's payload to the target master, reusing the
  // page's own stores so the list refreshes after the write.
  const apply = useCallback(
    async (request: ChangeRequest) => {
      const payload = request.payload;
      if (!payload) throw new Error('申請内容が空のため反映できません。');
      if (request.entityType === 'customer') {
        const input = payload as unknown as CustomerInput;
        if (request.operation === 'create') {
          await customers.createCustomer(input);
        } else if (request.operation === 'update' && request.entityId) {
          await customers.updateCustomer(request.entityId, input);
        } else {
          throw new Error('この操作は自動反映に対応していません。');
        }
      } else {
        const input = payload as unknown as ProductInput;
        if (request.operation === 'create') {
          await products.createProduct(input);
        } else if (request.operation === 'update' && request.entityId) {
          await products.updateProduct(request.entityId, input);
        } else {
          throw new Error('この操作は自動反映に対応していません。');
        }
      }
    },
    [customers, products]
  );

  const controller = useChangeRequests({ reviewer: actor, options, apply });

  const items = useMemo<ApprovalItem[]>(() => {
    return controller.requests.map((request) => {
      const blockReason = actor
        ? reviewBlockReason(request, actor, { enforceSegregation })
        : '承認するにはサインインが必要です。';
      return {
        request,
        entityLabel: CHANGE_REQUEST_ENTITY_LABELS[request.entityType],
        operationLabel: changeRequestOperationLabel(request.operation),
        statusLabel: changeRequestStatusLabel(request.status),
        statusTone: changeRequestStatusTone(request.status),
        changes: computeChanges(request, customers.customers, products.products),
        requestedAtLabel: formatDateTime(request.requestedAt),
        reviewedAtLabel: request.reviewedAt
          ? formatDateTime(request.reviewedAt)
          : null,
        canReview: blockReason === null,
        blockReason,
      };
    });
  }, [controller.requests, customers.customers, products.products, actor, enforceSegregation]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.request.status === 'pending').length,
    [items]
  );

  return {
    items,
    pendingCount,
    loading: controller.loading || customers.loading || products.loading,
    error: controller.error,
    reviewError: controller.reviewError,
    reviewingId: controller.reviewingId,
    isApprover: actor ? canApprove(actor) : false,
    enforceSegregation,
    setEnforceSegregation,
    review: controller.review,
  };
}

/** Compute the current → proposed diff for a request's payload preview. */
function computeChanges(
  request: ChangeRequest,
  customers: ReturnType<typeof useCustomers>['customers'],
  products: ReturnType<typeof useProducts>['products']
): FieldChange[] {
  const payload = request.payload;
  if (!payload) return [];
  const before = currentInput(request, customers, products);
  return diffRecords(before, payload);
}

/** The current record (as input) for an update, or `{}` for a create. */
function currentInput(
  request: ChangeRequest,
  customers: ReturnType<typeof useCustomers>['customers'],
  products: ReturnType<typeof useProducts>['products']
): object {
  if (request.operation !== 'update' || !request.entityId) return {};
  if (request.entityType === ('customer' satisfies ChangeRequestEntityType)) {
    const current = customers.find((c) => c.id === request.entityId);
    return current ? customerToInput(current) : {};
  }
  const current = products.find((p) => p.id === request.entityId);
  return current ? productToInput(current) : {};
}
