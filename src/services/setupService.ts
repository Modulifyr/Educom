import { invoke } from '@tauri-apps/api/core';
import type { Invite, InviteCreateInput } from '../types';

export interface ServerStatus {
  mode: string;
  server_url: string | null;
  is_running: boolean;
}

export interface SetupStatus {
  serverMode: string;
  serverUrl: string | null;
  localServerRunning: boolean;
  serverPort: number | null;
}

export const setupService = {
  async hasUsers(): Promise<boolean> {
    return invoke<boolean>('has_users');
  },

  async getServerStatus(): Promise<ServerStatus> {
    return invoke<ServerStatus>('get_server_status');
  },

  async startLocalServer(port?: number): Promise<string> {
    return invoke<string>('start_local_server', { port });
  },

  async stopLocalServer(): Promise<void> {
    return invoke<void>('stop_local_server');
  },

  async configureRemoteServer(url: string): Promise<void> {
    return invoke<void>('configure_remote_server', { serverUrl: url });
  },

  async createInvite(data: InviteCreateInput, createdBy: string): Promise<Invite> {
    return invoke<Invite>('create_invite', { data, createdBy });
  },

  async getInvites(): Promise<Invite[]> {
    return invoke<Invite[]>('get_invites');
  },

  async acceptInvite(inviteCode: string): Promise<void> {
    return invoke<void>('accept_invite', { inviteCode });
  },

  async deleteInvite(id: string): Promise<void> {
    return invoke<void>('delete_invite', { id });
  },
};