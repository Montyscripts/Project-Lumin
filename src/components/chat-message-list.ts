import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { AgentStatusSchema, parseStructuredStatus } from '../types/status-schema';

export interface ChatMessage {
  speaker: 'user' | 'ai';
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'file';
  attachmentName?: string;
  audioBlobUrl?: string;
  voiceName?: string;
  citations?: Array<{ title: string; url: string }>;
  responseTime?: number;
  isLoading?: boolean;
  statusSchema?: AgentStatusSchema;
}

@customElement('lumin-chat-message-list')
export class LuminChatMessageList extends LitElement {
  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: String }) userName = 'You';
  @property({ type: String }) systemName = 'LUMIN';
  @property({ type: String }) userAvatar = 'U';
  @property({ type: String }) systemAvatar = 'S';
  @property({ type: String }) chatFontSize = 'default';
  @property({ type: Boolean }) chatFontBold = false;
  @property({ type: Number }) playingIndex: number | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 24px 32px;
      box-sizing: border-box;
      font-family: inherit;
      scroll-behavior: smooth;
    }

    @media (max-width: 768px) {
      :host {
        padding: 16px 14px;
      }
    }

    :host::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    :host::-webkit-scrollbar-track {
      background: transparent;
    }
    :host::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    :host::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .message-container {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .conversation-start-pill {
      align-self: center;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      font-size: 0.72rem;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
      user-select: none;
    }

    .conversation-start-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 6px #38bdf8;
    }

    .message-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      opacity: 0;
      transform: translateY(8px);
      animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 100%;
      box-sizing: border-box;
      position: relative;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* USER MESSAGE: Distinct sleek right-aligned card */
    .message-item.user {
      align-self: flex-end;
      align-items: flex-end;
      max-width: 82%;
    }

    .message-item.user .message-header {
      color: #38bdf8;
      flex-direction: row-reverse;
      gap: 8px;
    }

    .message-item.user .message-bubble {
      align-self: flex-end;
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.22) 0%, rgba(14, 116, 144, 0.14) 100%);
      border: 1px solid rgba(56, 189, 248, 0.42);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), 0 0 12px rgba(0, 170, 255, 0.08);
      border-radius: 18px 18px 4px 18px;
      padding: 13px 19px;
      color: #ffffff;
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
      line-height: 1.65;
    }

    /* AI / LUMIN MESSAGE: Deep structured card with cyan left accent */
    .message-item.ai {
      align-self: flex-start;
      align-items: flex-start;
      max-width: 100%;
      width: 100%;
    }

    .message-item.ai .message-header {
      color: #cbd5e1;
      width: 100%;
      justify-content: space-between;
    }

    .message-item.ai .message-bubble {
      align-self: flex-start;
      background: rgba(13, 17, 26, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 3px solid var(--glow-color, #00aaff);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
      border-radius: 4px 16px 16px 16px;
      padding: 20px 26px;
      width: 100%;
      max-width: 100%;
      color: #e2e8f0;
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
      overflow-x: auto;
      box-sizing: border-box;
    }

    .message-header {
      display: flex;
      align-items: center;
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.4px;
      user-select: none;
      padding: 0 4px;
    }

    .speaker-tag {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .speaker-name {
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      object-fit: cover;
      flex-shrink: 0;
    }

    .avatar.user {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      border: 1px solid #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
    }

    .avatar.ai {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.12));
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 0 10px rgba(0, 170, 255, 0.2);
    }

    .message-bubble {
      box-sizing: border-box;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.68;
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
      transition: box-shadow 0.2s ease;
    }

    .message-container {
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
    }

    .message-container .markdown-body p,
    .message-container .markdown-body li,
    .message-container .markdown-body ul,
    .message-container .markdown-body ol {
      font-size: var(--chat-font-size, inherit);
      font-weight: var(--chat-font-weight, inherit);
    }

    /* TYPOGRAPHY & MARKDOWN STYLING */
    .markdown-body {
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.72;
      color: inherit;
    }

    .markdown-body p {
      margin: 0 0 0.9em 0;
      line-height: 1.72;
      color: #e2e8f0;
    }

    .markdown-body p:first-child {
      margin-top: 0;
    }

    .markdown-body p:last-child {
      margin-bottom: 0;
    }

    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
      color: #ffffff;
      font-weight: 700;
      line-height: 1.35;
      margin: 1.3em 0 0.45em 0;
    }

    .markdown-body h1:first-child, .markdown-body h2:first-child, .markdown-body h3:first-child {
      margin-top: 0;
    }

    .markdown-body h1 {
      font-size: 1.38em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-bottom: 0.35em;
    }

    .markdown-body h2 {
      font-size: 1.22em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.25em;
    }

    .markdown-body h3 {
      font-size: 1.1em;
      color: #38bdf8;
    }

    .markdown-body h4 {
      font-size: 0.98em;
      color: #cbd5e1;
    }

    .markdown-body strong, .markdown-body b {
      color: #ffffff;
      font-weight: 600;
    }

    .markdown-body em, .markdown-body i {
      color: #cbd5e1;
    }

    /* Inline Code Pill */
    .markdown-body code:not(pre code) {
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.28);
      color: #38bdf8;
      padding: 0.16em 0.45em;
      border-radius: 4px;
      font-size: 0.88em;
      font-weight: 500;
      word-break: break-word;
    }

    /* CODE BLOCKS & SYNTAX HIGHLIGHTING */
    .markdown-body pre {
      background: #080c14;
      padding: 40px 20px 18px 20px;
      border-radius: 12px;
      overflow-x: auto;
      max-width: 100%;
      box-sizing: border-box;
      margin: 1.3em 0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      white-space: pre;
      word-break: normal;
      position: relative;
    }

    .markdown-body pre::-webkit-scrollbar {
      height: 6px;
    }
    .markdown-body pre::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    .markdown-body pre::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 3px;
    }

    .markdown-body pre code {
      background: transparent;
      border: none;
      padding: 0;
      border-radius: 0;
      color: #f1f5f9;
      font-size: 0.88rem;
      line-height: 1.6;
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace;
      font-weight: 400;
      tab-size: 2;
    }

    /* Code Block Header Overlay */
    .code-block-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 32px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      border-top-left-radius: 11px;
      border-top-right-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      user-select: none;
      z-index: 5;
    }

    .code-window-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .code-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .code-dot.red { background: #ef4444; opacity: 0.85; }
    .code-dot.yellow { background: #f59e0b; opacity: 0.85; }
    .code-dot.green { background: #10b981; opacity: 0.85; }

    .code-lang-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-left: 8px;
    }

    .code-copy-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 2px 8px;
      font-size: 0.72rem;
      font-weight: 600;
      font-family: system-ui, sans-serif;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .code-copy-btn:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.35);
      color: #38bdf8;
    }

    /* SYNTAX TOKEN COLORING */
    .hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-doctag { color: #c678dd; font-weight: 600; }
    .hljs-string, .hljs-title.class_ { color: #98c379; }
    .hljs-number, .hljs-literal, .hljs-boolean { color: #d19a66; }
    .hljs-title.function_, .hljs-function, .hljs-attr, .hljs-property { color: #61afef; }
    .hljs-comment, .hljs-quote { color: #64748b; font-style: italic; }
    .hljs-type, .hljs-class, .hljs-name { color: #e5c07b; }
    .hljs-variable, .hljs-template-variable { color: #e06c75; }
    .hljs-punctuation, .hljs-operator { color: #abb2bf; }
    .hljs-meta, .hljs-tag { color: #5c6370; }

    /* Lists */
    .markdown-body ul, .markdown-body ol {
      margin: 0.5em 0 1em 0;
      padding-left: 1.6em;
    }

    .markdown-body li {
      margin-bottom: 0.45em;
      line-height: 1.65;
      color: #e2e8f0;
    }

    .markdown-body ul > li::marker {
      color: #38bdf8;
    }

    .markdown-body ol > li::marker {
      color: #38bdf8;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Blockquotes */
    .markdown-body blockquote {
      margin: 1.2em 0;
      padding: 10px 18px;
      background: rgba(0, 170, 255, 0.06);
      border-left: 3px solid var(--glow-color, #00aaff);
      border-radius: 0 10px 10px 0;
      color: #cbd5e1;
      font-style: italic;
    }

    .markdown-body blockquote p {
      margin: 0;
    }

    /* Tables */
    .markdown-body table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 1.3em 0;
      font-size: 0.88em;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      overflow: hidden;
    }

    .markdown-body th, .markdown-body td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      padding: 9px 14px;
      text-align: left;
    }

    .markdown-body th:last-child, .markdown-body td:last-child {
      border-right: none;
    }

    .markdown-body tr:last-child td {
      border-bottom: none;
    }

    .markdown-body th {
      background: rgba(15, 23, 42, 0.9);
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 0.4px;
    }

    .markdown-body tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }

    .markdown-body a {
      color: #38bdf8;
      text-decoration: none;
      border-bottom: 1px dashed rgba(56, 189, 248, 0.4);
      transition: color 0.15s, border-color 0.15s;
    }

    .markdown-body a:hover {
      text-decoration: none;
      color: #7dd3fc;
      border-bottom-style: solid;
    }

    .status-card {
      margin-top: 14px;
      padding: 12px 16px;
      border-radius: 8px;
      background: rgba(8, 12, 20, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      font-size: 0.82rem;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    .status-badge.completed { background: rgba(52, 199, 89, 0.2); color: #34c759; border: 1px solid rgba(52, 199, 89, 0.4); }
    .status-badge.running { background: rgba(0, 170, 255, 0.2); color: #00aaff; border: 1px solid rgba(0, 170, 255, 0.4); }
    .status-badge.failed { background: rgba(255, 59, 48, 0.2); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.4); }

    .meta-time {
      font-size: 0.72rem;
      opacity: 0.85;
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 7px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-variant-numeric: tabular-nums;
      font-family: 'JetBrains Mono', monospace;
    }

    .msg-copy-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .msg-copy-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
    }

    .media-attachment {
      max-width: 320px;
      max-height: 220px;
      border-radius: 8px;
      margin-top: 10px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* Thinking / Working Indicator Inside Message Bubble */
    .thinking-bubble {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 18px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85));
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(56, 189, 248, 0.15);
    }

    .thinking-spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin-thinking 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin-thinking {
      to { transform: rotate(360deg); }
    }

    .thinking-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .thinking-label {
      font-size: 0.84rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.4px;
    }

    .thinking-subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .thinking-wave {
      display: inline-flex;
      gap: 3px;
      align-items: center;
    }

    .thinking-wave span {
      width: 4px;
      height: 4px;
      background-color: #38bdf8;
      border-radius: 50%;
      animation: wave-dots 1.2s infinite ease-in-out;
    }

    .thinking-wave span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-wave span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes wave-dots {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.2); opacity: 1; }
    }
  `;

  updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    this.addCodeCopyButtons();
  }

  private addCodeCopyButtons() {
    const preElements = this.shadowRoot?.querySelectorAll('pre');
    preElements?.forEach((pre) => {
      if (pre.querySelector('.code-block-header')) return;
      pre.style.position = 'relative';

      const codeEl = pre.querySelector('code');
      let lang = 'CODE';
      if (codeEl) {
        for (const cls of Array.from(codeEl.classList)) {
          if (cls.startsWith('language-') || cls.startsWith('hljs-')) {
            const raw = cls.replace('language-', '').replace('hljs-', '');
            if (raw && raw !== 'plaintext' && raw !== 'undefined') {
              lang = raw.toUpperCase();
              break;
            }
          }
        }
      }

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <div class="code-window-dots">
          <span class="code-dot red"></span>
          <span class="code-dot yellow"></span>
          <span class="code-dot green"></span>
          <span class="code-lang-tag">${lang}</span>
        </div>
        <button class="code-copy-btn" title="Copy code block">
          <svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 0 24 24" width="12px" fill="currentColor">
            <rect fill="none" height="24" width="24"/>
            <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
          </svg>
          Copy
        </button>
      `;

      const copyBtn = header.querySelector('.code-copy-btn');
      copyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const codeText = codeEl?.innerText || pre.innerText;
        navigator.clipboard.writeText(codeText).then(() => {
          if (copyBtn) {
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 0 24 24" width="12px" fill="#34d399">
                <path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              <span style="color: #34d399;">Copied!</span>
            `;
            setTimeout(() => {
              if (copyBtn) {
                copyBtn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 0 24 24" width="12px" fill="currentColor">
                    <rect fill="none" height="24" width="24"/>
                    <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
                  </svg>
                  Copy
                `;
              }
            }, 2000);
          }
        });
      });

      pre.insertBefore(header, pre.firstChild);
    });
  }

  render() {
    return html`
      <div class="message-container">
        ${this.messages.length > 0 ? html`
          <div class="conversation-start-pill">
            <span class="dot"></span>
            <span>Session Initialized • LUMIN Active</span>
          </div>
        ` : ''}
        ${this.messages.map((msg, index) => this.renderMessage(msg, index))}
      </div>
    `;
  }

  private renderMessageText(text: string) {
    if (!text) return '';
    try {
      const rawHtml = marked.parse(text) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
      return html`<div class="markdown-body">${unsafeHTML(cleanHtml)}</div>`;
    } catch {
      return html`<div class="markdown-body"><p>${text}</p></div>`;
    }
  }

  private renderMessage(msg: ChatMessage, index: number) {
    const isUser = msg.speaker === 'user';
    const statusSchema = msg.statusSchema || parseStructuredStatus(msg.text);

    return html`
      <div class="message-item ${isUser ? 'user' : 'ai'}">
        <div class="message-header">
          ${this.renderAvatar(isUser)}
          <span>${isUser ? this.userName : this.systemName}</span>
          ${msg.responseTime !== undefined ? html`<span class="meta-time">${msg.responseTime.toFixed(1)}s</span>` : ''}
          ${msg.text ? html`
            <button
              class="msg-copy-btn"
              @click=${() => navigator.clipboard.writeText(msg.text)}
              title="Copy Message Text"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="13px" viewBox="0 0 24 24" width="13px" fill="currentColor">
                <rect fill="none" height="24" width="24"/>
                <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
              </svg>
            </button>
          ` : ''}
        </div>

        <div class="message-bubble">
          ${msg.isLoading ? html`
            <div class="thinking-bubble">
              <div class="thinking-spinner"></div>
              <div class="thinking-text-group">
                <div class="thinking-label">
                  <span>Thinking</span>
                  <div class="thinking-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div class="thinking-subtitle">Synthesizing response and executing steps...</div>
              </div>
            </div>
          ` : (isUser ? html`<div>${msg.text}</div>` : this.renderMessageText(msg.text))}

          ${msg.attachmentUrl ? this.renderAttachment(msg) : ''}

          ${statusSchema ? this.renderStatusCard(statusSchema) : ''}
        </div>
      </div>
    `;
  }

  private renderAvatar(isUser: boolean) {
    const avatar = isUser ? this.userAvatar : this.systemAvatar;
    const isImg = avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('blob:');
    if (isImg) {
      return html`<img class="avatar ${isUser ? 'user' : 'ai'}" src="${avatar}" alt="Avatar" />`;
    }
    return html`<div class="avatar ${isUser ? 'user' : 'ai'}">${avatar}</div>`;
  }

  private renderAttachment(msg: ChatMessage) {
    if (msg.attachmentType === 'image') {
      return html`<img class="media-attachment" src="${msg.attachmentUrl}" alt="${msg.attachmentName || 'Attachment'}" />`;
    }
    if (msg.attachmentType === 'video') {
      return html`<video class="media-attachment" controls src="${msg.attachmentUrl}"></video>`;
    }
    return html`<div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 0.85rem;">📎 ${msg.attachmentName || 'File'}</div>`;
  }

  private renderStatusCard(status: AgentStatusSchema) {
    const statusClass = (status.status || 'running').toLowerCase();
    return html`
      <div class="status-card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span class="status-badge ${statusClass}">${status.status || 'Active'}</span>
          ${status.tool_name ? html`<span>Tool: <strong>${status.tool_name}</strong></span>` : ''}
        </div>
        ${status.completed ? html`<div>Completed: ${Array.isArray(status.completed) ? status.completed.join(', ') : status.completed}</div>` : ''}
        ${status.failed ? html`<div>Failed: ${Array.isArray(status.failed) ? status.failed.join(', ') : status.failed}</div>` : ''}
        ${status.next_action ? html`<div>Next: ${status.next_action}</div>` : ''}
        ${status.error ? html`<div style="color: #ff3b30;">Error: ${status.error}</div>` : ''}
      </div>
    `;
  }
}
