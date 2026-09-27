import React, { useState } from 'react';
import { X, Key, Cpu, Eye, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { updateSettings } from '../utils/api';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  currentConfig, 
  onConfigUpdated 
}) {
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState(currentConfig?.text_model || 'meta/llama-3.2-11b-vision-instruct');
  const [visionModel, setVisionModel] = useState(currentConfig?.vision_model || 'meta/llama-3.2-11b-vision-instruct');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        text_model: textModel,
        vision_model: visionModel,
      };
      if (apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const res = await updateSettings(payload);
      setSuccessMsg('Settings updated successfully!');
      onConfigUpdated(res);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} style={{ color: '#818cf8' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>NVIDIA NIM Configuration</h3>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px', borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>NVIDIA API Key</label>
              <a 
                href="https://build.nvidia.com" 
                target="_blank" 
                rel="noreferrer" 
                style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Get API Key <ExternalLink size={11} />
              </a>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder={currentConfig?.nim_configured ? "•••••••••••••••••••• (Configured in .env)" : "nvapi-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              You can also specify NVIDIA_API_KEY in backend/.env
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Cpu size={13} style={{ display: 'inline', marginRight: '4px' }} />
              Text Model (for documents & chat)
            </label>
            <input
              type="text"
              className="form-input"
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
              placeholder="meta/llama-3.2-11b-vision-instruct"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Eye size={13} style={{ display: 'inline', marginRight: '4px' }} />
              Vision Model (for uploaded images)
            </label>
            <input
              type="text"
              className="form-input"
              value={visionModel}
              onChange={(e) => setVisionModel(e.target.value)}
              placeholder="meta/llama-3.2-11b-vision-instruct"
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Check size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
