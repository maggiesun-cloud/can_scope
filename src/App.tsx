import React, { useState } from 'react';
import { useCanStore } from './store/canStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { TopStatusBar } from './components/TopStatusBar';
import { Sidebar, NavPage } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { FrameDetailsModal } from './components/FrameDetailsModal';
import { ToastContainer } from './components/ToastContainer';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { MonitorPage } from './pages/MonitorPage';
import { MessagesPage } from './pages/MessagesPage';
import { GraphsPage } from './pages/GraphsPage';
import { LoggingPage } from './pages/LoggingPage';
import { DbcPage } from './pages/DbcPage';
import { TransmitPage } from './pages/TransmitPage';
import { ErrorsPage } from './pages/ErrorsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const {
    status,
    systemInfo,
    frames,
    aggregatedStats,
    isPaused,
    maxDisplayLimit,
    selectedFrame,
    activeDbc,
    recording,
    toasts,
    setMaxDisplayLimit,
    setSelectedFrame,
    clearFrames,
    togglePause,
    handleConnect,
    handleDisconnect,
    handleToggleRecording,
    handleLoadDbc,
    addToast,
    removeToast,
  } = useCanStore();

  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [graphTargetId, setGraphTargetId] = useState<number | undefined>(undefined);

  // Keyboard shortcuts (Space, C, R, Esc)
  useKeyboardShortcuts({
    onTogglePause: togglePause,
    onClear: clearFrames,
    onToggleRecording: handleToggleRecording,
    onCloseModal: () => {
      setSelectedFrame(null);
      setIsConfigModalOpen(false);
    },
  });

  const handleNavigateToGraph = (canId: number) => {
    setGraphTargetId(canId);
    setCurrentPage('graphs');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-zinc-200">
      {/* Top Status & Telemetry Bar */}
      <TopStatusBar
        status={status}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onConnect={() => setIsConfigModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main Split Layout: Sidebar + Active View */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          unreadErrorsCount={status.errorFrames}
        />

        {/* Dynamic Page Viewport */}
        <main className="flex-1 overflow-hidden relative bg-zinc-950">
          {currentPage === 'dashboard' && (
            <DashboardPage
              status={status}
              systemInfo={systemInfo}
              aggregatedStats={aggregatedStats}
              onNavigate={setCurrentPage}
              onOpenConnect={() => setIsConfigModalOpen(true)}
            />
          )}

          {currentPage === 'monitor' && (
            <MonitorPage
              frames={frames}
              isPaused={isPaused}
              onTogglePause={togglePause}
              onClear={clearFrames}
              onSelectFrame={setSelectedFrame}
              maxLimit={maxDisplayLimit}
              onSetMaxLimit={setMaxDisplayLimit}
            />
          )}

          {currentPage === 'messages' && (
            <MessagesPage
              aggregatedStats={aggregatedStats}
              activeDbc={activeDbc}
              onSelectFrame={setSelectedFrame}
              onNavigateToGraph={handleNavigateToGraph}
            />
          )}

          {currentPage === 'graphs' && (
            <GraphsPage
              frames={frames}
              aggregatedStats={aggregatedStats}
              activeDbc={activeDbc}
              initialCanId={graphTargetId}
            />
          )}

          {currentPage === 'logging' && (
            <LoggingPage
              recording={recording}
              onToggleRecording={handleToggleRecording}
              frames={frames}
              onClear={clearFrames}
            />
          )}

          {currentPage === 'dbc' && (
            <DbcPage activeDbc={activeDbc} onLoadDbc={handleLoadDbc} />
          )}

          {currentPage === 'transmit' && (
            <TransmitPage status={status} addToast={addToast} />
          )}

          {currentPage === 'errors' && (
            <ErrorsPage status={status} onClearErrors={() => {}} />
          )}

          {currentPage === 'settings' && (
            <SettingsPage systemInfo={systemInfo} status={status} />
          )}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <ConnectionModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        status={status}
        systemInfo={systemInfo}
        onConnect={handleConnect}
      />

      <FrameDetailsModal
        frame={selectedFrame}
        onClose={() => setSelectedFrame(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
