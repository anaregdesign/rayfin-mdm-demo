import type {
  ChangeEntityType,
  ChangeEntry,
} from '@/domain/models/change-log';
import type { Clock } from '@/domain/ports/clock';
import type {
  AppendChangeEntry,
  ChangeLogRepository,
} from '@/domain/repositories/change-log-repository';

import { clone } from './clone';

/**
 * In-memory append-only change-history repository for demo mode. Mirrors the
 * Rayfin adapter: `append` assigns an id + `occurredAt` from the clock; reads
 * return newest-first clones.
 */
export class InMemoryChangeLogRepository implements ChangeLogRepository {
  private readonly rows: ChangeEntry[] = [];

  constructor(private readonly clock: Clock) {}

  async append(entry: AppendChangeEntry): Promise<void> {
    this.rows.push(
      clone({
        id: crypto.randomUUID(),
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        actorId: entry.actorId,
        summary: entry.summary,
        occurredAt: this.clock.now(),
      })
    );
  }

  async listByEntity(
    entityType: ChangeEntityType,
    entityId: string
  ): Promise<ChangeEntry[]> {
    return this.rows
      .filter((r) => r.entityType === entityType && r.entityId === entityId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map(clone);
  }

  async listByType(entityType: ChangeEntityType): Promise<ChangeEntry[]> {
    return this.rows
      .filter((r) => r.entityType === entityType)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map(clone);
  }
}
