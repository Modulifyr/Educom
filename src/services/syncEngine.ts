import { invoke } from '@tauri-apps/api/core';
import type { SyncStatus, SyncQueueEntry, ConflictResolutionResult, SyncOperation, UserRole } from '../types';
import { compareRoleAuthority } from './rbac';

export interface SyncTransportConfig {
  serverUrl: string;
  apiKey?: string;
  deviceId: string;
  timeout?: number;
}

export interface SyncTransport {
  push(operations: SyncQueueEntry[]): Promise<PushResponse>;
  pull(sinceTimestamp?: string): Promise<PullResponse>;
  testConnection(): Promise<boolean>;
}

export interface PushResponse {
  success: boolean;
  acceptedIds: string[];
  rejectedIds: Array<{ id: string; error: string }>;
  serverTimestamp: string;
}

export interface PullResponse {
  success: boolean;
  operations: SyncQueueEntry[];
  serverTimestamp: string;
}

export class RestSyncTransport implements SyncTransport {
  private config: SyncTransportConfig;
  private timeout: number;

  constructor(config: SyncTransportConfig) {
    this.config = config;
    this.timeout = config.timeout ?? 30000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.serverUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-ID': this.config.deviceId,
      ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      ...options.headers as Record<string, string>,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async push(operations: SyncQueueEntry[]): Promise<PushResponse> {
    if (operations.length === 0) {
      return { success: true, acceptedIds: [], rejectedIds: [], serverTimestamp: new Date().toISOString() };
    }

    return this.request<PushResponse>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
  }

  async pull(sinceTimestamp?: string): Promise<PullResponse> {
    const params = sinceTimestamp ? `?since=${encodeURIComponent(sinceTimestamp)}` : '';
    return this.request<PullResponse>(`/sync/pull${params}`, {
      method: 'GET',
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ status: string }>('/health', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }
}

export class LocalOnlyTransport implements SyncTransport {
  async push(operations: SyncQueueEntry[]): Promise<PushResponse> {
    return {
      success: true,
      acceptedIds: operations.map(o => o.id),
      rejectedIds: [],
      serverTimestamp: new Date().toISOString(),
    };
  }

  async pull(): Promise<PullResponse> {
    return {
      success: true,
      operations: [],
      serverTimestamp: new Date().toISOString(),
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

export interface SyncEngine {
  queueOperation(op: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<string>;
  getPendingOperations(): Promise<SyncQueueEntry[]>;
  markSynced(ids: string[]): Promise<void>;
  resolveAndApplyRemote(remote: Omit<SyncQueueEntry, 'synced'>): Promise<ConflictResolutionResult>;
  applySyncedChange(op: Omit<SyncOperation, 'userRole' | 'timestamp'>): Promise<void>;
  clearOldSyncedOperations(beforeTimestamp: string): Promise<number>;
  getStatus(): Promise<SyncStatus>;
  sync(): Promise<SyncResult>;
  setTransport(transport: SyncTransport): void;
  getTransport(): SyncTransport;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

let currentTransport: SyncTransport = new LocalOnlyTransport();

export const syncEngine: SyncEngine = {
  async queueOperation(op): Promise<string> {
    const entryId = await invoke<string>('queue_sync_operation', {
      operation: op.operation,
      tableName: op.tableName,
      recordId: op.recordId,
      data: JSON.stringify(op.data),
      userRole: op.userRole,
    });
    return entryId;
  },

  async getPendingOperations(): Promise<SyncQueueEntry[]> {
    const entries = await invoke<SyncQueueEntry[]>('get_pending_sync_operations');
    return entries;
  },

  async markSynced(ids: string[]): Promise<void> {
    await invoke('mark_operations_synced', { ids });
  },

  async resolveAndApplyRemote(remote): Promise<ConflictResolutionResult> {
    const result = await invoke<ConflictResolutionResult>('resolve_and_apply_remote_change', {
      remoteOperation: remote.operation,
      remoteTable: remote.tableName,
      remoteRecordId: remote.recordId,
      remoteData: remote.data,
      remoteUserRole: remote.userRole,
      remoteTimestamp: remote.timestamp,
    });
    return result;
  },

  async applySyncedChange(op): Promise<void> {
    await invoke('apply_synced_change', {
      operation: op.operation,
      tableName: op.tableName,
      recordId: op.recordId,
      data: JSON.stringify(op.data),
    });
  },

  async clearOldSyncedOperations(beforeTimestamp: string): Promise<number> {
    const deleted = await invoke<number>('clear_synced_operations', { beforeTimestamp });
    return deleted;
  },

  async getStatus(): Promise<SyncStatus> {
    const status = await invoke<SyncStatus>('get_sync_status');
    return status;
  },

  setTransport(transport: SyncTransport): void {
    currentTransport = transport;
  },

  getTransport(): SyncTransport {
    return currentTransport;
  },

  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const pending = await this.getPendingOperations();

      if (pending.length > 0) {
        const pushResponse = await currentTransport.push(pending);
        result.pushed = pending.length;

        if (pushResponse.success) {
          await this.markSynced(pushResponse.acceptedIds);
          for (const rejected of pushResponse.rejectedIds) {
            result.errors.push(`Push rejected for ${rejected.id}: ${rejected.error}`);
          }
        } else {
          result.errors.push('Push failed');
        }
      }

      const lastSyncTime = (await this.getStatus()).lastSyncTime;
      const pullResponse = await currentTransport.pull(lastSyncTime || undefined);

      if (pullResponse.success) {
        for (const remote of pullResponse.operations) {
          try {
            const resolution = await this.resolveAndApplyRemote(remote);
            result.pulled++;

            if (resolution.conflictType === 'append_only' || resolution.conflictType === 'immutable') {
              await this.applySyncedChange({
                operation: remote.operation as 'create' | 'update' | 'delete',
                tableName: remote.tableName,
                recordId: remote.recordId,
                data: JSON.parse(remote.data),
              });
            } else if (resolution.conflictType === 'additive') {
              if (resolution.winningData) {
                await this.applySyncedChange({
                  operation: 'update',
                  tableName: remote.tableName,
                  recordId: remote.recordId,
                  data: JSON.parse(resolution.winningData),
                });
              }
            } else {
              result.conflicts++;

              if (resolution.winningData) {
                await this.applySyncedChange({
                  operation: remote.operation as 'create' | 'update' | 'delete',
                  tableName: remote.tableName,
                  recordId: remote.recordId,
                  data: JSON.parse(resolution.winningData),
                });
              }
            }
          } catch (err) {
            result.errors.push(`Conflict resolution failed for ${remote.recordId}: ${err}`);
          }
        }
      }

      const oldTimestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await this.clearOldSyncedOperations(oldTimestamp);

    } catch (err) {
      result.success = false;
      result.errors.push(`Sync failed: ${err}`);
    }

    return result;
  },
};

export function createSyncOperation(
  operation: 'create' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  data: Record<string, unknown>,
  userRole: string
): Omit<SyncOperation, 'id' | 'timestamp'> {
  return { operation, tableName, recordId, data, userRole };
}

export async function queueAndSync(
  operation: 'create' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  data: Record<string, unknown>,
  userRole: string
): Promise<void> {
  await syncEngine.queueOperation({ operation, tableName, recordId, data, userRole });
  await syncEngine.sync();
}

export function resolveConflictByRole(
  localRole: UserRole,
  remoteRole: UserRole,
  localTimestamp: string,
  remoteTimestamp: string
): 'local' | 'remote' {
  const authorityDiff = compareRoleAuthority(localRole, remoteRole);

  if (authorityDiff > 0) {
    return 'local';
  } else if (authorityDiff < 0) {
    return 'remote';
  }

  return localTimestamp >= remoteTimestamp ? 'local' : 'remote';
}

export function configureSyncTransport(config: SyncTransportConfig): SyncTransport {
  const transport = new RestSyncTransport(config);
  syncEngine.setTransport(transport);
  return transport;
}

export function getSyncTransport(): SyncTransport {
  return syncEngine.getTransport();
}

export function isServerConfigured(): boolean {
  const transport = syncEngine.getTransport();
  return transport instanceof RestSyncTransport;
}