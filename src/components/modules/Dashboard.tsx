import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { rbacService } from '../../services/rbac';
import {
  GraduationCap,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  FileText
} from 'lucide-react';

interface StatCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function Dashboard() {
  const { db, currentUser } = useAppStore();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    todayAttendance: { present: 0, absent: 0 },
    pendingSalaries: 0,
    pendingFees: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!db) return;
      
      const [students, staff, attendance, salaries, fees, inventory] = await Promise.all([
        db.students.getAll(),
        db.staff.getAll(),
        db.attendance.getByDateRange(new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]),
        db.salary.getAll({ status: 'pending' }),
        db.fees.getAll({ status: 'pending' }),
        db.inventory.getLowStock()
      ]);

      const todayAttendance = attendance.reduce((acc, r) => {
        if (r.status === 'present' || r.status === 'late') acc.present++;
        else if (r.status === 'absent') acc.absent++;
        return acc;
      }, { present: 0, absent: 0 });

      setStats({
        totalStudents: students.length,
        totalStaff: staff.length,
        todayAttendance,
        pendingSalaries: salaries.length,
        pendingFees: fees.length,
        lowStockItems: inventory.length
      });
    };

    loadStats();
  }, [db]);

  const roleName = currentUser ? rbacService.getRoleDisplayName(currentUser.role) : '';

  const allStatCards: StatCard[] = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-blue-500' },
    { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'bg-green-500' },
    { label: "Today's Present", value: stats.todayAttendance.present, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: "Today's Absent", value: stats.todayAttendance.absent, icon: XCircle, color: 'bg-red-500' },
    { label: 'Pending Salaries', value: stats.pendingSalaries, icon: Clock, color: 'bg-amber-500' },
    { label: 'Pending Fees', value: stats.pendingFees, icon: CreditCard, color: 'bg-purple-500' },
    { label: 'Low Stock Items', value: stats.lowStockItems, icon: AlertTriangle, color: 'bg-orange-500' }
  ];

  const filteredCards = allStatCards.filter(card => {
    if (currentUser?.role === 'teacher') {
      return ['Total Students', "Today's Present", "Today's Absent"].includes(card.label);
    }
    if (currentUser?.role === 'finance') {
      return ['Pending Salaries', 'Pending Fees'].includes(card.label);
    }
    return true;
  });

  const quickActions = [
    { label: 'Mark Attendance', icon: ClipboardCheck },
    { label: 'Process Salary', icon: DollarSign },
    { label: 'Record Fee', icon: CreditCard },
    { label: 'Grade Exam', icon: FileText }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {currentUser?.fullName}</h1>
        <p className="text-slate-500 mt-1">{roleName} Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <Icon className="w-6 h-6 text-slate-600" />
                  <span className="font-medium text-slate-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Sync Status</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Up to date
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Storage</span>
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">Local</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
