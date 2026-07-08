import type { ChangeRequest } from '@/domain/models/change-request';
import type { Clock } from '@/domain/ports/clock';
import type {
  ChangeRequestRepository,
  RaiseChangeRequest,
} from '@/domain/repositories/change-request-repository';

import { clone } from './clone';

/**
 * In-memory change-request (approval queue) repository for demo mode. Mirrors
 * the Rayfin adapter: `raise` creates a `pending` request stamped with
 * `requestedAt`; `update` persists only the review fields (status/reviewedBy/
 * reason/reviewedAt).
 */
export class InMemoryChangeRequestRepository
  implements ChangeRequestRepository
{
  private readonly rows: ChangeRequest[] = [];

  constructor(private readonly clock: Clock) {}

  async raise(request: RaiseChangeRequest): Promise<ChangeRequest> {
    const row: ChangeRequest = {
      id: crypto.randomUUID(),
      entityType: request.entityType,
      entityId: request.entityId,
      operation: request.operation,
      payload: request.payload,
      status: 'pending',
      requestedBy: request.requestedBy,
      summary: request.summary,
      requestedAt: this.clock.now(),
    };
    this.rows.push(clone(row));
    return clone(row);
  }

  async list(): Promise<ChangeRequest[]> {
    return this.rows
      .slice()
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .map(clone);
  }

  async findById(id: string): Promise<ChangeRequest | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? clone(row) : null;
  }

  async update(request: ChangeRequest): Promise<ChangeRequest> {
    const row = this.rows.find((r) => r.id === request.id);
    if (!row) {
      throw new Error(`ChangeRequest ${request.id} not found after update`);
    }
    row.status = request.status;
    row.reviewedBy = request.reviewedBy;
    row.reason = request.reason;
    row.reviewedAt = request.reviewedAt;
    return clone(row);
  }
}
