import { describe, expect, it } from 'vitest';

import type { CategoryInput } from '@/domain/models/category';
import {
  categoryInputToFields,
  toCategory,
  type CategoryRow,
} from '@/infrastructure/data/category-mapper';

/**
 * Round-trip / robustness coverage for the ProductCategory infra mapper. The
 * category master is the reference hierarchy products attach to (Issue #7), so
 * its optional `parentId`/`description` columns must survive the row↔domain
 * boundary and normalize blank/null values consistently.
 */

const createdAt = new Date('2024-03-01T00:00:00.000Z');
const updatedAt = new Date('2024-03-02T00:00:00.000Z');

function row(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    code: 'CAT-ELEC',
    name: '電子機器',
    parentId: 'cat-root',
    description: '家電・デバイス',
    createdAt,
    updatedAt,
    createdBy: 'steward@example.com',
    updatedBy: 'admin@example.com',
    ...overrides,
  } as CategoryRow;
}

describe('toCategory', () => {
  it('maps a full row into the domain category shape', () => {
    expect(toCategory(row())).toEqual({
      id: 'cat-1',
      code: 'CAT-ELEC',
      name: '電子機器',
      parentId: 'cat-root',
      description: '家電・デバイス',
      createdAt,
      updatedAt,
      createdBy: 'steward@example.com',
      updatedBy: 'admin@example.com',
    });
  });

  it('converts null optional columns to undefined (top-level node)', () => {
    const mapped = toCategory(
      row({
        parentId: null as unknown as string,
        description: null as unknown as string,
        createdBy: null as unknown as string,
        updatedBy: null as unknown as string,
      }),
    );
    expect(mapped.parentId).toBeUndefined();
    expect(mapped.description).toBeUndefined();
    expect(mapped.createdBy).toBeUndefined();
    expect(mapped.updatedBy).toBeUndefined();
  });

  it('coerces date columns to Date instances', () => {
    const mapped = toCategory(
      row({
        createdAt: '2024-03-01T00:00:00.000Z' as unknown as Date,
        updatedAt: '2024-03-02T00:00:00.000Z' as unknown as Date,
      }),
    );
    expect(mapped.createdAt).toBeInstanceOf(Date);
    expect(mapped.createdAt.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });
});

describe('categoryInputToFields', () => {
  it('trims code/name and drops blank optional fields to undefined', () => {
    const input: CategoryInput = {
      code: '  CAT-APP  ',
      name: '  アパレル  ',
      parentId: '   ',
      description: '',
    };
    expect(categoryInputToFields(input)).toEqual({
      code: 'CAT-APP',
      name: 'アパレル',
      parentId: undefined,
      description: undefined,
    });
  });

  it('preserves a real parentId (trimmed) for a child node', () => {
    const fields = categoryInputToFields({
      code: 'CAT-TV',
      name: 'テレビ',
      parentId: ' cat-elec ',
      description: undefined,
    });
    expect(fields.parentId).toBe('cat-elec');
  });
});

describe('input → fields → row → domain round-trip', () => {
  it('preserves the editable fields through the persistence boundary', () => {
    const input: CategoryInput = {
      code: 'CAT-TV',
      name: 'テレビ',
      parentId: 'cat-elec',
      description: '薄型テレビ',
    };
    const fields = categoryInputToFields(input);
    const persisted = row({
      id: 'cat-9',
      code: fields.code,
      name: fields.name,
      parentId: fields.parentId,
      description: fields.description,
    });
    const back = toCategory(persisted);
    expect(back.code).toBe(input.code);
    expect(back.name).toBe(input.name);
    expect(back.parentId).toBe(input.parentId);
    expect(back.description).toBe(input.description);
  });
});
