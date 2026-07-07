import type { MergeEntityType, MergeRecord } from '@/domain/models/merge';
import type { Clock } from '@/domain/ports/clock';
import type {
  AppendMergeRecord,
  MergeRecordRepository,
} from '@/domain/repositories/merge-record-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { toMergeRecord } from './merge-record-mapper';

/** All MergeRecord columns. Reads MUST select fields explicitly. */
const MERGE_RECORD_FIELDS = [
  'id',
  'entityType',
  'winnerId',
  'loserIds',
  'fieldSources',
  'winnerBefore',
  'loserStatuses',
  'performedBy',
  'performedAt',
  'undoneAt',
] as const;

/** Rayfin-backed merge-history repository (reversible survivorship records). */
export class RayfinMergeRecordRepository implements MergeRecordRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  private actor(): string | undefined {
    const { user } = this.client.getSession();
    return user?.email ?? user?.id ?? undefined;
  }

  async append(record: AppendMergeRecord): Promise<MergeRecord> {
    const row = await this.client.data.MergeRecord.create({
      entityType: record.entityType,
      winnerId: record.winnerId,
      loserIds: JSON.stringify(record.loserIds),
      fieldSources: JSON.stringify(record.fieldSources),
      winnerBefore: JSON.stringify(record.winnerBefore),
      loserStatuses: JSON.stringify(record.loserStatuses),
      performedBy: this.actor(),
      performedAt: this.clock.now(),
    });
    return toMergeRecord(row);
  }

  async listByType(entityType: MergeEntityType): Promise<MergeRecord[]> {
    const rows = await this.client.data.MergeRecord.select(MERGE_RECORD_FIELDS)
      .where({ entityType: { eq: entityType } })
      .orderBy({ performedAt: 'desc' })
      .execute();
    return rows.map(toMergeRecord);
  }

  async get(id: string): Promise<MergeRecord | null> {
    const rows = await this.client.data.MergeRecord.select(MERGE_RECORD_FIELDS)
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    return row ? toMergeRecord(row) : null;
  }

  async markUndone(id: string): Promise<void> {
    await this.client.data.MergeRecord.update(
      { id },
      { undoneAt: this.clock.now() }
    );
  }
}
