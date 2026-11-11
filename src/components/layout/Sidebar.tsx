import React from 'react';
import {
  LayoutDashboard,
  Video,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  BarChart3,
  Bot,
  BookOpen,
  Settings,
  Info,
  Activity,
  Layers,
  Sparkles,
  Cpu,
  Users as UsersIcon,
  UserCheck,
  GraduationCap,
  ShieldAlert
} from 'lucide-react';
import { NavItem, User } from '../../types';

export type { NavItem };

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  activeAlertCount: number;
  openIncidentCount: number;
  isDemoMode: boolean;
  currentUser?: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeAlertCount,
  openIncidentCount,
  isDemoMode,
  currentUser
}) => {
  const role = currentUser?.role || 'admin';

  // Operations & Vision group
  const rawOpsItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; roles?: string[] }[] = [
    { id: 'dashboard',  label: 'Dashboard',       icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'detection',  label: role === 'student' ? 'PPE Self-Check' : 'AI PPE Detection', icon: <ShieldCheck className="w-5 h-5" /> },
    {
      id: 'alerts',
      label: 'Safety Alerts',
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['admin', 'assistant']
    },
  ];

  // Safety Management group
  const rawSafetyItems: { id: NavItem; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; roles?: string[] }[] = [
    {
      id: 'incidents',
      label: 'Incidents',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      badge: openIncidentCount > 0 ? openIncidentCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      roles: ['admin', 'assistant']
    },
    { id: 'analytics', label: 'Analytics',                 icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'assistant'] },
    { id: 'sensors',   label: 'Virtual Sensors',           icon: <Cpu className="w-5 h-5" />, roles: ['admin', 'assistant'] },
    { id: 'assistant', label: 'RAG Safety Bot',            icon: <Bot className="w-5 h-5" /> },
    { id: 'procedures',label: 'Safety Procedures',         icon: <BookOpen className="w-5 h-5" /> },
  ];

  // System & Setup group
  const rawSystemItems: { id: NavItem; label: string; icon: React.ReactNode; roles?: string[] }[] = [
    { id: 'users',    label: 'Personnel Accounts', icon: <UsersIcon className="w-5 h-5" />, roles: ['admin'] },
    { id: 'settings', label: 'Settings',           icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
    { id: 'about',    label: 'About & Setup',      icon: <Info className="w-5 h-5" /> },
  ];

  // Filter items based on current role
  const opsItems = rawOpsItems.filter(item => !item.roles || item.roles.includes(role));
  const safetyItems = rawSafetyItems.filter(item => !item.roles || item.roles.includes(role));
  const systemItems = rawSystemItems.filter(item => !item.roles || item.roles.includes(role));

  function renderGroup(
    items: { id: NavItem; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[],
    activeStyle: string,
    activeText: string,
  ) {
    return items.map(item => {
      const active = currentTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => setCurrentTab(item.id)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active
              ? activeStyle
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={active ? activeText : 'text-slate-400'}>{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'sensors' && !active && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200 uppercase">SIM</span>
            )}
          </div>
          {item.badge !== undefined && (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${item.badgeColor}`}>
              {item.badge}
            </span>
          )}
        </button>
      );
    });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">Smart Lab Safety</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1">AI PPE & Hazard System</p>
          </div>
        </div>

        {/* Active Personnel Role Card */}
        {currentUser && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center text-white shrink-0 ${
              currentUser.role === 'admin'
                ? 'bg-indigo-600 shadow-sm shadow-indigo-500/20'
                : currentUser.role === 'assistant'
                ? 'bg-sky-600 shadow-sm shadow-sky-500/20'
                : 'bg-emerald-600 shadow-sm shadow-emerald-500/20'
            }`}>
              {currentUser.role === 'admin' ? (
                <ShieldAlert className="w-4 h-4" />
              ) : currentUser.role === 'assistant' ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <GraduationCap className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser.full_name}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 truncate">
                {currentUser.role === 'admin'
                  ? 'Admin / Supervisor'
                  : currentUser.role === 'assistant'
                  ? 'Lab Assistant'
                  : 'Student / Researcher'}
              </div>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations & Vision
          </div>
          {renderGroup(opsItems, 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100', 'text-blue-600')}

          <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Safety Management
          </div>
          {renderGroup(safetyItems, 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100', 'text-indigo-600')}

          <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            System & Setup
          </div>
          {renderGroup(systemItems, 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100', 'text-purple-600')}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
          <span className="font-medium">Model Pipeline</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            YOLOv8
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Target: <code className="text-slate-700 font-mono text-[10px]">backend/models/best.pt</code>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-md">
          <Cpu className="w-3 h-3 text-violet-500 shrink-0" />
          <span>Virtual Sensor Sim Active</span>
        </div>
        {isDemoMode && (
          <div className="mt-1.5 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Interactive Demo Data Active</span>
          </div>
        )}
      </div>
    </aside>
  );
};
