import { useEffect } from 'react';
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
import './index.css';

function ModuleRouter({ activeModule }: { activeModule: string }) {
  switch (activeModule) {
    case 'dashboard': return <Dashboard />;
    case 'students': return <StudentsModule />;
    case 'staff': return <StaffModule />;
    case 'attendance': return <AttendanceModule />;
    case 'salary': return <SalaryModule />;
    case 'fees': return <FeesModule />;
    case 'inventory': return <InventoryModule />;
    case 'courses': return <CoursesModule />;
    case 'exams': return <ExamsModule />;
    case 'ledger': return <LedgerModule />;
    case 'reports': return <ReportsModule />;
    case 'users': return <UsersModule />;
    case 'settings': return <SettingsModule />;
    default: return <Dashboard />;
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
  const { initialize, isLoading, isAuthenticated } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const initDemo = async () => {
      const { db, isLoading } = useAppStore.getState();
      if (db && !isLoading) {
        const users = await db.users.getAll();
        if (users.length === 0) {
          await db.users.create({
            username: 'admin',
            fullName: 'System Administrator',
            role: 'admin',
            email: 'admin@educom.local'
          });
          await db.users.create({
            username: 'manager',
            fullName: 'School Manager',
            role: 'management',
            email: 'manager@educom.local'
          });
          await db.users.create({
            username: 'finance',
            fullName: 'Finance Officer',
            role: 'finance',
            email: 'finance@educom.local'
          });
          await db.users.create({
            username: 'teacher',
            fullName: 'John Teacher',
            role: 'teacher',
            email: 'teacher@educom.local'
          });
        }
      }
    };
    initDemo();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Educom...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainLayout />;
}
