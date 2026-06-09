import { create } from 'zustand';
import type { User, SyncStatus } from '../types';
import { rbacService, type Permission } from '../services/rbac';
import { createDatabaseService, type DatabaseService } from '../services/database';

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  activeModule: string;
  db: DatabaseService | null;
  syncStatus: SyncStatus;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  toggleSidebar: () => void;
  setActiveModule: (module: string) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canAccessModule: (module: string) => boolean;
  getAccessibleModules: () => string[];
  triggerSync: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  sidebarCollapsed: false,
  activeModule: 'dashboard',
  db: null,
  syncStatus: {
    lastSyncTime: '',
    pendingChanges: 0,
    syncState: 'idle',
  },

  initialize: async () => {
    const db = createDatabaseService();
    await db.initialize();
    set({ db, isLoading: false });
  },

  login: async (username, password) => {
    const { db } = get();
    if (!db) return false;

    const user = await db.users.authenticate(username, password);
    if (user) {
      set({ currentUser: user, isAuthenticated: true });
      return true;
    }
    return false;
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
      await db.sync.sync();
      const status = await db.sync.getStatus();
      set({ syncStatus: status });
    } catch {
      set(state => ({
        syncStatus: { ...state.syncStatus, syncState: 'error' },
      }));
    }
  },
}));