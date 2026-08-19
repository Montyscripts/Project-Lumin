import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { soundFX } from '../sound-effects';

export type SystemAgentState = 'idle' | 'thinking' | 'working' | 'listening' | 'speaking' | 'starting' | 'stopping';
export type AppMode = 'voice' | 'agent' | 'settings';

export interface TaskProgressInfo {
  taskName: string;
  stepDescription?: string;
  currentStep?: number;
  totalSteps?: number;
  progressPercent?: number; // 0 - 100 or undefined for indeterminate
  elapsedSeconds?: number;
  canCancel?: boolean;
}

export const AVAILABLE_VOICE_GROUPS = [
  {
    label: 'Neural US English',
    voices: [
      { id: 'en-US-JennyNeural', label: 'Jenny (US Female)' },
      { id: 'en-US-GuyNeural', label: 'Guy (US Male)' },
      { id: 'en-US-AriaNeural', label: 'Aria (US Female)' },
      { id: 'en-US-DavisNeural', label: 'Davis (US Male)' },
      { id: 'en-US-AmberNeural', label: 'Amber (US Female)' },
      { id: 'en-US-ChristopherNeural', label: 'Christopher (US Male)' },
      { id: 'en-US-EricNeural', label: 'Eric (US Male)' },
      { id: 'en-US-MichelleNeural', label: 'Michelle (US Female)' },
    ]
  },
  {
    label: 'Neural International English',
    voices: [
      { id: 'en-GB-SoniaNeural', label: 'Sonia (UK Female)' },
      { id: 'en-GB-RyanNeural', label: 'Ryan (UK Male)' },
      { id: 'en-AU-NatashaNeural', label: 'Natasha (AU Female)' },
      { id: 'en-CA-ClaraNeural', label: 'Clara (CA Female)' },
      { id: 'en-IE-EmilyNeural', label: 'Emily (IE Female)' },
      { id: 'en-IN-NeerjaNeural', label: 'Neerja (IN Female)' },
    ]
  },
  {
    label: 'Multilingual Neural',
    voices: [
      { id: 'es-ES-ElviraNeural', label: 'Elvira (Spanish)' },
      { id: 'fr-FR-DeniseNeural', label: 'Denise (French)' },
      { id: 'de-DE-KatjaNeural', label: 'Katja (German)' },
      { id: 'ja-JP-NanamiNeural', label: 'Nanami (Japanese)' },
      { id: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (Chinese)' },
      { id: 'it-IT-ElsaNeural', label: 'Elsa (Italian)' },
    ]
  },
  {
    label: 'Local Offline (Piper TTS)',
    voices: [
      { id: 'en_US-lessac-medium', label: 'Lessac (Piper Local)' },
      { id: 'en_US-amy-medium', label: 'Amy (Piper Local)' },
      { id: 'en_GB-alan-medium', label: 'Alan (Piper Local)' },
    ]
  }
];

@customElement('lumin-status-bar')
export class LuminStatusBar extends LitElement {
  @property({ type: String }) currentMode: AppMode = 'voice';
  @property({ type: String }) activeModelName = 'llama3.2:3b';
  @property({ type: String }) activePlatform = 'Ollama';
  @property({ type: String }) agentState: SystemAgentState = 'idle';
  @property({ type: Boolean }) isAgentRunning = false;
  @property({ type: Boolean }) isStartingAgent = false;
  @property({ type: Boolean }) isStoppingAgent = false;
  @property({ type: Boolean }) isGeneratingResponse = false;
  @property({ type: Boolean }) isListening = false;
  @property({ type: Boolean }) isSpeaking = false;
  @property({ type: Boolean }) isContinuousActive = false;
  @property({ type: Boolean }) isScreenSharing = false;
  @property({ type: Boolean }) isCameraActive = false;
  @property({ type: String }) piperVoice = 'en-US-JennyNeural';
  @property({ type: Number }) elapsedSeconds = 0;
  @property({ type: Object }) taskProgress: TaskProgressInfo | null = null;
  @property({ type: Boolean }) showTaskProgress = false;
  @property({ type: Boolean }) isCompact = false;
  @property({ type: Boolean }) isTerminalOpen = false;
  @property({ type: Boolean }) unrestrictedMode = false;
  @property({ type: String }) activeSkill = '';
  @property({ type: Number }) activeSkillsCount = 5;
  @property({ type: Object }) lastRunSkill: { id: string; name: string; icon: string; success: boolean; time: string; summary?: string } | null = null;

  @state() private isDetailsOpen = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      user-select: none;
      z-index: 40;
    }

    .status-bar-container {
      display: flex;
      flex-direction: column;
      background: var(--background-surface, rgba(9, 12, 18, 0.94));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      box-shadow: var(--lumin-shadow-md, 0 4px 24px rgba(0, 0, 0, 0.45));
      position: relative;
      overflow: visible;
      transition: var(--lumin-transition-base, all 0.2s ease);
    }

    /* Main Compact Status Ribbon - Structurally Centered with 3-column Grid */
    .status-ribbon {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: var(--lumin-space-sm, 8px);
      padding: 0 var(--lumin-space-md, 14px);
      min-height: 36px;
      height: 36px;
      box-sizing: border-box;
    }

    .status-left-group,
    .status-center-group,
    .status-right-group {
      display: flex;
      align-items: center;
      gap: var(--lumin-space-sm, 6px);
      height: 100%;
    }

    .status-left-group {
      justify-self: start;
      min-width: 0;
    }

    .status-center-group {
      justify-self: center;
      justify-content: center;
      align-items: center;
      min-width: 0;
    }

    .status-right-group {
      justify-self: end;
      justify-content: flex-end;
      align-items: center;
      min-width: 0;
    }

    /* Pill Badges */
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0 8px;
      height: 22px;
      box-sizing: border-box;
      border-radius: var(--lumin-radius-sm, 6px);
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.2px;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary, #cbd5e1);
      transition: var(--lumin-transition-fast, all 0.16s ease);
      white-space: nowrap;
      cursor: default;
      line-height: 1;
    }

    .status-chip.interactive {
      cursor: pointer;
    }

    .status-chip.interactive:hover {
      background: var(--background-surface-hover, rgba(255, 255, 255, 0.08));
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.18));
      color: var(--text-primary, #ffffff);
    }

    .status-chip.interactive:active {
      transform: translateY(0.5px);
    }

    /* Mode Pill */
    .mode-chip {
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      font-size: 0.65rem;
      padding: 0 8px;
      height: 22px;
      border-radius: var(--lumin-radius-sm, 6px);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-sizing: border-box;
      line-height: 1;
    }

    .mode-chip.mode-voice {
      background: rgba(56, 189, 248, 0.1);
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .mode-chip.mode-agent {
      background: rgba(168, 85, 247, 0.1);
      border-color: rgba(168, 85, 247, 0.3);
      color: #c084fc;
    }

    .mode-chip.mode-settings {
      background: rgba(234, 179, 8, 0.1);
      border-color: rgba(234, 179, 8, 0.3);
      color: #facc15;
    }

    /* Active Sub-Mode Tags */
    .submode-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      height: 20px;
      border-radius: var(--lumin-radius-xs, 4px);
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .submode-tag.continuous {
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
    }

    .submode-tag.screen {
      background: rgba(236, 72, 153, 0.12);
      border: 1px solid rgba(236, 72, 153, 0.35);
      color: #f472b6;
    }

    .submode-tag.camera {
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.35);
      color: #38bdf8;
    }

    /* Agent Status Hero Capsule - Prominent, Larger Centered Status Pill */
    .agent-status-capsule {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 12px;
      height: 24px;
      border-radius: 9999px;
      font-size: 0.70rem;
      font-weight: 700;
      letter-spacing: 0.35px;
      text-transform: uppercase;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      box-sizing: border-box;
      line-height: 1;
    }

    .agent-status-capsule.idle {
      background: rgba(34, 197, 94, 0.14);
      border: 1px solid rgba(34, 197, 94, 0.45);
      color: #4ade80;
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.22);
    }

    .agent-status-capsule.standby {
      background: rgba(100, 116, 139, 0.12);
      border: 1px solid rgba(100, 116, 139, 0.22);
      color: #94a3b8;
    }

    .agent-status-capsule.thinking {
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(245, 158, 11, 0.22));
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #fef08a;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
      animation: capsule-pulse-amber 1.8s infinite alternate;
    }

    .agent-status-capsule.working {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(139, 92, 246, 0.22));
      border: 1px solid rgba(168, 85, 247, 0.5);
      color: #e9d5ff;
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.25);
      animation: capsule-pulse-purple 1.8s infinite alternate;
    }

    .agent-status-capsule.listening {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.22));
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #fca5a5;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
      animation: capsule-pulse-red 1.4s infinite alternate;
    }

    .agent-status-capsule.speaking {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(14, 165, 233, 0.22));
      border: 1px solid rgba(59, 130, 246, 0.5);
      color: #93c5fd;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
    }

    .agent-status-capsule.starting {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fde047;
    }

    .agent-status-capsule.stopping {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }

    @keyframes capsule-pulse-amber {
      from { box-shadow: 0 0 6px rgba(245, 158, 11, 0.2); }
      to { box-shadow: 0 0 14px rgba(245, 158, 11, 0.4); }
    }

    @keyframes capsule-pulse-purple {
      from { box-shadow: 0 0 6px rgba(168, 85, 247, 0.2); }
      to { box-shadow: 0 0 14px rgba(168, 85, 247, 0.4); }
    }

    @keyframes capsule-pulse-red {
      from { box-shadow: 0 0 6px rgba(239, 68, 68, 0.2); }
      to { box-shadow: 0 0 14px rgba(239, 68, 68, 0.45); }
    }

    /* Live Dots & Animations */
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .status-dot.green {
      background: #22c55e;
      box-shadow: 0 0 5px #22c55e;
    }

    .status-dot.grey {
      background: #64748b;
    }

    .status-dot.red {
      background: #ef4444;
      box-shadow: 0 0 6px #ef4444;
      animation: pulse-dot-anim 0.8s infinite alternate;
    }

    @keyframes pulse-dot-anim {
      from { transform: scale(0.85); opacity: 0.6; }
      to { transform: scale(1.2); opacity: 1; }
    }

    .spinner-icon {
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .mini-equalizer {
      display: inline-flex;
      align-items: flex-end;
      gap: 1.5px;
      height: 10px;
      width: 12px;
      flex-shrink: 0;
    }

    .eq-bar {
      width: 1.5px;
      background: currentColor;
      border-radius: 1px;
      animation: eq-bounce 0.7s infinite ease-in-out alternate;
    }

    .eq-bar:nth-child(1) { height: 35%; animation-delay: 0.1s; }
    .eq-bar:nth-child(2) { height: 95%; animation-delay: 0.25s; }
    .eq-bar:nth-child(3) { height: 60%; animation-delay: 0.18s; }
    .eq-bar:nth-child(4) { height: 80%; animation-delay: 0.35s; }

    @keyframes eq-bounce {
      0% { height: 20%; }
      100% { height: 100%; }
    }

    .elapsed-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.64rem;
      background: rgba(0, 0, 0, 0.35);
      padding: 1px 4px;
      border-radius: 3px;
      color: #ffffff;
      font-weight: 700;
      margin-left: 2px;
    }

    /* Model Chip in Status Bar */
    .model-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.69rem;
      color: #f1f5f9;
      background: rgba(18, 24, 38, 0.8);
      border: 1px solid rgba(0, 170, 255, 0.2);
    }

    .model-chip:hover {
      background: rgba(22, 32, 52, 0.95);
      border-color: rgba(0, 170, 255, 0.45);
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.18);
    }

    .platform-tag {
      font-size: 0.58rem;
      padding: 0 4px;
      border-radius: 3px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .platform-tag.cloud {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.35);
    }

    .platform-tag.ollama {
      background: rgba(234, 88, 12, 0.2);
      color: #fb923c;
      border: 1px solid rgba(234, 88, 12, 0.35);
    }

    /* Live Task Progress Sub-Bar */
    .task-progress-ribbon {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 3px 14px 4px 14px;
      background: rgba(15, 20, 32, 0.98);
      border-top: 1px solid rgba(0, 170, 255, 0.15);
      font-size: 0.69rem;
      color: #e2e8f0;
      box-sizing: border-box;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .task-info-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .task-name-text {
      font-weight: 700;
      color: #38bdf8;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .task-step-text {
      color: #94a3b8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.67rem;
    }

    .task-bar-wrapper {
      flex: 1;
      max-width: 260px;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .task-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
      border-radius: 2px;
      transition: width 0.25s ease;
    }

    .task-bar-fill.indeterminate {
      width: 35%;
      animation: indeterminate-slide 1.4s infinite ease-in-out;
    }

    @keyframes indeterminate-slide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(180%); }
      100% { transform: translateX(350%); }
    }

    .cancel-task-btn {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cancel-task-btn:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.6);
      color: #ffffff;
    }

    /* Diagnostics Panel */
    .system-details-panel {
      position: absolute;
      top: 100%;
      right: 14px;
      width: 340px;
      max-width: calc(100vw - 28px);
      max-height: 85vh;
      overflow-y: auto;
      background: var(--background-elevated, rgba(14, 18, 28, 0.98));
      border: 1px solid var(--border-color-hover, rgba(0, 170, 255, 0.3));
      border-radius: var(--lumin-radius-md, 10px);
      box-shadow: var(--lumin-shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.85)), 0 0 20px rgba(0, 170, 255, 0.15);
      padding: 10px 12px;
      margin-top: var(--lumin-space-xs, 4px);
      z-index: 100;
      backdrop-filter: blur(16px);
      font-size: 0.72rem;
      color: var(--text-primary, #e2e8f0);
    }

    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      font-weight: 700;
      color: var(--glow-color, #38bdf8);
      letter-spacing: 0.4px;
      font-size: 0.74rem;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 6px;
    }

    .details-item {
      background: var(--background-card, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
      border-radius: var(--lumin-radius-sm, 6px);
      padding: 5px 7px;
    }

    .details-label {
      font-size: 0.62rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .details-val {
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 1px;
      font-family: 'JetBrains Mono', monospace;
    }

    .diagnostics-voice-select {
      width: 100%;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(192, 132, 252, 0.4);
      color: #e9d5ff;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 0.71rem;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      margin-top: 4px;
      transition: all 0.15s ease;
    }

    .diagnostics-voice-select:hover {
      border-color: rgba(192, 132, 252, 0.8);
      background: rgba(0, 0, 0, 0.6);
    }

    .diagnostics-voice-select:focus {
      border-color: #c084fc;
      box-shadow: 0 0 8px rgba(192, 132, 252, 0.35);
    }

    .diagnostics-voice-select optgroup {
      background: #0e121c;
      color: #94a3b8;
      font-weight: 700;
    }

    .diagnostics-voice-select option {
      background: #0e121c;
      color: #f1f5f9;
    }

    @media (max-width: 768px) {
      .status-ribbon {
        padding: 0 10px;
        height: 36px;
        min-height: 36px;
        grid-template-columns: 1fr auto 1fr;
      }
      .agent-status-capsule {
        padding: 0 7px;
        font-size: 0.62rem;
        height: 20px;
      }
    }

    @media (max-width: 480px) {
      .status-ribbon {
        padding: 0 6px;
        height: 36px;
        min-height: 36px;
      }
      .agent-status-capsule {
        padding: 0 6px;
        font-size: 0.60rem;
        height: 19px;
      }
    }
  `;

  private getModeDisplay() {
    switch (this.currentMode) {
      case 'voice':
        return { label: 'Voice', icon: '🎙️', class: 'mode-voice' };
      case 'agent':
        return { label: 'Agent Workspace', icon: '💻', class: 'mode-agent' };
      case 'settings':
        return { label: 'Settings', icon: '⚙️', class: 'mode-settings' };
      default:
        return { label: 'LUMIN Mode', icon: '⚡', class: 'mode-voice' };
    }
  }

  private handleModeClick() {
    soundFX.playClick();
    this.dispatchEvent(new CustomEvent('toggle-mode-menu', { bubbles: true, composed: true }));
  }

  private handleModelClick() {
    soundFX.playClick();
    this.dispatchEvent(new CustomEvent('open-model-selector', { bubbles: true, composed: true }));
  }

  private handleCancelTask() {
    soundFX.playClick();
    this.dispatchEvent(new CustomEvent('cancel-active-task', { bubbles: true, composed: true }));
  }

  private toggleDetails() {
    soundFX.playClick();
    this.isDetailsOpen = !this.isDetailsOpen;
  }

  private getGpuRendererInfo(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const r = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (r) {
            return String(r).replace(/ANGLE \((.*)\)/, '$1').replace(/\(TM\)|\(R\)/gi, '').trim().slice(0, 26);
          }
        }
      }
    } catch (e) {}
    return 'WebGL 2.0 Accelerated';
  }

  private getMemoryMetric(): string {
    try {
      const mem = (performance as any)?.memory;
      if (mem && mem.usedJSHeapSize) {
        return `${Math.round(mem.usedJSHeapSize / (1024 * 1024))} MB JS Heap`;
      }
    } catch (e) {}
    return 'Optimized';
  }

  render() {
    const modeInfo = this.getModeDisplay();

    // Determine agent status capsule state & labels
    let activityLabel = 'Idle · Standby';
    let activityClass = 'standby';
    let activityIcon = html`<span class="status-dot grey"></span>`;

    if (this.agentState === 'thinking' || this.isGeneratingResponse) {
      activityLabel = 'Thinking...';
      activityClass = 'thinking';
      activityIcon = html`<div class="spinner-icon" style="color: #fef08a;"></div>`;
    } else if (this.agentState === 'working' || (this.taskProgress && this.taskProgress.taskName)) {
      activityLabel = this.taskProgress?.taskName ? `Working: ${this.taskProgress.taskName.slice(0, 20)}` : 'Working...';
      activityClass = 'working';
      activityIcon = html`<div class="spinner-icon" style="color: #e9d5ff;"></div>`;
    } else if (this.agentState === 'listening' || this.isListening) {
      activityLabel = 'Listening...';
      activityClass = 'listening';
      activityIcon = html`<span class="status-dot red pulse"></span>`;
    } else if (this.agentState === 'speaking' || this.isSpeaking) {
      const voiceShort = (this.piperVoice || '').includes('-') ? this.piperVoice.split('-')[1] : (this.piperVoice || 'TTS');
      activityLabel = `Speaking (${voiceShort})...`;
      activityClass = 'speaking';
      activityIcon = html`
        <div class="mini-equalizer">
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
        </div>
      `;
    } else if (this.agentState === 'starting' || this.isStartingAgent) {
      activityLabel = 'Agent Starting...';
      activityClass = 'starting';
      activityIcon = html`<div class="spinner-icon" style="color: #fde047;"></div>`;
    } else if (this.agentState === 'stopping' || this.isStoppingAgent) {
      activityLabel = 'Agent Stopping...';
      activityClass = 'stopping';
      activityIcon = html`<span class="status-dot red"></span>`;
    } else if (this.isAgentRunning) {
      activityLabel = 'Idle · Agent Ready';
      activityClass = 'idle';
      activityIcon = html`<span class="status-dot green"></span>`;
    } else {
      activityLabel = 'Idle · Standby';
      activityClass = 'standby';
      activityIcon = html`<span class="status-dot grey"></span>`;
    }

    const hasActiveTask = this.isGeneratingResponse || this.isStartingAgent || !!this.taskProgress;
    const taskTitle = this.taskProgress?.taskName || (this.isGeneratingResponse ? 'Generating Cognitive Response' : this.isStartingAgent ? 'Initializing Agent Runtime' : 'Agent Background Task');
    const taskStep = this.taskProgress?.stepDescription || (this.isGeneratingResponse ? 'Synthesizing response...' : this.isStartingAgent ? 'Establishing WebSocket stream...' : 'Executing command...');
    const progressPercent = this.taskProgress?.progressPercent;

    return html`
      <div class="status-bar-container" id="lumin-global-status-bar">
        
        <!-- Main Compact Ribbon -->
        <div class="status-ribbon">
          
          <!-- Left: Current Mode & Active Feeds -->
          <div class="status-left-group">
            <div 
              class="status-chip mode-chip ${modeInfo.class} interactive" 
              @click=${this.handleModeClick}
              title="Current Mode: ${modeInfo.label} (Click to switch mode)"
            >
              <span>${modeInfo.icon}</span>
              <span>${modeInfo.label}</span>
            </div>

            ${this.isContinuousActive ? html`
              <span class="submode-tag continuous" title="Continuous conversation is active">
                <span class="status-dot green"></span> Continuous
              </span>
            ` : ''}

            ${this.isScreenSharing ? html`
              <span class="submode-tag screen" title="Live screen capture active">
                🖥️ Screen
              </span>
            ` : ''}

            ${this.isCameraActive ? html`
              <span class="submode-tag camera" title="Camera video stream active">
                📷 Camera
              </span>
            ` : ''}
          </div>

          <!-- Center: Agent Status Badge (Prominent centered green pill) -->
          <div class="status-center-group">
            <div 
              class="agent-status-capsule ${activityClass}" 
              title="Agent Status: ${activityLabel}"
            >
              ${activityIcon}
              <span>${activityLabel}</span>
              ${this.isGeneratingResponse && this.elapsedSeconds > 0 ? html`
                <span class="elapsed-chip">${this.elapsedSeconds}s</span>
              ` : ''}
            </div>
          </div>

          <!-- Right: System Diagnostic Tools -->
          <div class="status-right-group">
            <!-- Diagnostics Toggle -->
            <button 
              class="status-chip interactive" 
              @click=${this.toggleDetails}
              title="Toggle System Diagnostic Metrics"
              style="padding: 2px 8px; display: inline-flex; align-items: center; gap: 5px;"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <span>Diagnostics</span>
            </button>
          </div>

        </div>

        <!-- Task Progress Ribbon (Visible during thinking, background executions, or agent tasks) -->
        ${(hasActiveTask || this.showTaskProgress) ? html`
          <div class="task-progress-ribbon" id="task-progress-banner">
            <div class="task-info-group">
              <div class="task-name-text">
                <div class="spinner-icon" style="color: #38bdf8;"></div>
                <span>${taskTitle}</span>
              </div>
              <div class="task-step-text">
                ${taskStep}
              </div>
            </div>

            <div class="task-bar-wrapper">
              ${progressPercent !== undefined ? html`
                <div class="task-bar-fill" style="width: ${progressPercent}%;"></div>
              ` : html`
                <div class="task-bar-fill indeterminate"></div>
              `}
            </div>

            ${progressPercent !== undefined ? html`
              <span class="elapsed-chip" title="Task progress percentage">${progressPercent}%</span>
            ` : ''}

            ${(this.isGeneratingResponse || (this.taskProgress && this.taskProgress.canCancel)) ? html`
              ${this.elapsedSeconds > 0 ? html`
                <span class="elapsed-chip" title="Time elapsed">${this.elapsedSeconds}s</span>
              ` : ''}
              <button class="cancel-task-btn" @click=${this.handleCancelTask} title="Cancel operation">
                Stop
              </button>
            ` : ''}
          </div>
        ` : ''}

        <!-- Collapsible System Diagnostics Flyout Panel -->
        ${this.isDetailsOpen ? html`
          <div class="system-details-panel" id="system-diagnostics-flyout">
            <div class="details-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <span>SYSTEM DIAGNOSTICS & TELEMETRY</span>
              </div>
              <button 
                @click=${this.toggleDetails} 
                title="Close Diagnostics"
                style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0 4px;"
              >
                &times;
              </button>
            </div>

            <!-- Voice Selection Control (Task 3) -->
            <div class="diagnostics-voice-box" style="margin-top: 8px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 6px; padding: 6px 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="details-label" style="color: #d8b4fe;">🎙️ Voice Synthesis Model</span>
                <span style="font-size: 0.65rem; color: #c084fc; font-weight: 700; font-family: monospace;">EDGE / PIPER</span>
              </div>
              <select
                class="diagnostics-voice-select"
                aria-label="Select Voice Synthesis Model"
                .value=${this.piperVoice}
                @change=${(e: Event) => {
                  const val = (e.target as HTMLSelectElement).value;
                  if (val) {
                    this.piperVoice = val;
                    try {
                      localStorage.setItem('project_lumin_piper_voice', val);
                    } catch (err) {}
                    soundFX.playClick();
                    this.dispatchEvent(new CustomEvent('voice-change', {
                      detail: { voice: val },
                      bubbles: true,
                      composed: true
                    }));
                    this.requestUpdate();
                  }
                }}
              >
                ${AVAILABLE_VOICE_GROUPS.map(group => html`
                  <optgroup label="${group.label}">
                    ${group.voices.map(v => html`
                      <option value="${v.id}" ?selected=${this.piperVoice === v.id}>
                        ${v.label} (${v.id})
                      </option>
                    `)}
                  </optgroup>
                `)}
              </select>
            </div>

            <!-- Personal Agent Runtime Stack (Model -> Context -> Skills -> Harness) -->
            <div class="details-grid">
              <div class="details-item">
                <div class="details-label">1. Brain / Model</div>
                <div class="details-val" style="color: #38bdf8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.activeModelName} (${this.activePlatform})">
                  ${this.activeModelName}
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">2. Context Layer</div>
                <div class="details-val" style="color: #c084fc;">
                  lumin_context/ · 4 Files
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">3. Skills Layer</div>
                <div class="details-val" style="color: #34d399;">
                  ${this.activeSkill ? `Running: ${this.activeSkill}` : `${this.activeSkillsCount || 5} Active Packs`}
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">Last Skill Run</div>
                <div class="details-val" style="color: ${this.lastRunSkill ? (this.lastRunSkill.success ? '#38bdf8' : '#f87171') : '#94a3b8'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.lastRunSkill ? `${this.lastRunSkill.name} (${this.lastRunSkill.success ? 'Success' : 'Failed'} at ${this.lastRunSkill.time})` : 'No skills executed yet'}">
                  ${this.lastRunSkill ? `${this.lastRunSkill.icon} ${this.lastRunSkill.name} (${this.lastRunSkill.success ? '✓' : '✗'} ${this.lastRunSkill.time})` : 'None yet'}
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">Access Level</div>
                <div class="details-val" style="color: ${this.unrestrictedMode ? '#facc15' : '#94a3b8'}; font-weight: 700;">
                  ${this.unrestrictedMode ? '⚡ UNRESTRICTED (Elevated)' : '🔒 SANDBOXED (Protected)'}
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">Harness Process</div>
                <div class="details-val" style="color: ${this.isAgentRunning ? '#4ade80' : '#94a3b8'};">
                  ${this.isAgentRunning ? 'ONLINE (WebSocket)' : 'STANDBY'}
                </div>
              </div>
              <div class="details-item">
                <div class="details-label">Continuous Voice</div>
                <div class="details-val" style="color: ${this.isContinuousActive ? '#4ade80' : '#94a3b8'};">
                  ${this.isContinuousActive ? 'ACTIVE' : 'OFF'}
                </div>
              </div>
            </div>

            <!-- Hardware & Performance Metrics (Task 4) -->
            <div style="margin-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 6px;">
              <div class="details-label" style="color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                <span>⚡ HARDWARE & DEV METRICS</span>
              </div>
              <div class="details-grid" style="margin-top: 4px;">
                <div class="details-item">
                  <div class="details-label">GPU Acceleration</div>
                  <div class="details-val" style="color: #38bdf8; font-size: 0.65rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.getGpuRendererInfo()}">
                    ${this.getGpuRendererInfo()}
                  </div>
                </div>
                <div class="details-item">
                  <div class="details-label">Rendering Target</div>
                  <div class="details-val" style="color: #4ade80;">
                    60 FPS · WebGL 2.0
                  </div>
                </div>
                <div class="details-item">
                  <div class="details-label">Audio Pipeline</div>
                  <div class="details-val" style="color: #22d3ee;">
                    WebAudio 48kHz
                  </div>
                </div>
                <div class="details-item">
                  <div class="details-label">Memory Footprint</div>
                  <div class="details-val" style="color: #e2e8f0;">
                    ${this.getMemoryMetric()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }
}
