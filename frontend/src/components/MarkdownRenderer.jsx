import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-language">{language || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Parses inline bold, italics, and inline code
function renderInlineFormatted(text) {
  if (!text) return null;

  // Split by inline code, bold, italic
  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  // Pattern matches: `code`, **bold**, *italic*
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={keyIdx++} className="inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={keyIdx++} className="font-semibold text-emphasis">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={keyIdx++}>
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split into code blocks and normal text blocks
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const sections = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      sections.push({ type: 'text', text: content.substring(lastIndex, match.index) });
    }
    sections.push({ type: 'code', language: match[1], code: match[2].trimEnd() });
    lastIndex = codeBlockRegex.lastIndex;
  }
  if (lastIndex < content.length) {
    sections.push({ type: 'text', text: content.substring(lastIndex) });
  }

  return (
    <div className="markdown-content">
      {sections.map((section, sIdx) => {
        if (section.type === 'code') {
          return <CodeBlock key={sIdx} language={section.language} code={section.code} />;
        }

        // Parse lines in text section
        const lines = section.text.split('\n');
        const elements = [];
        let listItems = [];
        let listType = null; // 'ul' or 'ol'
        let elementKey = 0;

        const flushList = () => {
          if (listItems.length > 0 && listType) {
            if (listType === 'ul') {
              elements.push(
                <ul key={`list-${elementKey++}`} className="markdown-ul">
                  {listItems.map((item, i) => (
                    <li key={i} className="markdown-li">
                      {renderInlineFormatted(item)}
                    </li>
                  ))}
                </ul>
              );
            } else {
              elements.push(
                <ol key={`list-${elementKey++}`} className="markdown-ol">
                  {listItems.map((item, i) => (
                    <li key={i} className="markdown-li">
                      {renderInlineFormatted(item)}
                    </li>
                  ))}
                </ol>
              );
            }
            listItems = [];
            listType = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          // Empty line
          if (!trimmed) {
            flushList();
            continue;
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(
              <h3 key={`h3-${elementKey++}`} className="markdown-h3">
                {renderInlineFormatted(trimmed.slice(4))}
              </h3>
            );
            continue;
          }
          if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(
              <h2 key={`h2-${elementKey++}`} className="markdown-h2">
                {renderInlineFormatted(trimmed.slice(3))}
              </h2>
            );
            continue;
          }
          if (trimmed.startsWith('# ')) {
            flushList();
            elements.push(
              <h1 key={`h1-${elementKey++}`} className="markdown-h1">
                {renderInlineFormatted(trimmed.slice(2))}
              </h1>
            );
            continue;
          }

          // Bullet List: starts with `* `, `- `, or nested `  * `
          const bulletMatch = rawLine.match(/^(\s*)([*+-])\s+(.*)$/);
          if (bulletMatch) {
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(bulletMatch[3]);
            continue;
          }

          // Numbered List: starts with `1. `, `2. ` etc.
          const numberMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
          if (numberMatch) {
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(numberMatch[3]);
            continue;
          }

          // Blockquote: `> quote`
          if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(
              <blockquote key={`bq-${elementKey++}`} className="markdown-blockquote">
                {renderInlineFormatted(trimmed.slice(2))}
              </blockquote>
            );
            continue;
          }

          // Normal Paragraph
          flushList();
          elements.push(
            <p key={`p-${elementKey++}`} className="markdown-p">
              {renderInlineFormatted(rawLine)}
            </p>
          );
        }

        flushList();
        return <React.Fragment key={sIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
