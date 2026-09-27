import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AgentSidebar from './components/AgentSidebar';
import ChatPanel from './components/ChatPanel';
import SettingsModal from './components/SettingsModal';
import { fetchHealth, uploadFile } from './utils/api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('documind_theme') || 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [healthInfo, setHealthInfo] = useState({
    nim_configured: false,
    text_model: 'meta/llama-3.2-11b-vision-instruct',
    vision_model: 'meta/llama-3.2-11b-vision-instruct',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [externalPrompt, setExternalPrompt] = useState('');
  const [chatKey, setChatKey] = useState(0);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('documind_theme', theme);
  }, [theme]);

  // Fetch initial backend health
  useEffect(() => {
    fetchHealth()
      .then((data) => setHealthInfo(data))
      .catch((err) => console.warn('Backend not ready yet:', err));
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleNewChat = () => {
    setChatKey((k) => k + 1);
    setExternalPrompt('');
  };

  // Sample Whitepaper loader for quick demo
  const handleLoadSample = async () => {
    const sampleText = `Autonomous Agents in Distributed Computing Architecture
Executive Overview:
Recent advances in agentic artificial intelligence have accelerated the deployment of distributed autonomous agents capable of collaborative reasoning, tool usage, and real-time environment negotiation. Unlike traditional static pipelines, agentic architectures incorporate cyclic reflection loops, memory buffers, and dynamic task delegation.

1. System Architectural Foundations
The proposed system consists of three foundational layers:
- Sensory & Perception Layer: Handles multimodal ingestion including visual UI feeds, raw unstructured text streams, and system metrics.
- Cognitive Engine: Powered by high-parameter reasoning models (e.g. LLaMA 3.1 70B) orchestrated through high-throughput inference endpoints (NVIDIA NIM). Employs chain-of-thought verification to minimize hallucinations.
- Execution & Tool Brokerage: Implements sandboxed command execution, safe API calling conventions, and transactional state rollbacks.

2. Benchmark Performance & Scalability
- End-to-End Latency: Reduced from 4.8s to 1.1s under parallel batch dispatching.
- Fault Tolerance: 99.4% task recovery rate upon encountering unexpected tool call failures.
- Token Optimization: Context caching mechanisms achieved a 42% reduction in recurring prompt token overhead.

3. Key Strategic Recommendations
- Implement granular permission tiers for autonomous agent command execution.
- Maintain persistent JSONL audit logs for reproducibility and alignment monitoring.
- Deploy local vector embeddings alongside NVIDIA NIM inference for hybrid retrieval-augmented generation (RAG).`;

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const file = new File([blob], 'Autonomous_Agents_Whitepaper.txt', { type: 'text/plain' });
    try {
      const data = await uploadFile(file);
      setCurrentDoc(data);
    } catch (err) {
      console.error('Error uploading sample:', err);
    }
  };

  return (
    <div className={`chatgpt-layout ${sidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      {/* Left Agent Panel (Sidebar) */}
      {sidebarOpen && (
        <AgentSidebar
          currentDoc={currentDoc}
          onDocUploaded={(doc) => setCurrentDoc(doc)}
          onDocCleared={() => setCurrentDoc(null)}
          onNewChat={handleNewChat}
          onSelectPrompt={(p) => setExternalPrompt(p)}
          onOpenSettings={() => setSettingsOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onToggleSidebar={handleToggleSidebar}
          onLoadSample={handleLoadSample}
          nimConfigured={healthInfo.nim_configured}
          textModel={healthInfo.text_model}
        />
      )}

      {/* Main Area: Header + Centered Chat */}
      <div className="chatgpt-main-view">
        <Header
          textModel={healthInfo.text_model}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewChat={handleNewChat}
        />

        <main className="chatgpt-chat-container">
          <ChatPanel
            key={chatKey}
            currentDoc={currentDoc}
            onDocUploaded={(doc) => setCurrentDoc(doc)}
            onDocCleared={() => setCurrentDoc(null)}
            nimConfigured={healthInfo.nim_configured}
            onOpenSettings={() => setSettingsOpen(true)}
            externalPrompt={externalPrompt}
            onClearExternalPrompt={() => setExternalPrompt('')}
          />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentConfig={healthInfo}
        onConfigUpdated={(updated) => {
          setHealthInfo((prev) => ({
            ...prev,
            ...updated,
          }));
        }}
      />
    </div>
  );
}
