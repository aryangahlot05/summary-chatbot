import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Eye, 
  ListOrdered, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { uploadFile, generateSummary } from '../utils/api';

const SUMMARY_STYLES = [
  { id: 'bullet', label: 'Bullet Highlights', desc: 'Crisp bulleted insights' },
  { id: 'executive', label: 'Executive Brief', desc: 'Strategic high-level overview' },
  { id: 'takeaways', label: 'Key Takeaways', desc: 'Top critical learnings' },
  { id: 'tldr', label: 'Quick TL;DR', desc: '2-3 sentence punchy summary' },
  { id: 'detailed', label: 'Comprehensive', desc: 'In-depth section breakdown' },
];

export default function DocumentPanel({ 
  currentDoc, 
  onDocUploaded, 
  onDocCleared 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('bullet');
  const [summaryText, setSummaryText] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'preview'
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFileUpload(e.target.files[0]);
    }
  };

  const processFileUpload = async (file) => {
    setUploading(true);
    setErrorMsg('');
    try {
      const data = await uploadFile(file);
      onDocUploaded(data);
      setSummaryText('');
      setViewMode('preview');
      // Automatically trigger initial summary
      handleGenerateSummary(data.doc_id, selectedStyle);
    } catch (err) {
      setErrorMsg(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSummary = async (docIdToUse, styleToUse) => {
    const docId = docIdToUse || currentDoc?.doc_id;
    const style = styleToUse || selectedStyle;
    if (!docId && !currentDoc?.preview) {
      setErrorMsg('Please upload a document first.');
      return;
    }

    setSummarizing(true);
    setErrorMsg('');
    try {
      const result = await generateSummary(docId, style, currentDoc?.custom_text || null);
      setSummaryText(result.summary);
      setViewMode('summary');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = viewMode === 'summary' ? summaryText : currentDoc?.preview;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = viewMode === 'summary' ? summaryText : currentDoc?.preview;
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDoc?.filename || 'document'}_${viewMode}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="split-panel">
      <div className="panel-header">
        <div className="panel-title">
          <FileText size={18} style={{ color: '#818cf8' }} />
          <span>Document & Summarizer</span>
        </div>

        {currentDoc && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '2px' }}>
              <button
                className={`btn ${viewMode === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setViewMode('summary')}
              >
                Summary
              </button>
              <button
                className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setViewMode('preview')}
              >
                Extracted Text
              </button>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '5px 8px' }}
              onClick={onDocCleared}
              title="Clear Active Document"
            >
              <Trash2 size={13} style={{ color: '#f87171' }} />
            </button>
          </div>
        )}
      </div>

      <div className="panel-content">
        {/* Dropzone */}
        {!currentDoc ? (
          <div
            className={`dropzone ${dragActive ? 'active' : ''}`}
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
            <div className="dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <div className="dropzone-title">
              {uploading ? 'Analyzing and parsing file...' : 'Drop your document or image here'}
            </div>
            <div className="dropzone-desc">
              Supports PDF, DOCX, DOC, TXT, and Images (PNG, JPG, WEBP)
            </div>
          </div>
        ) : (
          /* Active Document Info Card */
          <div className="active-doc-card">
            <div className="doc-info-row">
              <div className="doc-name-group">
                <span className="doc-badge">
                  {currentDoc.is_image ? 'Image' : currentDoc.metadata?.extension || 'Doc'}
                </span>
                <div>
                  <div className="doc-title" title={currentDoc.filename}>
                    {currentDoc.filename}
                  </div>
                  <div className="doc-meta">
                    {formatFileSize(currentDoc.metadata?.size_bytes)}
                    {currentDoc.metadata?.page_count ? ` • ${currentDoc.metadata.page_count} pages` : ''}
                    {currentDoc.metadata?.dimensions ? ` • ${currentDoc.metadata.dimensions}` : ''}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                Change File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
            </div>

            {/* Style Selector Chips */}
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                Summarization Style:
              </div>
              <div className="style-selector">
                {SUMMARY_STYLES.map((st) => (
                  <button
                    key={st.id}
                    className={`style-pill ${selectedStyle === st.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStyle(st.id);
                      handleGenerateSummary(currentDoc.doc_id, st.id);
                    }}
                    title={st.desc}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summarize Action Button */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '9px 16px' }}
                onClick={() => handleGenerateSummary(currentDoc.doc_id, selectedStyle)}
                disabled={summarizing}
              >
                <Sparkles size={16} />
                <span>{summarizing ? 'Generating with NVIDIA NIM...' : 'Regenerate Summary'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Viewer / Summary Display */}
        {currentDoc && (
          <div className="summary-output" style={{ flex: 1, minHeight: '260px' }}>
            <div className="summary-toolbar">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                {viewMode === 'summary' ? `Mode: ${selectedStyle.toUpperCase()}` : 'Extracted Raw Content'}
              </span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={handleDownload}
                title="Export as Markdown"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>

            {summarizing ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <Sparkles size={28} style={{ color: '#818cf8', animation: 'pulse 1.5s infinite', margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>Processing with NVIDIA NIM...</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Extracting key insights and synthesizing concepts
                </p>
              </div>
            ) : viewMode === 'summary' ? (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {summaryText || (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                    Select a style above and click 'Regenerate Summary' to start.
                  </div>
                )}
              </div>
            ) : (
              <div>
                {currentDoc.is_image && currentDoc.has_image_preview && (
                  <div style={{ marginBottom: '14px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'black', textAlign: 'center' }}>
                    <img 
                      src={`/api/documents/${currentDoc.doc_id}/image`} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                      alt="Uploaded preview" 
                      style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} 
                    />
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                  {currentDoc.preview || currentDoc.extracted_text || 'No text extracted.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
