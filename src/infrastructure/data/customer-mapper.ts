import type { Customer, CustomerInput } from '@/domain/models/customer';

import type { Customer as CustomerEntity } from '../../../rayfin/data/Customer';

/** Rayfin row shape for the Customer entity. */
export type CustomerRow = CustomerEntity;

/** Trim a string; return undefined when empty (so optional fields stay null). */
function blankToUndef(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Map a Rayfin row to the domain model, converting transport shapes. */
export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nameKana: row.nameKana ?? undefined,
    customerType: row.customerType,
    industry: row.industry ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    postalCode: row.postalCode ?? undefined,
    prefecture: row.prefecture ?? undefined,
    city: row.city ?? undefined,
    addressLine: row.addressLine ?? undefined,
    country: row.country,
    website: row.website ?? undefined,
    taxId: row.taxId ?? undefined,
    annualRevenue: row.annualRevenue ?? undefined,
    status: row.status,
    steward: row.steward ?? undefined,
    notes: row.notes ?? undefined,
    mergedInto: row.mergedInto ?? undefined,
    mergedAt: row.mergedAt ? new Date(row.mergedAt) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

/** Editable entity fields derived from form input (audit added by the repo). */
export interface CustomerFields {
  code: string;
  name: string;
  nameKana?: string;
  customerType: CustomerInput['customerType'];
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
  status: CustomerInput['status'];
  steward?: string;
  notes?: string;
}

/** Normalize form input into the entity field subset (empty → undefined). */
export function customerInputToFields(input: CustomerInput): CustomerFields {
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    nameKana: blankToUndef(input.nameKana),
    customerType: input.customerType,
    industry: blankToUndef(input.industry),
    email: blankToUndef(input.email),
    phone: blankToUndef(input.phone),
    postalCode: blankToUndef(input.postalCode),
    prefecture: blankToUndef(input.prefecture),
    city: blankToUndef(input.city),
    addressLine: blankToUndef(input.addressLine),
    country: input.country.trim() || 'Japan',
    website: blankToUndef(input.website),
    taxId: blankToUndef(input.taxId),
    annualRevenue: input.annualRevenue,
    status: input.status,
    steward: blankToUndef(input.steward),
    notes: blankToUndef(input.notes),
  };
}
