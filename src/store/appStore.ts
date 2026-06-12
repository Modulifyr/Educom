import { create } from 'zustand';
import type { User, SyncStatus } from '../types';
import { rbacService, type Permission } from '../services/rbac';
import { createDatabaseService, type DatabaseService } from '../services/database';
import { syncEngine } from '../services/syncEngine';
import { invoke } from '@tauri-apps/api/core';

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstRun: boolean;
  sidebarCollapsed: boolean;
  activeModule: string;
  db: DatabaseService | null;
  syncStatus: SyncStatus;
  loginError: string | null;

  initialize: () => Promise<void>;
  checkHasUsers: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  toggleSidebar: () => void;
  setActiveModule: (module: string) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canAccessModule: (module: string) => boolean;
  getAccessibleModules: () => string[];
  triggerSync: () => Promise<void>;
  clearLoginError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  isFirstRun: false,
  sidebarCollapsed: false,
  activeModule: 'dashboard',
  db: null,
  syncStatus: {
    lastSyncTime: '',
    pendingChanges: 0,
    syncState: 'idle',
  },
  loginError: null,

  initialize: async () => {
    try {
      const db = createDatabaseService();
      await db.initialize();

      const hasUsersResult = await invoke<boolean>('has_users').catch(() => true);
      const hasUsers = hasUsersResult;

      set({ db, isLoading: false, isFirstRun: !hasUsers });
    } catch (error) {
      console.error('Failed to initialize:', error);
      set({ db: null, isLoading: false, isFirstRun: true });
    }
  },

  checkHasUsers: async () => {
    try {
      const hasUsers = await invoke<boolean>('has_users');
      set({ isFirstRun: !hasUsers });
      return hasUsers;
    } catch {
      return true;
    }
  },

  login: async (username, password) => {
    const { db } = get();
    set({ loginError: null });

    if (!db) {
      set({ loginError: 'Database not initialized' });
      return false;
    }

    try {
      const user = await db.users.authenticate(username, password);
      if (user) {
        set({ currentUser: user, isAuthenticated: true, loginError: null });
        return true;
      }
      set({ loginError: 'Invalid username or password' });
      return false;
    } catch (error) {
      console.error('Login error:', error);
      set({ loginError: error instanceof Error ? error.message : 'Login failed' });
      return false;
    }
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false, activeModule: 'dashboard' });
  },

  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setActiveModule: (module) => {
    const { currentUser, canAccessModule } = get();
    if (currentUser && canAccessModule(module)) {
      set({ activeModule: module });
    }
  },

  hasPermission: (permission) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return rbacService.hasPermission(currentUser.role, permission);
  },

  hasAnyPermission: (permissions) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return rbacService.hasAnyPermission(currentUser.role, permissions);
  },

  canAccessModule: (module) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    return rbacService.canAccessModule(currentUser.role, module);
  },

  getAccessibleModules: () => {
    const { currentUser } = get();
    if (!currentUser) return [];
    return rbacService.getAccessibleModules(currentUser.role);
  },

  triggerSync: async () => {
    const { db } = get();
    if (!db) return;

    set(state => ({ syncStatus: { ...state.syncStatus, syncState: 'syncing' } }));

    try {
      const result = await syncEngine.sync();
      const status = await db.sync.getStatus();
      if (!result.success && result.errors.length > 0) {
        set({ syncStatus: { ...status, syncState: 'error', errorMessage: result.errors.join(', ') } });
      } else {
        set({ syncStatus: status });
      }
    } catch (err) {
      set(state => ({
        syncStatus: { ...state.syncStatus, syncState: 'error', errorMessage: String(err) },
      }));
    }
  },

  clearLoginError: () => {
    set({ loginError: null });
  },
}));