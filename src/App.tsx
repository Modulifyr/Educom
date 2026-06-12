import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { Sidebar } from './components/layout/Sidebar';
import { UtilityDock } from './components/layout/UtilityDock';
import { Dashboard } from './components/modules/Dashboard';
import { StudentsModule } from './components/modules/StudentsModule';
import { StaffModule } from './components/modules/StaffModule';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { SalaryModule } from './components/modules/SalaryModule';
import { FeesModule } from './components/modules/FeesModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { CoursesModule } from './components/modules/CoursesModule';
import { ExamsModule } from './components/modules/ExamsModule';
import { LedgerModule } from './components/modules/LedgerModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { UsersModule } from './components/modules/UsersModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { LoginScreen } from './components/auth/LoginScreen';
import { SetupWizard } from './components/auth/SetupWizard';
import './index.css';

function ModuleRouter({ activeModule }: { activeModule: string }) {
  switch (activeModule) {
    case 'dashboard':  return <Dashboard />;
    case 'students':   return <StudentsModule />;
    case 'staff':      return <StaffModule />;
    case 'attendance': return <AttendanceModule />;
    case 'salary':     return <SalaryModule />;
    case 'fees':       return <FeesModule />;
    case 'inventory':  return <InventoryModule />;
    case 'courses':    return <CoursesModule />;
    case 'exams':      return <ExamsModule />;
    case 'ledger':     return <LedgerModule />;
    case 'reports':    return <ReportsModule />;
    case 'users':      return <UsersModule />;
    case 'settings':   return <SettingsModule />;
    default:           return <Dashboard />;
  }
}

function MainLayout() {
  const { activeModule } = useAppStore();
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <ModuleRouter activeModule={activeModule} />
        </main>
      </div>
      <UtilityDock />
    </div>
  );
}

export function App() {
  const { initialize, isLoading, isAuthenticated, isFirstRun } = useAppStore();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App initializing...");
    initialize().catch((error) => {
      console.error('Initialization failed:', error);
      setInitError(error instanceof Error ? error.message : 'Failed to initialize');
    });
  }, [initialize]);

  console.log("isLoading:", isLoading, "isAuthenticated:", isAuthenticated, "isFirstRun:", isFirstRun);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading Educom…</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Initialization Error</h2>
          <p className="text-slate-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isFirstRun) {
      console.log("Showing setup wizard (first run)");
      return <SetupWizard />;
    }
    console.log("Showing login screen");
    return <LoginScreen />;
  }

  console.log("Showing main layout");
  return <MainLayout />;
}