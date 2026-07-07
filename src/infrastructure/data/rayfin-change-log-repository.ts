import type { ChangeEntityType, ChangeEntry } from '@/domain/models/change-log';
import type { Clock } from '@/domain/ports/clock';
import type {
  AppendChangeEntry,
  ChangeLogRepository,
} from '@/domain/repositories/change-log-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { serializeChangedFields, toChangeEntry } from './change-log-mapper';

/** All ChangeLog columns. Reads MUST select fields explicitly. */
const CHANGE_LOG_FIELDS = [
  'id',
  'entityType',
  'entityId',
  'action',
  'changedFields',
  'actorId',
  'summary',
  'occurredAt',
] as const;

/** Rayfin-backed append-only change-history repository. */
export class RayfinChangeLogRepository implements ChangeLogRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  async append(entry: AppendChangeEntry): Promise<void> {
    await this.client.data.ChangeLog.create({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changedFields: serializeChangedFields(entry.changes),
      actorId: entry.actorId,
      summary: entry.summary,
      occurredAt: this.clock.now(),
    });
  }

  async listByEntity(
    entityType: ChangeEntityType,
    entityId: string
  ): Promise<ChangeEntry[]> {
    const rows = await this.client.data.ChangeLog.select(CHANGE_LOG_FIELDS)
      .where({ entityType: { eq: entityType }, entityId: { eq: entityId } })
      .orderBy({ occurredAt: 'desc' })
      .execute();
    return rows.map(toChangeEntry);
  }

  async listByType(entityType: ChangeEntityType): Promise<ChangeEntry[]> {
    const rows = await this.client.data.ChangeLog.select(CHANGE_LOG_FIELDS)
      .where({ entityType: { eq: entityType } })
      .orderBy({ occurredAt: 'desc' })
      .execute();
    return rows.map(toChangeEntry);
  }
}
