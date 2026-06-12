import { useState, useEffect, useCallback } from 'react';
import { syncEngine } from '../../services/syncEngine';
import type { SyncStatus, SyncResult } from '../../types';

interface SyncHealthDashboardProps {
  onSyncComplete?: (result: SyncResult) => void;
}

export function SyncHealthDashboard({ onSyncComplete }: SyncHealthDashboardProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const syncStatus = await syncEngine.getStatus();
      setStatus(syncStatus);
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setStatus((prev: SyncStatus | null) => prev ? { ...prev, syncState: 'syncing' } : null);

    try {
      const result = await syncEngine.sync();
      setLastResult(result);
      await fetchStatus();
      onSyncComplete?.(result);
    } catch (err) {
      console.error('Sync failed:', err);
      setStatus(prev => prev ? {
        ...prev,
        syncState: 'error',
        errorMessage: String(err)
      } : null);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const getStatusColor = () => {
    if (isSyncing || status?.syncState === 'syncing') return 'bg-yellow-500';
    if (status?.syncState === 'error') return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (isSyncing || status?.syncState === 'syncing') return 'Syncing...';
    if (status?.syncState === 'error') return 'Error';
    return 'Synced';
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Sync Status</h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm text-gray-600">{getStatusText()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-sm text-gray-500">Pending Changes</div>
          <div className="text-2xl font-bold text-gray-800">
            {status?.pendingChanges ?? 0}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <div className="text-sm text-gray-500">Last Sync</div>
          <div className="text-sm font-medium text-gray-800">
            {formatTime(status?.lastSyncTime ?? '')}
          </div>
        </div>
      </div>

      {status?.errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {status.errorMessage}
        </div>
      )}

      {lastResult && (
        <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
          <div className="flex justify-between mb-1">
            <span>Pushed:</span>
            <span className="font-medium">{lastResult.pushed}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Pulled:</span>
            <span className="font-medium">{lastResult.pulled}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Conflicts:</span>
            <span className="font-medium text-yellow-600">{lastResult.conflicts}</span>
          </div>
          {lastResult.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              {lastResult.errors.length} error(s)
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex-1 py-2 px-4 rounded font-medium text-white transition
            ${isSyncing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="py-2 px-4 rounded font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      {showHistory && lastResult && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Last Sync Details</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Success: {lastResult.success ? 'Yes' : 'No'}</div>
            <div>Push errors: {lastResult.errors.filter((e: string) => e.includes('Push')).length}</div>
            <div>Conflict errors: {lastResult.errors.filter((e: string) => e.includes('Conflict')).length}</div>
            {lastResult.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {lastResult.errors.map((err: string, i: number) => (
                  <div key={i} className="text-red-500 truncate">{err}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const syncStatus = await syncEngine.getStatus();
        setStatus(syncStatus);
      } catch (err) {
        console.error('Failed to fetch sync status:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status?.syncState === 'syncing') return 'bg-yellow-500';
    if (status?.syncState === 'error') return 'bg-red-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm">
      <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {status?.pendingChanges && status.pendingChanges > 0 && (
        <span className="text-xs text-gray-600">{status.pendingChanges} pending</span>
      )}
    </div>
  );
}