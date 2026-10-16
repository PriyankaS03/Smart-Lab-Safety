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

import { DashboardStats, AlertItem, IncidentItem, DetectionResult } from './types';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [externalGemiPrompt, setExternalGemiPrompt] = useState<string | null>(null);

  // Global State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  useEffect(() => {
    loadAllData();
    // Periodic refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const activeAlertCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const openIncidentCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const currentRiskLevel = stats?.current_risk_level || 'LOW';
  const currentRiskScore = stats?.current_risk_score || 18.0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeAlertCount={activeAlertCount}
        openIncidentCount={openIncidentCount}
        isDemoMode={isDemoMode}
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

            {currentTab === 'settings' && <SettingsView />}

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
