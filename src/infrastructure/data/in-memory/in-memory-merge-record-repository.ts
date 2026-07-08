import type { MergeEntityType, MergeRecord } from '@/domain/models/merge';
import type { Clock } from '@/domain/ports/clock';
import type {
  AppendMergeRecord,
  MergeRecordRepository,
} from '@/domain/repositories/merge-record-repository';

import { clone } from './clone';

/**
 * In-memory reversible merge-history repository for demo mode. Mirrors the
 * Rayfin adapter: `append` assigns an id, stamps `performedBy` from the actor
 * closure and `performedAt` from the clock; `markUndone` records `undoneAt`.
 */
export class InMemoryMergeRecordRepository implements MergeRecordRepository {
  private readonly rows: MergeRecord[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly actor: () => string | undefined
  ) {}

  async append(record: AppendMergeRecord): Promise<MergeRecord> {
    const row: MergeRecord = {
      id: crypto.randomUUID(),
      entityType: record.entityType,
      winnerId: record.winnerId,
      loserIds: record.loserIds,
      fieldSources: record.fieldSources,
      winnerBefore: record.winnerBefore,
      loserStatuses: record.loserStatuses,
      performedBy: this.actor(),
      performedAt: this.clock.now(),
    };
    this.rows.push(clone(row));
    return clone(row);
  }

  async listByType(entityType: MergeEntityType): Promise<MergeRecord[]> {
    return this.rows
      .filter((r) => r.entityType === entityType)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .map(clone);
  }

  async get(id: string): Promise<MergeRecord | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async markUndone(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.undoneAt = this.clock.now();
  }
}
