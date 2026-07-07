import type { CustomerStatus } from './master-status';

/**
 * Customer master domain model — the business/view shape of a customer,
 * mapped from the Rayfin `Customer` entity by the infrastructure repository.
 * This type has no persistence decorators and no SDK dependency.
 */
export interface Customer {
  id: string;
  code: string;
  name: string;
  nameKana?: string;
  customerType: CustomerType;
  industry?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  addressLine?: string;
  country: string;
  website?: string;
  taxId?: string;
  annualRevenue?: number;
  status: CustomerStatus;
  steward?: string;
  notes?: string;
  /** Parent customer id for org-group / head-office ↔ branch hierarchies (#7). */
  parentId?: string;
  /** Nature of the link to the parent record. */
  relationType?: CustomerRelationType;
  /** When status is 'merged', the winner (surviving) customer id. */
  mergedInto?: string;
  /** When status is 'merged', when the merge happened. */
  mergedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export type CustomerType = 'corporate' | 'individual';

export const CUSTOMER_TYPE_VALUES: CustomerType[] = ['corporate', 'individual'];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  corporate: '法人',
  individual: '個人',
};

export function customerTypeLabel(type: CustomerType): string {
  return CUSTOMER_TYPE_LABELS[type];
}

/**
 * How a customer relates to its parent in an org hierarchy (Issue #7). A loose
 * descriptor for the link — the tree structure itself lives in `parentId`.
 */
export type CustomerRelationType =
  | 'headquarters'
  | 'subsidiary'
  | 'branch'
  | 'group';

export const CUSTOMER_RELATION_TYPE_VALUES: CustomerRelationType[] = [
  'headquarters',
  'subsidiary',
  'branch',
  'group',
];

export const CUSTOMER_RELATION_TYPE_LABELS: Record<
  CustomerRelationType,
  string
> = {
  headquarters: '本社・親会社',
  subsidiary: '子会社',
  branch: '支店・拠点',
  group: 'グループ会社',
};

export function customerRelationTypeLabel(type: CustomerRelationType): string {
  return CUSTOMER_RELATION_TYPE_LABELS[type];
}

/** Editable fields captured by the create/edit form (audit set by the repo). */
export interface CustomerInput {
  code: string;
  name: string;
  nameKana?: string;
  customerType: CustomerType;
  industry?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  addressLine?: string;
  country: string;
  website?: string;
  taxId?: string;
  annualRevenue?: number;
  status: CustomerStatus;
  steward?: string;
  notes?: string;
  /** Parent customer id for org hierarchies (#7); undefined = root. */
  parentId?: string;
  /** Nature of the link to the parent record. */
  relationType?: CustomerRelationType;
}

/** Map an existing customer to the editable form input shape. */
export function customerToInput(c: Customer): CustomerInput {
  return {
    code: c.code,
    name: c.name,
    nameKana: c.nameKana,
    customerType: c.customerType,
    industry: c.industry,
    email: c.email,
    phone: c.phone,
    postalCode: c.postalCode,
    prefecture: c.prefecture,
    city: c.city,
    addressLine: c.addressLine,
    country: c.country,
    website: c.website,
    taxId: c.taxId,
    annualRevenue: c.annualRevenue,
    status: c.status,
    steward: c.steward,
    notes: c.notes,
    parentId: c.parentId,
    relationType: c.relationType,
  };
}

/** A blank customer form input with sensible defaults. */
export function emptyCustomerInput(): CustomerInput {
  return {
    code: '',
    name: '',
    customerType: 'corporate',
    country: 'Japan',
    status: 'draft',
  };
}

/** Concise display name for tables, duplicate panels, and audit trails. */
export function customerDisplayName(c: Pick<Customer, 'name' | 'code'>): string {
  return `${c.name}（${c.code}）`;
}

/** Full single-line address for the 360° detail view. */
export function customerAddress(
  c: Pick<
    Customer,
    'postalCode' | 'prefecture' | 'city' | 'addressLine' | 'country'
  >
): string {
  const parts = [
    c.postalCode ? `〒${c.postalCode}` : '',
    c.prefecture ?? '',
    c.city ?? '',
    c.addressLine ?? '',
  ].filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts.join(' ') : c.country;
}
