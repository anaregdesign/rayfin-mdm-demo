import { describe, expect, it } from 'vitest';

import type { CustomerInput } from '@/domain/models/customer';
import type { Clock } from '@/domain/ports/clock';

import { InMemoryCustomerRepository } from '../in-memory-customer-repository';

function advancingClock(
  start = new Date('2026-01-01T00:00:00.000Z'),
  stepMs = 1000
): Clock {
  let t = start.getTime();
  return {
    now: () => {
      const d = new Date(t);
      t += stepMs;
      return d;
    },
  };
}

function makeInput(over: Partial<CustomerInput> = {}): CustomerInput {
  return {
    code: 'C-1',
    name: 'テスト商事',
    customerType: 'corporate',
    country: 'Japan',
    status: 'draft',
    ...over,
  };
}

const actor = () => 'demo@contoso.com';

describe('InMemoryCustomerRepository', () => {
  it('create stamps id + audit fields and stores the row', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const created = await repo.create(makeInput({ name: '新規' }));

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('新規');
    expect(created.createdBy).toBe('demo@contoso.com');
    expect(created.updatedBy).toBe('demo@contoso.com');
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt.getTime()).toBe(created.createdAt.getTime());

    const found = await repo.findById(created.id);
    expect(found?.id).toBe(created.id);
  });

  it('seeds from the provided rows and clones them (no shared refs)', async () => {
    const clock = advancingClock();
    const seedRow = {
      ...makeInput({ code: 'S-1', name: 'シード' }),
      id: 'seed-1',
      createdAt: clock.now(),
      updatedAt: clock.now(),
      createdBy: 'seed',
      updatedBy: 'seed',
    };
    const seed = [seedRow];
    const repo = new InMemoryCustomerRepository(clock, actor, seed);

    // Mutating the original seed array/object must not affect the repo.
    seedRow.name = 'MUTATED';
    const found = await repo.findById('seed-1');
    expect(found?.name).toBe('シード');
  });

  it('list is ordered by updatedAt descending', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const first = await repo.create(makeInput({ code: 'A', name: '先' }));
    const second = await repo.create(makeInput({ code: 'B', name: '後' }));

    const list = await repo.list();
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it('returns cloned rows so callers cannot mutate stored state', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const created = await repo.create(makeInput({ name: 'オリジナル' }));

    const fetched = await repo.findById(created.id);
    fetched!.name = 'HACKED';

    const again = await repo.findById(created.id);
    expect(again?.name).toBe('オリジナル');
  });

  it('update applies input, bumps audit, preserves created fields', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const created = await repo.create(makeInput({ name: '旧', steward: '田中' }));

    const updated = await repo.update(
      created.id,
      makeInput({ name: '新', steward: '佐藤' })
    );

    expect(updated.name).toBe('新');
    expect(updated.steward).toBe('佐藤');
    expect(updated.createdAt.getTime()).toBe(created.createdAt.getTime());
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      created.updatedAt.getTime()
    );
  });

  it('setStatus changes only status + audit', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const created = await repo.create(makeInput({ status: 'draft' }));

    const activated = await repo.setStatus(created.id, 'active');
    expect(activated.status).toBe('active');
    expect(activated.updatedAt.getTime()).toBeGreaterThan(
      created.updatedAt.getTime()
    );
  });

  it('remove deletes the row', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const created = await repo.create(makeInput());
    await repo.remove(created.id);
    expect(await repo.findById(created.id)).toBeNull();
  });

  it('markMerged sets merged status + xref; restoreMerged reverses it', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    const winner = await repo.create(makeInput({ code: 'W', name: '勝' }));
    const loser = await repo.create(makeInput({ code: 'L', name: '負' }));

    await repo.markMerged(loser.id, winner.id);
    const merged = await repo.findById(loser.id);
    expect(merged?.status).toBe('merged');
    expect(merged?.mergedInto).toBe(winner.id);
    expect(merged?.mergedAt).toBeInstanceOf(Date);

    await repo.restoreMerged(loser.id, 'active');
    const restored = await repo.findById(loser.id);
    expect(restored?.status).toBe('active');
    expect(restored?.mergedInto).toBeUndefined();
    expect(restored?.mergedAt).toBeUndefined();
  });

  it('update throws for an unknown id', async () => {
    const repo = new InMemoryCustomerRepository(advancingClock(), actor);
    await expect(repo.update('nope', makeInput())).rejects.toThrow(/not found/);
  });
});
