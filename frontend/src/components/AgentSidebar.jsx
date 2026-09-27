import React, { useRef, useState } from 'react';
import { 
  Bot, 
  Plus, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  PanelLeftClose, 
  Settings, 
  Sun, 
  Moon, 
  FileCheck,
  CheckCircle2,
  FileCode2,
  Zap,
  HelpCircle
} from 'lucide-react';
import { uploadFile } from '../utils/api';

export default function AgentSidebar({
  currentDoc,
  onDocUploaded,
  onDocCleared,
  onNewChat,
  onSelectPrompt,
  onOpenSettings,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onLoadSample,
  nimConfigured,
  textModel
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file) => {
    setUploading(true);
    try {
      const data = await uploadFile(file);
      onDocUploaded(data);
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside className="agent-sidebar">
      {/* Top Header of Sidebar */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="agent-avatar-icon">
            <Bot size={18} />
          </div>
          <div>
            <div className="agent-brand-title">DocuMind</div>
            <div className="agent-brand-sub">AI Agent Workspace</div>
          </div>
        </div>
        <button 
          className="sidebar-icon-btn" 
          onClick={onToggleSidebar}
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-new-chat-container">
        <button className="sidebar-new-chat-btn" onClick={onNewChat}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-scrollable">
        {/* Agent Profile & Status Card */}
        <div className="agent-status-card">
          <div className="agent-header-row">
            <div className="agent-pulse-indicator">
              <span className={`pulse-dot ${nimConfigured ? 'online' : 'offline'}`}></span>
              <span className="agent-status-label">
                {nimConfigured ? 'Agent Online' : 'Key Needed'}
              </span>
            </div>
            <span className="agent-badge">NVIDIA NIM</span>
          </div>
          <div className="agent-meta-text">
            Autonomous Multimodal Reasoning Engine powered by{' '}
            <strong>{textModel ? textModel.split('/').pop() : 'LLaMA 3.1 70B'}</strong>.
          </div>
        </div>

        {/* Knowledge & Document Grounding Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Knowledge Context</span>
            {currentDoc && (
              <button 
                className="sidebar-clear-btn" 
                onClick={onDocCleared}
                title="Remove attached document"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {!currentDoc ? (
            <div
              className={`agent-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <UploadCloud size={20} className="dropzone-mini-icon" />
              <div className="agent-dropzone-title">
                {uploading ? 'Analyzing document...' : 'Attach Document or Image'}
              </div>
              <div className="agent-dropzone-hint">
                PDF, DOCX, TXT, PNG, JPG, WEBP
              </div>
              <button
                type="button"
                className="demo-doc-link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadSample();
                }}
              >
                <FileCheck size={12} />
                <span>Load Sample Whitepaper</span>
              </button>
            </div>
          ) : (
            <div className="attached-doc-card">
              <div className="attached-doc-header">
                <div className="doc-icon-box">
                  {currentDoc.is_image ? <ImageIcon size={18} /> : <FileText size={18} />}
                </div>
                <div className="doc-details">
                  <div className="doc-filename" title={currentDoc.filename}>
                    {currentDoc.filename}
                  </div>
                  <div className="doc-subinfo">
                    {formatFileSize(currentDoc.metadata?.size_bytes)}
                    {currentDoc.metadata?.page_count ? ` • ${currentDoc.metadata.page_count} pages` : ''}
                    {currentDoc.is_image ? ' • Visual Grounding' : ''}
                  </div>
                </div>
              </div>

              <div className="attached-doc-actions">
                <button
                  className="doc-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Agent Actions / Prompts */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Agent Capabilities</span>
          </div>

          <div className="agent-prompts-list">
            <button
              className="agent-prompt-item"
              onClick={() => onSelectPrompt('Provide a structured executive summary highlighting core findings, key details, and conclusions.')}
            >
              <Zap size={14} className="prompt-icon" />
              <div className="prompt-item-text">
                <div className="prompt-item-title">Executive Summary</div>
                <div className="prompt-item-desc">Structured high-level overview</div>
              </div>
            </button>

            <button
              className="agent-prompt-item"
              onClick={() => onSelectPrompt('Extract all critical metrics, numerical data, dates, and measurable milestones from this material into a neat table.')}
            >
              <FileCode2 size={14} className="prompt-icon" />
              <div className="prompt-item-text">
                <div className="prompt-item-title">Extract Metrics & Data</div>
                <div className="prompt-item-desc">Identify data points & milestones</div>
              </div>
            </button>

            <button
              className="agent-prompt-item"
              onClick={() => onSelectPrompt('What are the key highlights, main takeaways, or important insights in this material?')}
            >
              <HelpCircle size={14} className="prompt-icon" />
              <div className="prompt-item-text">
                <div className="prompt-item-title">Key Highlights & Insights</div>
                <div className="prompt-item-desc">Core takeaways & analysis</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button 
          className="sidebar-footer-btn" 
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button 
          className="sidebar-footer-btn" 
          onClick={onOpenSettings}
          title="NVIDIA NIM API & Model Settings"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
