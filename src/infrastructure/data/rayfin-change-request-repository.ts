import type { ChangeRequest } from '@/domain/models/change-request';
import type { Clock } from '@/domain/ports/clock';
import type {
  ChangeRequestRepository,
  RaiseChangeRequest,
} from '@/domain/repositories/change-request-repository';
import type { RayfinClientFacade } from '@/infrastructure/rayfin/client';

import { serializePayload, toChangeRequest } from './change-request-mapper';

/** All ChangeRequest columns. Reads MUST select fields explicitly. */
const CHANGE_REQUEST_FIELDS = [
  'id',
  'entityType',
  'entityId',
  'operation',
  'payload',
  'status',
  'requestedBy',
  'reviewedBy',
  'reason',
  'summary',
  'requestedAt',
  'reviewedAt',
] as const;

/** Rayfin-backed change-request (approval queue) repository. */
export class RayfinChangeRequestRepository implements ChangeRequestRepository {
  constructor(
    private readonly client: RayfinClientFacade,
    private readonly clock: Clock
  ) {}

  async raise(request: RaiseChangeRequest): Promise<ChangeRequest> {
    const row = await this.client.data.ChangeRequest.create({
      entityType: request.entityType,
      entityId: request.entityId,
      operation: request.operation,
      payload: serializePayload(request.payload),
      status: 'pending',
      requestedBy: request.requestedBy,
      summary: request.summary,
      requestedAt: this.clock.now(),
    });
    return toChangeRequest(row);
  }

  async list(): Promise<ChangeRequest[]> {
    const rows = await this.client.data.ChangeRequest.select(
      CHANGE_REQUEST_FIELDS
    )
      .orderBy({ requestedAt: 'desc' })
      .execute();
    return rows.map(toChangeRequest);
  }

  async findById(id: string): Promise<ChangeRequest | null> {
    const rows = await this.client.data.ChangeRequest.select(
      CHANGE_REQUEST_FIELDS
    )
      .where({ id: { eq: id } })
      .execute();
    const row = rows[0];
    return row ? toChangeRequest(row) : null;
  }

  async update(request: ChangeRequest): Promise<ChangeRequest> {
    await this.client.data.ChangeRequest.update(
      { id: request.id },
      {
        status: request.status,
        reviewedBy: request.reviewedBy,
        reason: request.reason,
        reviewedAt: request.reviewedAt,
      }
    );
    const updated = await this.findById(request.id);
    if (!updated) {
      throw new Error(`ChangeRequest ${request.id} not found after update`);
    }
    return updated;
  }
}
