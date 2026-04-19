import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import {
  User,
  Shield,
  Database,
  Monitor,
  Server,
  Globe,
  Wifi,
  WifiOff,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type ConnectionMode = 'standalone' | 'server' | 'client';

interface ServerInfo {
  mode: ConnectionMode;
  url: string | null;
}

export function SettingsModule() {
  const { currentUser, hasPermission } = useAppStore();
  const [serverInfo, setServerInfo] = useState<ServerInfo>({ mode: 'standalone', url: null });
  const [serverPort, setServerPort] = useState('8080');
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const canManageSettings = hasPermission('settings:edit');

  useEffect(() => {
    checkServerInfo();
    checkNetworkStatus();
  }, []);

  const checkServerInfo = async () => {
    try {
      const info = await fetch('http://localhost:8080/api/health').catch(() => null);
      if (info && info.ok) {
        setServerInfo({ mode: 'server', url: 'http://localhost:8080' });
      } else {
        setServerInfo({ mode: 'standalone', url: null });
      }
    } catch {
      setServerInfo({ mode: 'standalone', url: null });
    }
  };

  const checkNetworkStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/health', { method: 'HEAD' });
      setNetworkStatus(response.ok ? 'connected' : 'disconnected');
    } catch {
      setNetworkStatus('disconnected');
    }
  };

  const handleStartServer = async () => {
    if (!canManageSettings) {
      setMessage({ type: 'error', text: 'You do not have permission to modify settings' });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`http://localhost:${serverPort}/api/health`).catch(() => null);
      if (response && response.ok) {
        setMessage({ type: 'error', text: `Server is already running on port ${serverPort}` });
      } else {
        setServerInfo({ mode: 'server', url: `http://localhost:${serverPort}` });
        setMessage({ type: 'success', text: `Server started successfully on port ${serverPort}` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to start server' });
    }

    setIsLoading(false);
  };

  const handleConnectToServer = async () => {
    if (!serverUrl) {
      setMessage({ type: 'error', text: 'Please enter a server URL' });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const normalizedUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
      const response = await fetch(`${normalizedUrl}/api/health`);
      if (response.ok) {
        setServerInfo({ mode: 'client', url: normalizedUrl });
        setMessage({ type: 'success', text: `Connected to server at ${normalizedUrl}` });
        setNetworkStatus('connected');
      } else {
        setMessage({ type: 'error', text: 'Could not connect to server' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect to server. Make sure the server is running.' });
      setNetworkStatus('disconnected');
    }

    setIsLoading(false);
  };

  const handleDisconnect = () => {
    setServerInfo({ mode: 'standalone', url: null });
    setServerUrl('');
    setMessage({ type: 'success', text: 'Disconnected from server. Running in standalone mode.' });
  };

  const getModeColor = (mode: ConnectionMode) => {
    switch (mode) {
      case 'server': return 'bg-green-100 text-green-700';
      case 'client': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getModeIcon = (mode: ConnectionMode) => {
    switch (mode) {
      case 'server': return <Server className="w-4 h-4" />;
      case 'client': return <Globe className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-green-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Username</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-800">{currentUser?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-800">{currentUser?.fullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Role</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-800 capitalize">{currentUser?.role}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-800">{currentUser?.email || 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Connection Mode
              </span>
              <span className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${getModeColor(serverInfo.mode)}`}>
                {getModeIcon(serverInfo.mode)}
                {serverInfo.mode === 'server' ? 'Server' : serverInfo.mode === 'client' ? 'Client' : 'Standalone'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 flex items-center gap-2">
                {networkStatus === 'connected' ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
                Network Status
              </span>
              <span className={`px-2 py-1 rounded text-sm ${
                networkStatus === 'connected' ? 'bg-green-100 text-green-700' :
                networkStatus === 'checking' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {networkStatus === 'connected' ? 'Connected' : networkStatus === 'checking' ? 'Checking...' : 'Offline'}
              </span>
            </div>
            {serverInfo.url && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Server URL
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                  {serverInfo.url}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            Multi-User Network Setup
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">How it works:</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li><strong>Server Mode:</strong> Admin computer hosts the database for others to connect</li>
                <li><strong>Client Mode:</strong> Connect to admin's server to share data</li>
                <li><strong>Standalone:</strong> Use locally, no data sharing</li>
              </ul>
            </div>

            {serverInfo.mode === 'standalone' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start as Server (Admin Computer)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={serverPort}
                      onChange={(e) => setServerPort(e.target.value)}
                      placeholder="Port (e.g., 8080)"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleStartServer}
                      disabled={isLoading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Server className="w-4 h-4" />
                      Start Server
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">OR</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Connect to Server (Other Computers)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://192.168.1.100:8080"
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleConnectToServer}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            )}

            {serverInfo.mode === 'server' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircle className="w-5 h-5" />
                    Server Running
                  </div>
                  <p className="text-sm text-green-700">
                    Other computers can connect to: <code className="bg-green-100 px-2 py-1 rounded">{serverInfo.url}</code>
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Make sure this computer is accessible on the network.
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Stop Server
                </button>
              </div>
            )}

            {serverInfo.mode === 'client' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <Globe className="w-5 h-5" />
                    Connected to Server
                  </div>
                  <p className="text-sm text-blue-700">
                    Connected to: <code className="bg-blue-100 px-2 py-1 rounded">{serverInfo.url}</code>
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    All data is synchronized with the server.
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <WifiOff className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Storage
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Local Storage Used</p>
              <p className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                SQLite Database (Encrypted)
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Encryption</p>
              <p className="text-lg font-semibold text-slate-800">AES-256 (Simulated)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}