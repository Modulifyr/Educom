import { clsx } from 'clsx';
import { useAppStore } from '../../store/appStore';
import { rbacService } from '../../services/rbac';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  DollarSign,
  CreditCard,
  Package,
  BookOpen,
  FileText,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  type LucideIcon
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'salary', label: 'Salary', icon: DollarSign },
  { id: 'fees', label: 'Fee Collection', icon: CreditCard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'exams', label: 'Examinations', icon: FileText },
  { id: 'ledger', label: 'Ledger', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'users', label: 'User Management', icon: UserCog },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activeModule, setActiveModule, currentUser, logout } = useAppStore();
  
  const accessibleModules = currentUser ? rbacService.getAccessibleModules(currentUser.role) : [];
  const filteredMenuItems = menuItems.filter(item => accessibleModules.includes(item.id));

  return (
    <aside
      className={clsx(
        'h-full bg-sidebar-bg text-white flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-700">
        {!sidebarCollapsed && (
          <h1 className="text-xl font-bold text-primary-400">Educom</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-sidebar-hover text-slate-300'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={clsx('shrink-0', isActive ? 'text-white' : 'text-slate-400')} size={20} />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        {currentUser && (
          <div className={clsx('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-3')}>
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-lg font-semibold shrink-0">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.fullName}</p>
                <p className="text-xs text-slate-400">{rbacService.getRoleDisplayName(currentUser.role)}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={clsx(
            'mt-3 w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2',
            sidebarCollapsed ? 'px-2' : 'px-4'
          )}
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
