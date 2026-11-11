import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { PPEDetectionView } from './components/detection/PPEDetectionView';
import { AlertsView } from './components/alerts/AlertsView';
import { IncidentsView } from './components/incidents/IncidentsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SafetyAssistantView } from './components/assistant/SafetyAssistantView';
import { SafetyProceduresView } from './components/procedures/SafetyProceduresView';
import { SettingsView } from './components/settings/SettingsView';
import { AboutView } from './components/about/AboutView';
import { VirtualSensorView } from './components/sensors/VirtualSensorView';
import { GemiChatbotWidget } from './components/assistant/GemiChatbotWidget';
import { LoginPage } from './components/auth/LoginPage';
import { UserManagementView } from './components/users/UserManagementView';

import { DashboardStats, AlertItem, IncidentItem, DetectionResult, User } from './types';
import { api } from './services/api';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [externalGemiPrompt, setExternalGemiPrompt] = useState<string | null>(null);

  // Global State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    try {
      const user = await api.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadAllData();
      }
    } catch (err) {
      console.warn('Authentication session not active:', err);
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    // Periodic refresh every 30 seconds when authenticated
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadAllData = async () => {
    try {
      const [s, a, i] = await Promise.all([
        api.getDashboardStats(),
        api.getAlerts(),
        api.getIncidents()
      ]);
      setStats(s);
      setAlerts(a);
      setIncidents(i);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (id: string, notes: string) => {
    await api.resolveAlert(id, notes);
    await loadAllData();
  };

  const handleDetectionUpdate = (detection: DetectionResult) => {
    // Refresh stats and alerts when a new scan occurs
    loadAllData();
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
    loadAllData();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  // Role-based route guard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (currentTab === 'settings' || currentTab === 'users') {
        setCurrentTab('dashboard');
      }
    }
  }, [currentUser, currentTab]);

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const openIncidentCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const currentRiskLevel = stats?.current_risk_level || 'LOW';
  const currentRiskScore = stats?.current_risk_score || 18.0;

  // 1. Initial Authentication Loading Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4 animate-pulse">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Initializing Smart Lab Safety System...</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-mono">Verifying personnel authentication</p>
      </div>
    );
  }

  // 2. Unauthenticated State -> Professional Chemical Laboratory Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated State -> Full System with Role-Specific Access
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeAlertCount={activeAlertCount}
        openIncidentCount={openIncidentCount}
        isDemoMode={isDemoMode}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentRiskLevel={currentRiskLevel}
          currentRiskScore={currentRiskScore}
          activeAlertCount={activeAlertCount}
          isDemoMode={isDemoMode}
          setIsDemoMode={setIsDemoMode}
          onRefresh={loadAllData}
          onNavigateAlerts={() => setCurrentTab('alerts')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Dynamic View Scrollport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'dashboard' && stats && (
              <DashboardView
                stats={stats}
                onNavigate={tab => setCurrentTab(tab)}
                onResolveAlert={handleResolveAlert}
                isDemoMode={isDemoMode}
                onOpenGemiWithPrompt={prompt => setExternalGemiPrompt(prompt)}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'detection' && (
              <PPEDetectionView isDemoMode={isDemoMode} onDetectionUpdate={handleDetectionUpdate} />
            )}

            {currentTab === 'alerts' && (
              <AlertsView
                alerts={alerts}
                onRefresh={loadAllData}
                onResolveAlert={handleResolveAlert}
              />
            )}

            {currentTab === 'incidents' && (
              <IncidentsView
                incidents={incidents}
                onRefresh={loadAllData}
              />
            )}

            {currentTab === 'analytics' && <AnalyticsView />}

            {currentTab === 'sensors' && (
              <VirtualSensorView onNavigate={(tab) => setCurrentTab(tab as NavItem)} />
            )}

            {currentTab === 'assistant' && <SafetyAssistantView />}

            {currentTab === 'procedures' && <SafetyProceduresView />}

            {currentTab === 'users' && currentUser.role === 'admin' && (
              <UserManagementView currentUser={currentUser} />
            )}

            {currentTab === 'settings' && currentUser.role === 'admin' && <SettingsView />}

            {currentTab === 'about' && <AboutView />}
          </div>
        </main>
      </div>

      {/* Global Floating Gemi AI Chatbot Widget */}
      <GemiChatbotWidget
        stats={stats}
        onNavigate={tab => setCurrentTab(tab)}
        externalPrompt={externalGemiPrompt}
        onClearExternalPrompt={() => setExternalGemiPrompt(null)}
      />
    </div>
  );
}
