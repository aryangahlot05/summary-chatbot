import React from 'react';
import { 
  PanelLeft, 
  ChevronDown, 
  Settings, 
  Sun, 
  Moon, 
  Plus,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  textModel,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onOpenSettings,
  onNewChat
}) {
  const modelDisplayName = textModel 
    ? textModel.split('/').pop().replace('-instruct', '') 
    : 'llama-3.2-11b';

  return (
    <header className="app-header">
      <div className="header-left">
        {!sidebarOpen && (
          <button 
            className="header-icon-btn sidebar-trigger" 
            onClick={onToggleSidebar}
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}

        {/* Professional ChatGPT-style Model Selector */}
        <div 
          className="model-selector-dropdown"
          onClick={onOpenSettings}
          title="Click to configure Model & API Key"
        >
          <span className="model-selector-name">{modelDisplayName}</span>
          <ChevronDown size={14} className="model-selector-chevron" />
        </div>
      </div>

      <div className="header-right">
        {/* Light and Dark theme button (Moon and Sun icon) */}
        <button 
          className="header-icon-btn theme-toggle-btn" 
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="theme-icon sun" />
          ) : (
            <Moon size={18} className="theme-icon moon" />
          )}
        </button>

        {/* New Chat Button */}
        <button 
          className="header-icon-btn" 
          onClick={onNewChat}
          title="New Chat"
          aria-label="New Chat"
        >
          <Plus size={18} />
        </button>

        {/* Settings button */}
        <button 
          className="header-icon-btn" 
          onClick={onOpenSettings}
          title="NVIDIA NIM API & Model Settings"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
