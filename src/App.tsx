import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from './store/appStore';
import { SetupWizard } from './components/auth/SetupWizard';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';

type AppPhase = 'loading' | 'setup' | 'login' | 'app';

export default function App() {
  const { currentUser, db } = useAppStore();
  const [phase, setPhase] = useState<AppPhase>('loading');

  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const hasUsers = await invoke<boolean>('has_users');
        if (!hasUsers) {
          setPhase('setup');
        } else if (currentUser) {
          setPhase('app');
        } else {
          setPhase('login');
        }
      } catch {
        // If the command fails for any reason, fall through to login
        setPhase('login');
      }
    };

    checkFirstRun();
  }, []);

  // When currentUser changes (login / logout), update phase
  useEffect(() => {
    if (phase === 'loading') return;
    if (currentUser) {
      setPhase('app');
    } else if (phase === 'app') {
      setPhase('login');
    }
  }, [currentUser]);

  const handleSetupComplete = async () => {
    // Setup wizard just created the first admin user.
    // Move to login so they authenticate normally.
    setPhase('login');
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Starting Educom…</p>
        </div>
      </div>
    );
  }

  if (phase === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (phase === 'login') {
    return <LoginScreen />;
  }

  return <MainLayout />;
}