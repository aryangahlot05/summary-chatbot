import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square, 
  Bot, 
  User, 
  Sparkles, 
  FileText, 
  Image as ImageIcon,
  Copy, 
  Check, 
  AlertCircle,
  Paperclip,
  X,
  RotateCcw
} from 'lucide-react';
import { sendChatMessage, uploadFile } from '../utils/api';
import MarkdownRenderer from './MarkdownRenderer';

const STARTER_PROMPTS = [
  {
    title: "Summarize Content",
    desc: "Extract core ideas, findings & takeaways",
    prompt: "Provide a comprehensive summary of this material, organized with clear headings and bulleted insights."
  },
  {
    title: "Extract Metrics & Data",
    desc: "Isolate numbers, dates, benchmarks & statistics",
    prompt: "List all key numerical figures, benchmark metrics, dates, and quantitative findings in this material."
  },
  {
    title: "Identify Key Takeaways",
    desc: "Top critical learnings and actionable insights",
    prompt: "Extract the top 5 to 7 key takeaways and critical learnings from this material in numbered format."
  },
  {
    title: "Executive Email Briefing",
    desc: "Draft a concise update for leadership",
    prompt: "Draft a concise 3-paragraph executive briefing email summarizing the core highlights and strategic implications."
  }
];

export default function ChatPanel({ 
  currentDoc, 
  onDocUploaded,
  onDocCleared,
  nimConfigured, 
  onOpenSettings,
  externalPrompt,
  onClearExternalPrompt
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll when messages change or stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Handle external prompts triggered from the Agent Sidebar
  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 180);
      textareaRef.current.style.height = `${Math.max(newHeight, 48)}px`;
    }
  }, [input]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isStreaming) return;

    setErrorMsg('');
    const userMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '48px';

    // Placeholder assistant message for streaming
    const assistantIndex = updatedMessages.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendChatMessage(
        updatedMessages,
        currentDoc?.doc_id || null,
        (token) => {
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantIndex]) {
              copy[assistantIndex] = {
                ...copy[assistantIndex],
                content: copy[assistantIndex].content + token
              };
            }
            return copy;
          });
        },
        abortController.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErrorMsg(err.message || 'Error communicating with assistant');
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[assistantIndex] && !copy[assistantIndex].content) {
            copy[assistantIndex].content = `⚠️ Could not complete response: ${err.message}`;
          }
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    // Find last user message
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;
    const historyUpToUser = messages.slice(0, lastUserIndex + 1);
    setMessages(historyUpToUser);
    
    // Trigger generation with that history
    const assistantIndex = historyUpToUser.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    sendChatMessage(
      historyUpToUser,
      currentDoc?.doc_id || null,
      (token) => {
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[assistantIndex]) {
            copy[assistantIndex] = {
              ...copy[assistantIndex],
              content: copy[assistantIndex].content + token
            };
          }
          return copy;
        });
      },
      abortController.signal
    ).catch((err) => {
      if (err.name !== 'AbortError') {
        setErrorMsg(err.message || 'Error communicating with assistant');
      }
    }).finally(() => {
      setIsStreaming(false);
      abortControllerRef.current = null;
    });
  };

  const handleCopyMessage = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingDoc(true);
      try {
        const data = await uploadFile(e.target.files[0]);
        onDocUploaded(data);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to upload document');
      } finally {
        setUploadingDoc(false);
      }
    }
  };

  return (
    <div className="chat-main-area">
      {/* Scrollable Messages Container with explicit bottom clearance */}
      <div className="chat-scroll-container">
        <div className="chat-content-width">
          {messages.length === 0 ? (
            /* Empty State: ChatGPT Hero Landing */
            <div className="chat-empty-state">
              <div className="chat-empty-icon-wrap">
                <Bot size={36} />
              </div>
              <h2 className="chat-empty-title">What can I help you analyze?</h2>
              <p className="chat-empty-subtitle">
                {currentDoc 
                  ? `Active knowledge grounded on "${currentDoc.filename}". Ask any questions or request summaries.`
                  : 'Attach a document or image to begin, or ask any question to get started.'
                }
              </p>

              <div className="chat-starter-grid">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    className="chat-starter-card"
                    onClick={() => handleSend(item.prompt)}
                  >
                    <div className="starter-card-title">{item.title}</div>
                    <div className="starter-card-desc">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="chat-messages-flow">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message-row ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? (
                      <div className="avatar-user">
                        <User size={16} />
                      </div>
                    ) : (
                      <div className="avatar-assistant">
                        <Bot size={16} />
                      </div>
                    )}
                  </div>

                  <div className="message-body">
                    <div className="message-sender-name">
                      {msg.role === 'user' ? 'You' : 'DocuMind Agent'}
                    </div>

                    <div className="message-text-content">
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <div className="typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      )}
                    </div>

                    {msg.role === 'assistant' && msg.content && (
                      <div className="message-actions-bar">
                        <button
                          className="msg-action-btn"
                          onClick={() => handleCopyMessage(msg.content, idx)}
                          title="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <Check size={14} style={{ color: '#10b981' }} />
                          ) : (
                            <Copy size={14} />
                          )}
                          <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                        </button>

                        {idx === messages.length - 1 && !isStreaming && (
                          <button
                            className="msg-action-btn"
                            onClick={handleRegenerate}
                            title="Regenerate response"
                          >
                            <RotateCcw size={14} />
                            <span>Regenerate</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {errorMsg && (
            <div className="chat-error-banner">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Spacer anchor to ensure full scroll visibility without collapsing */}
          <div ref={messagesEndRef} className="messages-bottom-anchor" />
        </div>
      </div>

      {/* Docked ChatGPT-style Input Container */}
      <div className="chat-dock-container">
        <div className="chat-dock-content">
          {/* Active Document Attachment Chip */}
          {currentDoc && (
            <div className="dock-attachment-pill">
              {currentDoc.is_image ? <ImageIcon size={13} /> : <FileText size={13} />}
              <span className="dock-attachment-name" title={currentDoc.filename}>
                {currentDoc.filename}
              </span>
              <button 
                className="dock-attachment-remove" 
                onClick={onDocCleared}
                title="Detach document"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="dock-input-box">
            {/* Attachment Button */}
            <button
              type="button"
              className="dock-action-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach document or image"
              disabled={uploadingDoc || isStreaming}
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
              onChange={handleFileAttach}
            />

            {/* Auto-expanding Input Area */}
            <textarea
              ref={textareaRef}
              className="dock-textarea"
              placeholder={
                currentDoc 
                  ? `Ask questions about ${currentDoc.filename}...`
                  : "Attach a document or image to ask questions..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
            />

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button 
                type="button"
                className="dock-submit-btn stop"
                onClick={handleStopStream}
                title="Stop generation"
              >
                <Square size={14} />
              </button>
            ) : (
              <button 
                type="button"
                className={`dock-submit-btn send ${input.trim() ? 'active' : ''}`}
                onClick={() => handleSend()}
                disabled={!input.trim()}
                title="Send message"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>

          <div className="dock-disclaimer">
            DocuMind AI • Document & Image Intelligence powered by NVIDIA NIM
          </div>
        </div>
      </div>
    </div>
  );
}
