import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref, createRef, Ref } from 'lit/directives/ref.js';

export type TerminalDockPosition = 'bottom' | 'right' | 'left';
export type TerminalLogFilter = 'all' | 'agent' | 'tools' | 'errors';

export interface MetaCommandItem {
  name: string;
  command: string;
  category: 'System' | 'Models' | 'Voice' | 'Safety' | 'Workspace';
  description: string;
  icon: string;
}

export const LUMIN_META_COMMANDS: MetaCommandItem[] = [
  { name: 'System Help', command: 'help', category: 'System', description: 'Show all controller meta-commands and syntax', icon: '❓' },
  { name: 'System Status', command: 'status', category: 'System', description: 'Check system diagnostics, models, security & TTS', icon: '📊' },
  { name: 'Hardware Profile', command: 'hardware', category: 'System', description: 'Inspect CPU, GPU, RAM and platform compute', icon: '💻' },
  { name: 'List Ollama Models', command: 'models', category: 'Models', description: 'Scan and list all installed local Ollama models', icon: '🤖' },
  { name: 'Auto Route Model', command: 'model auto', category: 'Models', description: 'Restore automatic hybrid task-based model selection', icon: '⚡' },
  { name: 'List Neural Voices', command: 'voice list', category: 'Voice', description: 'List all supported multi-lingual Edge-TTS voices', icon: '🎙️' },
  { name: 'Voice Mode Toggle', command: 'mode', category: 'Voice', description: 'Toggle interactive input between Type and Voice STT', icon: '🔊' },
  { name: 'Enable TTS Spoken Audio', command: 'tts on', category: 'Voice', description: 'Enable spoken voice response audio', icon: '🗣️' },
  { name: 'Disable TTS Audio', command: 'tts off', category: 'Voice', description: 'Switch agent responses to silent text-only mode', icon: '🔇' },
  { name: 'Wipe Short-Term Memory', command: 'forget', category: 'System', description: 'Clear conversation context buffer and working memory', icon: '🧹' },
  { name: 'Toggle Dry-Run Mode', command: 'dryrun on', category: 'Safety', description: 'Simulate system commands without modifying disk', icon: '🛡️' },
  { name: 'Disable Dry-Run', command: 'dryrun off', category: 'Safety', description: 'Enable live disk execution for system operations', icon: '⚙️' },
  { name: 'Auto-Approve Commands', command: 'auto on', category: 'Safety', description: 'Skip interactive confirmation for standard tool steps', icon: '⏩' },
  { name: 'Prompt Approvals', command: 'auto off', category: 'Safety', description: 'Require explicit user approval for tool executions', icon: '✋' },
  { name: 'List Workspace Files', command: 'dir', category: 'Workspace', description: 'Inspect current directory structure and documents', icon: '📁' },
  { name: 'Clear Console Screen', command: 'clear', category: 'System', description: 'Clear terminal screen display buffer', icon: '🗑️' }
];

@customElement('lumin-terminal-panel')
export class LuminTerminalPanel extends LitElement {
  @property({ type: String }) terminalLogs = '';
  @property({ type: Boolean }) isAgentRunning = false;
  @property({ type: Boolean }) isStartingAgent = false;
  @property({ type: Boolean }) isStoppingAgent = false;
  @property({ type: Boolean }) isVoiceActive = false;
  @property({ type: Number }) fontSize = 13;
  @property({ type: Boolean }) isBold = false;
  @property({ type: String }) dockPosition: TerminalDockPosition = 'bottom';
  @property({ type: Boolean }) isCollapsed = false;
  @property({ type: Number }) panelHeight = 260;
  @property({ type: Number }) panelWidth = 420;
  @property({ type: Boolean }) isConnected = true;

  @state() private inputValue = '';
  @state() private showMetaMenu = false;
  @state() private metaSearchQuery = '';
  @state() private selectedCategory: string = 'All';
  @state() private activeFilter: TerminalLogFilter = 'all';
  @state() private autoScroll = true;
  @state() private showCopyToast = false;
  @state() private isDraggingResizer = false;
  @state() private isDraggingWindow = false;

  private screenRef: Ref<HTMLDivElement> = createRef();
  private inputRef: Ref<HTMLInputElement> = createRef();
  private commandHistory: string[] = [];
  private historyIndex = -1;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--background-secondary, rgba(10, 10, 14, 0.94));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: var(--text-primary, #e2e8f0);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      box-sizing: border-box;
      position: relative;
      user-select: text;
      overflow: hidden;
    }

    :host([dock='bottom']) {
      width: 100%;
      max-height: 48vh;
      min-height: 120px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      box-shadow: var(--lumin-shadow-lg, 0 -8px 24px rgba(0, 0, 0, 0.5));
    }

    :host([dock='right']) {
      height: 100%;
      max-width: 55vw;
      min-width: 390px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      box-shadow: var(--lumin-shadow-lg, -8px 0 24px rgba(0, 0, 0, 0.5));
    }

    :host([dock='left']) {
      height: 100%;
      max-width: 55vw;
      min-width: 390px;
      flex-shrink: 0;
      box-sizing: border-box;
      border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      box-shadow: var(--lumin-shadow-lg, 8px 0 24px rgba(0, 0, 0, 0.5));
    }

    /* Terminal Header */
    .terminal-header {
      padding: 5px 8px;
      background: var(--background-surface, rgba(15, 20, 34, 0.98));
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      flex-shrink: 0;
      user-select: none;
      min-width: 0;
      box-sizing: border-box;
      width: 100%;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
    }

    .window-dots {
      display: flex;
      gap: 5px;
      align-items: center;
      flex-shrink: 0;
    }

    .dot-btn {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: transform 0.15s, opacity 0.15s;
      outline: none;
      flex-shrink: 0;
    }
    .dot-btn:hover {
      transform: scale(1.2);
    }
    .dot-btn.close { background: #ff5f56; }
    .dot-btn.minimize { background: #ffbd2e; }
    .dot-btn.maximize { background: #27c93f; }

    .terminal-title-group {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
    }

    .terminal-title {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .terminal-title svg {
      color: var(--glow-color, #00aaff);
      flex-shrink: 0;
    }

    .title-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      flex-shrink: 1;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.58rem;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .status-badge.online {
      background: rgba(39, 201, 63, 0.15);
      color: #4ade80;
      border: 1px solid rgba(39, 201, 63, 0.3);
    }
    .status-badge.starting {
      background: rgba(250, 204, 21, 0.15);
      color: #fde047;
      border: 1px solid rgba(250, 204, 21, 0.3);
    }
    .status-badge.offline {
      background: rgba(148, 163, 184, 0.15);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }

    .status-indicator-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: currentColor;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      margin-left: auto;
      min-width: 0;
    }

    .header-btn-group {
      display: flex;
      align-items: center;
      gap: 1px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      padding: 1px;
      flex-shrink: 0;
    }

    .icon-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      padding: 2px 5px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.66rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      transition: all 0.14s ease;
      outline: none;
      flex-shrink: 0;
      box-sizing: border-box;
      height: 22px;
      min-width: 22px;
    }
    .icon-btn.sm {
      padding: 2px 4px;
      min-width: 19px;
      height: 20px;
      font-size: 0.62rem;
      border: none;
      background: transparent;
    }
    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .icon-btn.active {
      background: rgba(0, 170, 255, 0.2);
      border-color: rgba(0, 170, 255, 0.5);
      color: #38bdf8;
    }

    .meta-commands-btn {
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.2), rgba(168, 85, 247, 0.2));
      border: 1px solid rgba(0, 170, 255, 0.4);
      color: #38bdf8;
      font-weight: 700;
      padding: 2px 6px;
      font-size: 0.66rem;
      height: 22px;
    }
    .meta-commands-btn:hover {
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.35), rgba(168, 85, 247, 0.35));
      border-color: #38bdf8;
      color: #ffffff;
    }

    .close-btn:hover {
      color: #f43f5e;
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.3);
    }

    /* Dock selector buttons */
    .dock-group {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 1px;
      flex-shrink: 0;
      gap: 1px;
    }
    .dock-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 2px 4px;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.14s ease;
      height: 20px;
      min-width: 18px;
      flex-shrink: 0;
    }
    .dock-btn:hover {
      color: #ffffff;
    }
    .dock-btn:active {
      transform: scale(0.95);
    }

    /* Sub-Header Filter Bar */
    .terminal-sub-toolbar {
      padding: 4px 10px;
      background: #090c14;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
      box-sizing: border-box;
      width: 100%;
    }

    .filter-pills-row {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .filter-pills-row::-webkit-scrollbar {
      display: none;
    }

    .filter-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94a3b8;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.14s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .filter-btn:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.05);
    }
    .filter-btn.active {
      background: rgba(0, 170, 255, 0.18);
      border-color: rgba(0, 170, 255, 0.45);
      color: #38bdf8;
      font-weight: 700;
    }

    .log-count-indicator {
      font-size: 0.62rem;
      color: #64748b;
      font-family: var(--font-mono, monospace);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Terminal Screen */
    .terminal-screen {
      flex: 1;
      padding: 12px 14px;
      overflow-y: auto;
      overflow-x: auto;
      line-height: 1.5;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 80px;
    }

    .terminal-screen::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .terminal-screen::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    .terminal-screen::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
    }
    .terminal-screen::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Log styling helper classes */
    .log-line {
      margin-bottom: 2px;
    }
    .log-system { color: #38bdf8; }
    .log-agent { color: #c084fc; }
    .log-tool { color: #facc15; }
    .log-success { color: #4ade80; }
    .log-error { color: #f87171; }
    .log-warning { color: #fb923c; }
    .log-dim { color: #64748b; }
    .log-command { color: #22d3ee; font-weight: 700; }

    /* Input row */
    .input-row {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: rgba(14, 14, 20, 0.96);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      gap: 8px;
      flex-shrink: 0;
    }
    .input-row.voice-active {
      background: rgba(39, 201, 63, 0.1);
      border-top-color: #27c93f;
    }

    .prompt-label {
      color: var(--glow-color, #00aaff);
      font-weight: 700;
      font-size: 0.8rem;
      user-select: none;
      flex-shrink: 0;
    }

    .terminal-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-family: inherit;
      font-size: 0.8rem;
      padding: 2px 0;
    }
    .terminal-input::placeholder {
      color: #64748b;
    }

    .voice-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .voice-btn:hover {
      color: #38bdf8;
      background: rgba(255, 255, 255, 0.06);
    }
    .voice-btn.active {
      color: #4ade80;
      background: rgba(39, 201, 63, 0.2);
    }

    /* Action bar / Footer */
    .action-bar {
      padding: 6px 12px;
      background: rgba(12, 12, 18, 0.98);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #94a3b8;
      user-select: none;
      flex-shrink: 0;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .link-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #64748b;
    }
    .dot.active {
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
    }
    .dot.starting {
      background: #facc15;
      box-shadow: 0 0 6px #facc15;
    }

    .status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-btn {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      transition: all 0.15s;
    }
    .action-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .action-btn.start {
      background: rgba(39, 201, 63, 0.15);
      border-color: rgba(39, 201, 63, 0.35);
      color: #4ade80;
    }
    .action-btn.start:hover:not(:disabled) {
      background: rgba(39, 201, 63, 0.28);
      border-color: #4ade80;
    }
    .action-btn.stop {
      background: rgba(248, 113, 113, 0.15);
      border-color: rgba(248, 113, 113, 0.35);
      color: #f87171;
    }
    .action-btn.stop:hover:not(:disabled) {
      background: rgba(248, 113, 113, 0.28);
      border-color: #f87171;
    }
    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Meta-Commands Flyout / Popover */
    .meta-popover {
      position: absolute;
      bottom: 45px;
      right: 12px;
      width: 360px;
      max-height: 380px;
      background: rgba(18, 18, 26, 0.98);
      border: 1px solid rgba(0, 170, 255, 0.3);
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 170, 255, 0.15);
      backdrop-filter: blur(16px);
      z-index: 100;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: popover-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popover-enter {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .meta-popover-header {
      padding: 10px 12px;
      background: rgba(24, 24, 36, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .meta-popover-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-search-input {
      padding: 8px 12px;
      background: var(--background-surface, #131722);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
      border-radius: var(--lumin-radius-md, 8px);
      color: #ffffff;
      font-family: inherit;
      font-size: 0.78rem;
      margin: 8px 12px 6px 12px;
      outline: none;
      transition: all 0.18s ease;
    }
    .meta-search-input:focus {
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 0 1px var(--glow-color, #00aaff), 0 0 12px var(--glow-color-faded, rgba(0, 170, 255, 0.25));
      background: #0d121f;
    }

    .meta-categories {
      display: flex;
      gap: 6px;
      padding: 4px 12px 8px 12px;
      overflow-x: auto;
    }
    .category-chip {
      padding: 4px 10px;
      border-radius: var(--lumin-radius-sm, 6px);
      font-size: 0.70rem;
      font-weight: 600;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      background: rgba(255, 255, 255, 0.03);
      color: #94a3b8;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      outline: none;
    }
    .category-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
      border-color: rgba(255, 255, 255, 0.18);
    }
    .category-chip.active {
      background: var(--glow-color-subtle, rgba(0, 170, 255, 0.18));
      border-color: var(--glow-color, #00aaff);
      color: var(--glow-color, #38bdf8);
      box-shadow: 0 0 8px var(--glow-color-faded, rgba(0, 170, 255, 0.2));
    }

    .meta-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px 12px 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-item {
      padding: 6px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.15s;
    }
    .meta-item:hover {
      background: rgba(0, 170, 255, 0.12);
      border-color: rgba(0, 170, 255, 0.3);
      transform: translateX(2px);
    }

    .meta-item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .meta-item-name {
      font-size: 0.74rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .meta-item-desc {
      font-size: 0.66rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-item-cmd {
      font-size: 0.68rem;
      font-family: monospace;
      color: #38bdf8;
      background: rgba(0, 170, 255, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* Copy toast */
    .toast-alert {
      position: absolute;
      top: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(39, 201, 63, 0.95);
      color: #000;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 110;
      animation: fade-in-out 1.5s forwards;
    }

    @keyframes fade-in-out {
      0% { opacity: 0; transform: translate(-50%, -6px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      85% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -6px); }
    }
  `;

  render() {
    const filteredLogs = this.getFilteredLogs(this.terminalLogs);
    const categories = ['All', 'System', 'Models', 'Voice', 'Safety', 'Workspace'];
    const filteredMeta = LUMIN_META_COMMANDS.filter((cmd) => {
      const matchCat = this.selectedCategory === 'All' || cmd.category === this.selectedCategory;
      const matchSearch = !this.metaSearchQuery || 
        cmd.name.toLowerCase().includes(this.metaSearchQuery.toLowerCase()) ||
        cmd.command.toLowerCase().includes(this.metaSearchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(this.metaSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    return html`
      <!-- Terminal Header Bar -->
      <div 
        class="terminal-header"
        @mousedown=${this.handleHeaderMouseDown}
      >
        <div class="header-left">
          <div class="window-dots">
            <button type="button" class="dot-btn close" title="Hide Terminal Panel" @click=${this.handleClose}></button>
            <button type="button" class="dot-btn minimize" title="${this.isCollapsed ? 'Expand Terminal' : 'Collapse Terminal'}" @click=${this.handleToggleCollapse}></button>
            <button type="button" class="dot-btn maximize" title="Switch Dock Side (Left / Right)" @click=${() => this.handleDockChange(this.dockPosition === 'right' ? 'left' : 'right')}></button>
          </div>

          <div class="terminal-title-group">
            <span class="terminal-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              <span class="title-text">DEVELOPER CONSOLE</span>
            </span>

            <span class="status-badge ${this.isAgentRunning ? 'online' : this.isStartingAgent ? 'starting' : 'offline'}">
              <span class="status-indicator-dot"></span>
              ${this.isAgentRunning ? 'ONLINE' : this.isStartingAgent ? 'STARTING...' : 'OFFLINE'}
            </span>
          </div>
        </div>

        ${!this.isCollapsed ? html`
          <div class="header-right">
            <!-- Meta Commands Quick Launcher Trigger -->
            <button 
              type="button"
              class="icon-btn meta-commands-btn ${this.showMetaMenu ? 'active' : ''}" 
              @click=${() => { this.showMetaMenu = !this.showMetaMenu; }}
              title="Open Meta-Commands Menu (help, status, models, tts, etc.)"
            >
              ⚡ Commands
            </button>

            <!-- Text Size Controls -->
            <div class="header-btn-group font-group">
              <button type="button" class="icon-btn sm" @click=${() => this.emit('adjust-font-size', { delta: -1 })} title="Decrease font size">A-</button>
              <button type="button" class="icon-btn sm" @click=${() => this.emit('adjust-font-size', { delta: 1 })} title="Increase font size">A+</button>
              <button type="button" class="icon-btn sm ${this.isBold ? 'active' : ''}" @click=${() => this.emit('toggle-bold')} title="Toggle Bold Text"><b>B</b></button>
            </div>

            <!-- Log Actions -->
            <div class="header-btn-group">
              <button type="button" class="icon-btn" @click=${this.handleCopyLogs} title="Copy all console output">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button type="button" class="icon-btn" @click=${() => this.emit('clear-logs')} title="Clear console buffer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>

            <!-- Dock Mode Picker -->
            <div class="dock-group" title="Dock console to Bottom, Right, or Left">
              <button type="button" class="dock-btn ${this.dockPosition === 'bottom' ? 'active' : ''}" @click=${() => this.handleDockChange('bottom')} title="Dock to Bottom">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
              </button>
              <button type="button" class="dock-btn ${this.dockPosition === 'right' ? 'active' : ''}" @click=${() => this.handleDockChange('right')} title="Dock to Right">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
              </button>
              <button type="button" class="dock-btn ${this.dockPosition === 'left' ? 'active' : ''}" @click=${() => this.handleDockChange('left')} title="Dock to Left">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
            </div>

            <!-- Hide Panel -->
            <button type="button" class="icon-btn close-btn" @click=${this.handleClose} title="Hide Console">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Sub-Header Filter Bar -->
      ${!this.isCollapsed ? html`
        <div class="terminal-sub-toolbar">
          <div class="filter-pills-row">
            <button 
              type="button"
              class="filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" 
              @click=${() => { this.activeFilter = 'all'; }}
              title="Show all system and agent logs"
            >
              All Logs
            </button>
            <button 
              type="button"
              class="filter-btn ${this.activeFilter === 'agent' ? 'active' : ''}" 
              @click=${() => { this.activeFilter = 'agent'; }}
              title="Filter to Agent cognitive flow & thinking"
            >
              Agent
            </button>
            <button 
              type="button"
              class="filter-btn ${this.activeFilter === 'tools' ? 'active' : ''}" 
              @click=${() => { this.activeFilter = 'tools'; }}
              title="Filter to Tool invocations and file actions"
            >
              Tools
            </button>
            <button 
              type="button"
              class="filter-btn ${this.activeFilter === 'errors' ? 'active' : ''}" 
              @click=${() => { this.activeFilter = 'errors'; }}
              title="Filter to Warnings and Errors"
            >
              Errors
            </button>
          </div>

          <div class="log-count-indicator">
            ${filteredLogs ? 'STREAM ACTIVE' : 'STANDBY'}
          </div>
        </div>
      ` : ''}

      <!-- Main Terminal Body (Hidden if collapsed) -->
      ${!this.isCollapsed ? html`
        <!-- Toast feedback -->
        ${this.showCopyToast ? html`<div class="toast-alert">✓ Console logs copied to clipboard</div>` : ''}

        <!-- Output Log Stream -->
        <div 
          class="terminal-screen" 
          ${ref(this.screenRef)}
          style="font-size: ${this.fontSize}px; font-weight: ${this.isBold ? '700' : 'normal'};"
        >
          ${unsafeHTML(filteredLogs)}
        </div>

        <!-- Input Row -->
        <div class="input-row ${this.isVoiceActive ? 'voice-active' : ''}">
          <span class="prompt-label">&gt;&gt;</span>
          <input
            type="text"
            class="terminal-input"
            ${ref(this.inputRef)}
            .value=${this.inputValue}
            @input=${(e: Event) => (this.inputValue = (e.target as HTMLInputElement).value)}
            @keydown=${this.handleKeyDown}
            placeholder=${this.isVoiceActive ? 'Listening... speak now or press Enter' : 'Enter meta-command (help, status, models, voice) or prompt...'}
          />
          <button 
            class="voice-btn ${this.isVoiceActive ? 'active' : ''}"
            @click=${() => this.emit('toggle-voice')}
            title="${this.isVoiceActive ? 'Stop Voice Recording' : 'Start Voice Input'}"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          </button>
        </div>

        <!-- Action / Status Footer -->
        <div class="action-bar">
          <div class="status-left">
            <div class="link-indicator">
              <span class="dot ${this.isAgentRunning ? 'active' : this.isStartingAgent ? 'starting' : ''}"></span>
              <span>${this.isAgentRunning ? 'AGENT ACTIVE' : this.isStartingAgent ? 'CONNECTING...' : 'STANDBY'}</span>
            </div>

            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.68rem; color: #94a3b8;">
              <input 
                type="checkbox" 
                .checked=${this.autoScroll} 
                @change=${(e: Event) => (this.autoScroll = (e.target as HTMLInputElement).checked)}
                style="accent-color: #38bdf8;"
              />
              Auto-scroll
            </label>
          </div>

          <div class="status-right">
            ${this.isAgentRunning ? html`
              <button 
                class="action-btn stop" 
                @click=${() => this.emit('stop-agent')}
                ?disabled=${this.isStoppingAgent}
                title="Stop running Python agent process"
              >
                ${this.isStoppingAgent ? 'Stopping...' : 'Stop Process'}
              </button>
            ` : html`
              <button 
                class="action-btn start" 
                @click=${() => this.emit('start-agent')}
                ?disabled=${this.isStartingAgent}
                title="Launch Python agent backend service"
              >
                ${this.isStartingAgent ? 'Launching...' : 'Launch Agent'}
              </button>
            `}
          </div>
        </div>

        <!-- Meta Commands Flyout Menu -->
        ${this.showMetaMenu ? html`
          <div class="meta-popover">
            <div class="meta-popover-header">
              <span class="meta-popover-title">
                ⚡ LUMIN Meta-Commands
              </span>
              <button class="icon-btn" @click=${() => { this.showMetaMenu = false; }} style="padding: 2px 4px;">✕</button>
            </div>

            <input 
              type="text" 
              class="meta-search-input" 
              placeholder="Search commands (e.g. status, models, tts)..."
              .value=${this.metaSearchQuery}
              @input=${(e: Event) => (this.metaSearchQuery = (e.target as HTMLInputElement).value)}
            />

            <div class="meta-categories">
              ${categories.map((cat) => html`
                <button 
                  class="category-chip ${this.selectedCategory === cat ? 'active' : ''}"
                  @click=${() => { this.selectedCategory = cat; }}
                >
                  ${cat}
                </button>
              `)}
            </div>

            <div class="meta-list">
              ${filteredMeta.map((cmd) => html`
                <div class="meta-item" @click=${() => this.executeMetaCommand(cmd.command)}>
                  <div class="meta-item-left">
                    <span>${cmd.icon}</span>
                    <div>
                      <div class="meta-item-name">${cmd.name}</div>
                      <div class="meta-item-desc">${cmd.description}</div>
                    </div>
                  </div>
                  <span class="meta-item-cmd">${cmd.command}</span>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
      ` : ''}
    `;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const val = this.inputValue.trim();
      if (val) {
        this.commandHistory.push(val);
        this.historyIndex = this.commandHistory.length;
        this.emit('send-input', { text: val });
        this.inputValue = '';
      } else {
        this.emit('send-empty-enter');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.commandHistory.length > 0 && this.historyIndex > 0) {
        this.historyIndex--;
        this.inputValue = this.commandHistory[this.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.inputValue = this.commandHistory[this.historyIndex];
      } else {
        this.historyIndex = this.commandHistory.length;
        this.inputValue = '';
      }
    } else if (e.key === 'Escape') {
      this.showMetaMenu = false;
    }
  }

  private executeMetaCommand(cmd: string) {
    this.showMetaMenu = false;
    this.commandHistory.push(cmd);
    this.historyIndex = this.commandHistory.length;
    this.emit('send-input', { text: cmd });
  }

  private handleCopyLogs() {
    if (navigator.clipboard && this.terminalLogs) {
      navigator.clipboard.writeText(this.terminalLogs);
      this.showCopyToast = true;
      setTimeout(() => {
        this.showCopyToast = false;
      }, 1800);
    }
  }

  private handleDockChange(newPos: TerminalDockPosition) {
    this.dockPosition = newPos;
    this.setAttribute('dock', newPos);
    this.emit('dock-changed', { position: newPos });
  }

  private handleToggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.emit('collapse-toggled', { isCollapsed: this.isCollapsed });
  }

  private handleClose() {
    this.emit('close-terminal');
  }

  private handleHeaderMouseDown(_e: MouseEvent) {
    // Docked mode only
  }

  public scrollToBottom() {
    if (this.autoScroll && this.screenRef.value) {
      this.screenRef.value.scrollTop = this.screenRef.value.scrollHeight;
    }
  }

  private getFilteredLogs(logs: string): string {
    if (!logs) return '<span class="log-dim">Waiting for agent execution logs...</span>';

    const lines = logs.split('\n');
    let filteredLines = lines;

    if (this.activeFilter === 'agent') {
      filteredLines = lines.filter(l => 
        /\[AGENT|thinking|reasoning|model|route|intent|synthesis/i.test(l)
      );
    } else if (this.activeFilter === 'tools') {
      filteredLines = lines.filter(l => 
        /\[TOOL|executing|running|invoking|file|action|mcp/i.test(l)
      );
    } else if (this.activeFilter === 'errors') {
      filteredLines = lines.filter(l => 
        /error|exception|fail|warn|traceback/i.test(l)
      );
    }

    if (filteredLines.length === 0) {
      return `<span class="log-dim">No logs matching filter "${this.activeFilter}".</span>`;
    }

    return filteredLines
      .map(line => {
        let safe = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Highlight structured tokens
        if (/error|exception|fail/i.test(safe)) {
          return `<div class="log-line log-error">${safe}</div>`;
        } else if (/warn|warning/i.test(safe)) {
          return `<div class="log-line log-warning">${safe}</div>`;
        } else if (/\[COMMAND:.*?\]/i.test(safe)) {
          return `<div class="log-line log-command">${safe}</div>`;
        } else if (/\[TOOL|Executing tool/i.test(safe)) {
          return `<div class="log-line log-tool">${safe}</div>`;
        } else if (/\[AGENT|thinking/i.test(safe)) {
          return `<div class="log-line log-agent">${safe}</div>`;
        } else if (/online|success|connected/i.test(safe)) {
          return `<div class="log-line log-success">${safe}</div>`;
        } else if (/^>>>/i.test(safe)) {
          return `<div class="log-line log-system">${safe}</div>`;
        }
        return `<div class="log-line">${safe}</div>`;
      })
      .join('');
  }

  firstUpdated() {
    this.setAttribute('dock', this.dockPosition);
    if (this.dockPosition === 'bottom') {
      this.style.width = '100%';
      this.style.height = `${this.panelHeight}px`;
    } else {
      this.style.width = `${this.panelWidth}px`;
      this.style.height = '100%';
    }
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('terminalLogs') && this.autoScroll) {
      this.scrollToBottom();
    }
    if (
      changedProperties.has('dockPosition') ||
      changedProperties.has('panelWidth') ||
      changedProperties.has('panelHeight')
    ) {
      this.setAttribute('dock', this.dockPosition);
      this.style.left = '';
      this.style.top = '';
      if (this.dockPosition === 'bottom') {
        this.style.width = '100%';
        this.style.height = `${this.panelHeight}px`;
      } else {
        this.style.width = `${this.panelWidth}px`;
        this.style.height = '100%';
      }
    }
  }

  private emit(name: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }
}
