import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { OllamaModelInfo, ModelSelectorState } from '../types/model-schema';
import { soundFX } from '../sound-effects';

export const DEFAULT_MODELS_CATALOG: OllamaModelInfo[] = [
  {
    name: 'llama3.2:3b',
    tag: '3b',
    displayName: 'Llama 3.2 3B',
    size: '2.0 GB',
    parameterSize: '3.2B',
    quantization: 'Q4_K_M',
    family: 'llama',
    category: 'fast',
    recommendedUse: 'Ultra-low latency voice conversations & instant terminal commands',
    description: 'Meta\'s lightweight powerhouse optimized for sub-100ms conversational turnarounds and desktop agent tasks.',
    speedRating: 'Ultra-Fast',
    contextWindow: '128K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#22c55e',
  },
  {
    name: 'deepseek-r1:8b',
    tag: '8b',
    displayName: 'DeepSeek-R1 8B',
    size: '4.9 GB',
    parameterSize: '8.0B',
    quantization: 'Q4_K_M',
    family: 'deepseek',
    category: 'reasoning',
    recommendedUse: 'Step-by-step logical reasoning, math proofs & algorithmic analysis',
    description: 'Advanced reasoning distilled model featuring deep Chain-of-Thought deliberation for complex problem solving.',
    speedRating: 'Fast',
    contextWindow: '64K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#a855f7',
  },
  {
    name: 'qwen2.5-coder:7b',
    tag: '7b',
    displayName: 'Qwen 2.5 Coder 7B',
    size: '4.7 GB',
    parameterSize: '7.6B',
    quantization: 'Q4_K_M',
    family: 'qwen2',
    category: 'coding',
    recommendedUse: 'Full-stack software engineering, code generation & multi-file refactoring',
    description: 'State-of-the-art code-specialized model with comprehensive syntax understanding across 92+ programming languages.',
    speedRating: 'Fast',
    contextWindow: '128K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#00aaff',
  },
  {
    name: 'llama3.2:1b',
    tag: '1b',
    displayName: 'Llama 3.2 1B',
    size: '1.3 GB',
    parameterSize: '1.2B',
    quantization: 'Q4_K_M',
    family: 'llama',
    category: 'fast',
    recommendedUse: 'Instant micro-tasks, continuous voice summarization & edge execution',
    description: 'Ultra-compact model designed for blazing fast single-pass classification and real-time audio chat streaming.',
    speedRating: 'Ultra-Fast',
    contextWindow: '128K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#22c55e',
  },
  {
    name: 'deepseek-r1:14b',
    tag: '14b',
    displayName: 'DeepSeek-R1 14B',
    size: '9.0 GB',
    parameterSize: '14.8B',
    quantization: 'Q4_K_M',
    family: 'deepseek',
    category: 'reasoning',
    recommendedUse: 'Deep architectural planning, theorem verification & research synthesis',
    description: 'Heavyweight reasoning model with rigorous self-verification and comprehensive logical derivations.',
    speedRating: 'Balanced',
    contextWindow: '64K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#c084fc',
  },
  {
    name: 'qwen2.5-coder:14b',
    tag: '14b',
    displayName: 'Qwen 2.5 Coder 14B',
    size: '9.0 GB',
    parameterSize: '14.7B',
    quantization: 'Q4_K_M',
    family: 'qwen2',
    category: 'coding',
    recommendedUse: 'Complex codebase refactoring, security audits & API SDK integrations',
    description: 'Top-tier code intelligence matching frontier model benchmarks in Python, TypeScript, Rust, and Go.',
    speedRating: 'Balanced',
    contextWindow: '128K tokens',
    isLoadedInVram: false,
    isInstalled: true,
    badgeColor: '#38bdf8',
  },
  {
    name: 'mistral-nemo:12b',
    tag: '12b',
    displayName: 'Mistral NeMo 12B',
    size: '7.1 GB',
    parameterSize: '12.2B',
    quantization: 'Q4_K_M',
    family: 'mistral',
    category: 'general',
    recommendedUse: 'Multilingual conversational fluency & creative writing',
    description: 'Collaborative model developed with NVIDIA featuring the Tekken tokenizer with high compression for multilingual text.',
    speedRating: 'Fast',
    contextWindow: '128K tokens',
    isLoadedInVram: false,
    isInstalled: false,
    badgeColor: '#60a5fa',
  },
  {
    name: 'phi4:14b',
    tag: '14b',
    displayName: 'Phi-4 14B',
    size: '9.1 GB',
    parameterSize: '14.7B',
    quantization: 'Q4_K_M',
    family: 'phi',
    category: 'reasoning',
    recommendedUse: 'Mathematical derivations, scientific computation & logic tasks',
    description: 'Microsoft\'s synthetic-data trained reasoning model excelling at complex STEM questions and synthetic benchmarks.',
    speedRating: 'Fast',
    contextWindow: '16K tokens',
    isLoadedInVram: false,
    isInstalled: false,
    badgeColor: '#a855f7',
  },
  {
    name: 'gemma2:9b',
    tag: '9b',
    displayName: 'Gemma 2 9B',
    size: '5.4 GB',
    parameterSize: '9.2B',
    quantization: 'Q4_K_M',
    family: 'gemma',
    category: 'general',
    recommendedUse: 'General knowledge Q&A, structured data extraction & instruction following',
    description: 'Google DeepMind\'s high-throughput open weights architecture featuring interleaved local and global attention.',
    speedRating: 'Fast',
    contextWindow: '8K tokens',
    isLoadedInVram: false,
    isInstalled: false,
    badgeColor: '#38bdf8',
  },
  {
    name: 'llava:13b',
    tag: '13b',
    displayName: 'LLaVA 1.6 13B',
    size: '7.4 GB',
    parameterSize: '13.4B',
    quantization: 'Q4_K_M',
    family: 'llava',
    category: 'vision',
    recommendedUse: 'Live camera OCR, screen inspection & visual document understanding',
    description: 'Multimodal visual assistant connecting a CLIP vision encoder with high-capacity autoregressive language understanding.',
    speedRating: 'Balanced',
    contextWindow: '32K tokens',
    isLoadedInVram: false,
    isInstalled: false,
    badgeColor: '#f472b6',
  },
];

@customElement('lumin-model-selector')
export class LuminModelSelector extends LitElement {
  @property({ type: String }) activeModel = 'auto';
  @property({ type: Boolean }) isAutoRouting = true;
  @property({ type: Boolean }) isOpen = false;
  @property({ type: Boolean }) isModalOpen = false;

  @state() private models: OllamaModelInfo[] = DEFAULT_MODELS_CATALOG;
  @state() private runningModels: string[] = [];
  @state() private isOllamaRunning = false;
  @state() private ollamaHost = 'http://localhost:11434';
  @state() private isLoading = false;
  @state() private searchQuery = '';
  @state() private selectedCategory: 'all' | 'fast' | 'coding' | 'reasoning' | 'vision' | 'vram' = 'all';
  @state() private customModelInput = '';
  @state() private downloadingModels: { [modelName: string]: { percent: number; status: string; error?: string } } = {};
  @state() private switchNotification: { text: string; type: 'success' | 'info' | 'error' } | null = null;
  private notificationTimeout: any = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      position: relative;
    }

    /* Main Container */
    .model-selector-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      position: relative;
    }

    /* Primary Dropdown Trigger Button */
    .model-dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: rgba(14, 18, 28, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 7px 10px;
      border-radius: var(--lumin-radius-md, 8px);
      color: #f8fafc;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      box-sizing: border-box;
      outline: none;
      gap: 8px;
      min-height: 36px;
    }

    .model-dropdown-trigger:hover {
      background: rgba(22, 30, 46, 0.98);
      border-color: rgba(0, 170, 255, 0.45);
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(0, 170, 255, 0.15);
    }

    .model-dropdown-trigger:focus-visible {
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 0 1px var(--glow-color, #00aaff), 0 0 12px rgba(0, 170, 255, 0.3);
    }

    .model-dropdown-trigger.is-auto {
      border-color: rgba(168, 85, 247, 0.4);
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(14, 18, 28, 0.95) 100%);
    }

    .model-dropdown-trigger.is-auto:hover {
      border-color: rgba(168, 85, 247, 0.7);
      box-shadow: 0 2px 10px rgba(168, 85, 247, 0.25);
    }

    .model-dropdown-trigger.is-open {
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 12px rgba(0, 170, 255, 0.25);
      background: rgba(16, 24, 40, 0.98);
    }

    .trigger-left-group {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      flex: 1;
    }

    .trigger-icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      background: rgba(0, 170, 255, 0.15);
      color: #00aaff;
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .trigger-icon-badge.auto {
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
    }

    .trigger-model-title {
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.78rem;
      letter-spacing: 0.2px;
    }

    .trigger-right-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .trigger-vram-tag {
      font-size: 0.64rem;
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25);
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--font-mono, monospace);
      font-weight: 700;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .trigger-vram-tag.auto {
      background: rgba(168, 85, 247, 0.15);
      color: #d8b4fe;
      border-color: rgba(168, 85, 247, 0.35);
    }

    .trigger-chevron {
      color: #94a3b8;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.18s ease;
      display: flex;
      align-items: center;
    }

    .model-dropdown-trigger.is-open .trigger-chevron {
      transform: rotate(180deg);
      color: var(--glow-color, #00aaff);
    }

    /* Notification Banner */
    .dropdown-toast {
      margin-top: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      animation: fadeIn 0.15s ease;
      box-sizing: border-box;
    }

    .dropdown-toast.success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #ecfdf5;
    }

    .dropdown-toast.info {
      background: rgba(0, 170, 255, 0.15);
      border: 1px solid rgba(0, 170, 255, 0.4);
      color: #e0f2fe;
    }

    /* Dropdown Popover Panel */
    .model-dropdown-panel {
      margin-top: 6px;
      width: 100%;
      background: #0b0f19;
      border: 1px solid rgba(0, 170, 255, 0.35);
      border-radius: var(--lumin-radius-md, 8px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 16px rgba(0, 170, 255, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 50;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Search & Filter Header inside Dropdown */
    .dropdown-header-toolbar {
      padding: 8px 10px;
      background: #0f1422;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 8px;
      color: #64748b;
      pointer-events: none;
      display: flex;
      align-items: center;
    }

    .dropdown-search-input {
      width: 100%;
      background: #080c14;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 6px 26px 6px 28px;
      color: #ffffff;
      font-size: 0.76rem;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    .dropdown-search-input:focus {
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 0 1px var(--glow-color, #00aaff), 0 0 10px rgba(0, 170, 255, 0.25);
    }

    .dropdown-search-input::placeholder {
      color: #64748b;
    }

    .clear-search-btn {
      position: absolute;
      right: 6px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.95rem;
      line-height: 1;
      padding: 2px 4px;
      display: flex;
      align-items: center;
    }

    .clear-search-btn:hover {
      color: #ffffff;
    }

    .category-pills-row {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }

    .category-pills-row::-webkit-scrollbar {
      display: none;
    }

    .cat-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.14s ease;
    }

    .cat-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
      border-color: rgba(255, 255, 255, 0.16);
    }

    .cat-btn.active {
      background: rgba(0, 170, 255, 0.18);
      border-color: #00aaff;
      color: #38bdf8;
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.2);
    }

    /* Scrollable Dropdown Options List */
    .dropdown-options-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px;
      max-height: 240px;
      overflow-y: auto;
      overscroll-behavior: contain;
      box-sizing: border-box;
    }

    .dropdown-options-list::-webkit-scrollbar {
      width: 5px;
    }
    .dropdown-options-list::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    .dropdown-options-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }
    .dropdown-options-list::-webkit-scrollbar-thumb:hover {
      background: var(--glow-color, #00aaff);
    }

    /* Option Item Rows */
    .model-option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 9px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: all 0.14s ease;
      user-select: none;
      box-sizing: border-box;
    }

    .model-option-row:hover {
      background: rgba(22, 30, 48, 0.95);
      border-color: rgba(0, 170, 255, 0.35);
      transform: translateX(1px);
    }

    .model-option-row:active {
      transform: translateX(0);
    }

    .model-option-row.is-active {
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.15) 0%, rgba(15, 20, 32, 0.95) 100%);
      border-color: rgba(0, 170, 255, 0.6);
      box-shadow: inset 0 0 10px rgba(0, 170, 255, 0.15);
    }

    /* Auto-Router Special Item */
    .model-option-row.auto-router-row {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 20, 32, 0.9) 100%);
      border-color: rgba(168, 85, 247, 0.35);
    }

    .model-option-row.auto-router-row:hover {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(22, 30, 48, 0.95) 100%);
      border-color: rgba(168, 85, 247, 0.6);
    }

    .model-option-row.auto-router-row.is-active {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(15, 20, 32, 0.95) 100%);
      border-color: #a855f7;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.25), inset 0 0 8px rgba(168, 85, 247, 0.2);
    }

    .option-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .option-title-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .option-name {
      font-size: 0.78rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
    }

    .option-tag {
      font-family: var(--font-mono, monospace);
      font-size: 0.65rem;
      color: #94a3b8;
    }

    .cat-badge {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-family: var(--font-mono, monospace);
    }

    .cat-fast { background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.25); }
    .cat-coding { background: rgba(0, 170, 255, 0.12); color: #38bdf8; border: 1px solid rgba(0, 170, 255, 0.25); }
    .cat-reasoning { background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25); }
    .cat-vision { background: rgba(244, 114, 182, 0.12); color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.25); }
    .cat-general { background: rgba(96, 165, 250, 0.12); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.25); }
    .cat-auto { background: rgba(168, 85, 247, 0.25); color: #f3e8ff; border: 1px solid rgba(168, 85, 247, 0.5); }

    .option-details-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.67rem;
      color: #94a3b8;
      flex-wrap: wrap;
    }

    .option-spec {
      font-family: var(--font-mono, monospace);
      font-weight: 600;
      color: #cbd5e1;
    }

    .option-vram-tag {
      font-size: 0.60rem;
      color: #4ade80;
      background: rgba(34, 197, 94, 0.1);
      padding: 0 4px;
      border-radius: 2px;
    }

    /* Active Selection Badge on the Right */
    .active-indicator-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.4px;
      background: rgba(34, 197, 94, 0.18);
      border: 1px solid rgba(34, 197, 94, 0.5);
      color: #4ade80;
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.2);
    }

    .active-indicator-badge.auto {
      background: rgba(168, 85, 247, 0.22);
      border-color: rgba(168, 85, 247, 0.6);
      color: #f3e8ff;
      box-shadow: 0 0 8px rgba(168, 85, 247, 0.3);
    }

    /* Model Status Badges & Action Buttons */
    .model-action-container {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .status-badge-pill {
      font-size: 0.60rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      text-transform: uppercase;
      font-family: var(--font-mono, monospace);
    }

    .status-badge-pill.installed {
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
    }

    .status-badge-pill.not-installed {
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #94a3b8;
    }

    .download-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.18) 0%, rgba(0, 102, 204, 0.25) 100%);
      border: 1px solid rgba(0, 170, 255, 0.5);
      color: #38bdf8;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.15);
    }

    .download-action-btn:hover {
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.35) 0%, rgba(0, 102, 204, 0.45) 100%);
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(0, 170, 255, 0.35);
      transform: translateY(-1px);
    }

    .download-action-btn.retry-btn {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.5);
      color: #fb7185;
    }

    .download-action-btn.retry-btn:hover {
      background: rgba(244, 63, 94, 0.3);
      border-color: #f43f5e;
      color: #ffffff;
    }

    /* Downloading progress pill inside row */
    .download-progress-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 170, 255, 0.12);
      border: 1px solid rgba(0, 170, 255, 0.4);
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 0.64rem;
      color: #38bdf8;
      font-weight: 700;
      white-space: nowrap;
      font-family: var(--font-mono, monospace);
    }

    .download-spinner-mini {
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(56, 189, 248, 0.3);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spinMini 0.8s linear infinite;
    }

    @keyframes spinMini {
      to { transform: rotate(360deg); }
    }

    .progress-bar-sub {
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 3px;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00aaff, #38bdf8);
      transition: width 0.2s ease;
    }

    .empty-results-msg {
      text-align: center;
      padding: 16px 10px;
      color: #94a3b8;
      font-size: 0.74rem;
    }

    /* Footer Tools */
    .dropdown-footer {
      padding: 8px 10px;
      background: #0f1422;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .footer-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.67rem;
      color: #94a3b8;
    }

    .status-badge-inline {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: var(--font-mono, monospace);
    }

    .status-dot-sm {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 5px #22c55e;
    }

    .status-dot-sm.offline {
      background: #f43f5e;
      box-shadow: 0 0 4px #f43f5e;
    }

    .rescan-action-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.66rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .rescan-action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .rescan-action-btn.spinning {
      opacity: 0.6;
      pointer-events: none;
    }

    .custom-input-bar {
      display: flex;
      gap: 5px;
      width: 100%;
    }

    .custom-tag-field {
      flex: 1;
      background: #080c14;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      padding: 4px 8px;
      color: #ffffff;
      font-family: var(--font-mono, monospace);
      font-size: 0.72rem;
      outline: none;
    }

    .custom-tag-field:focus {
      border-color: var(--glow-color, #00aaff);
    }

    .custom-tag-submit-btn {
      background: rgba(0, 170, 255, 0.18);
      border: 1px solid rgba(0, 170, 255, 0.4);
      color: #38bdf8;
      font-weight: 700;
      font-size: 0.70rem;
      padding: 4px 8px;
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .custom-tag-submit-btn:hover {
      background: var(--glow-color, #00aaff);
      color: #000000;
    }

    /* Modal Backdrop for Full Catalog Mode (if invoked) */
    .catalog-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 5, 10, 0.82);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      animation: fadeIn 0.16s ease-out;
    }

    .catalog-modal-box {
      width: 100%;
      max-width: 840px;
      max-height: 85vh;
      background: #0b0f19;
      border: 1px solid rgba(0, 170, 255, 0.35);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 170, 255, 0.15);
    }

    .catalog-modal-header {
      padding: 12px 18px;
      background: #0f1422;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .catalog-modal-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .catalog-modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }

    .catalog-modal-close:hover {
      color: #f43f5e;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.fetchModels();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('click', this.handleDocumentClick, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('click', this.handleDocumentClick, true);
  }

  willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('activeModel')) {
      const m = (this.activeModel || '').toLowerCase().trim();
      this.isAutoRouting = !m || m === 'auto' || m === 'auto-router' || m === 'router' || m === 'smart router';
    }
  }

  private handleDocumentClick = (e: MouseEvent) => {
    if (!this.isOpen) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) {
      this.isOpen = false;
      this.requestUpdate();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (this.isModalOpen) {
        this.closeFullCatalogModal();
      } else if (this.isOpen) {
        this.isOpen = false;
        this.requestUpdate();
      }
    }
  };

  public async fetchModels() {
    this.isLoading = true;
    this.requestUpdate();
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data: ModelSelectorState = await res.json();
        if (data.models && data.models.length > 0) {
          this.models = data.models;
        }
        this.runningModels = data.runningModels || [];
        this.isOllamaRunning = Boolean(data.ollamaRunning);
        this.ollamaHost = data.ollamaHost || 'http://localhost:11434';
        if (data.activeModel) {
          const m = data.activeModel.toLowerCase().trim();
          const isAutoBackend = Boolean(data.isAutoRouting || m === 'auto' || m === 'auto-router' || m === 'router');
          this.activeModel = isAutoBackend ? 'auto' : data.activeModel;
          this.isAutoRouting = isAutoBackend;
        }
      }
    } catch (err) {
      console.info('Operating with local model catalog & neural router.');
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  public toggleDropdown() {
    this.isOpen = !this.isOpen;
    soundFX.playClick();
    if (this.isOpen) {
      this.fetchModels();
    }
  }

  public openModal() {
    // Open dropdown or catalog
    this.isOpen = true;
    soundFX.playClick();
    this.fetchModels();
  }

  public closeModal() {
    this.isOpen = false;
    this.isModalOpen = false;
    soundFX.playClick();
  }

  public openFullCatalogModal() {
    this.isModalOpen = true;
    this.isOpen = false;
    soundFX.playClick();
    this.fetchModels();
  }

  public closeFullCatalogModal() {
    this.isModalOpen = false;
    soundFX.playClick();
  }

  public async pullModel(modelName: string, e?: Event) {
    if (e) {
      e.stopPropagation();
    }
    soundFX.playClick();

    const clean = modelName.trim();
    if (this.downloadingModels[clean]) {
      return; // Already downloading
    }

    this.downloadingModels = {
      ...this.downloadingModels,
      [clean]: { percent: 0, status: 'Connecting...' }
    };
    this.showToast(`Starting download of ${clean}...`, 'info');
    this.requestUpdate();

    try {
      const response = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: clean }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(trimmed.slice(6));
              const percent = typeof data.percent === 'number' ? data.percent : (this.downloadingModels[clean]?.percent || 0);
              const status = data.message || data.status || 'Downloading...';

              if (data.status === 'success' || percent >= 100) {
                // Completed!
                const nextDownloads = { ...this.downloadingModels };
                delete nextDownloads[clean];
                this.downloadingModels = nextDownloads;

                // Update model in list to isInstalled = true
                this.models = this.models.map(m => m.name === clean ? { ...m, isInstalled: true } : m);
                this.showToast(`✓ Installed & Activated: ${clean}`, 'success');
                soundFX.playCommandAcknowledge();
                
                // Auto-activate the downloaded model immediately
                await this.switchModel(clean);
                return;
              } else if (data.status === 'error') {
                this.downloadingModels = {
                  ...this.downloadingModels,
                  [clean]: { percent, status: 'Download failed', error: data.error || 'Failed' }
                };
                this.showToast(`Failed downloading ${clean}`, 'error');
                return;
              } else {
                this.downloadingModels = {
                  ...this.downloadingModels,
                  [clean]: { percent, status }
                };
                this.requestUpdate();
              }
            } catch (err) {}
          }
        }
      }

      // Download complete cleanup
      const nextDownloads = { ...this.downloadingModels };
      delete nextDownloads[clean];
      this.downloadingModels = nextDownloads;
      this.models = this.models.map(m => m.name === clean ? { ...m, isInstalled: true } : m);
      this.showToast(`✓ Installed & Activated: ${clean}`, 'success');
      await this.switchModel(clean);
    } catch (err: any) {
      console.error('Model pull error:', err);
      this.downloadingModels = {
        ...this.downloadingModels,
        [clean]: { percent: 0, status: 'Download failed', error: err.message || 'Error' }
      };
      this.showToast(`Failed: ${err.message || 'Download error'}`, 'error');
    }
  }

  public async switchModel(modelName: string) {
    soundFX.playCommandAcknowledge();
    const raw = (modelName || '').toLowerCase().trim();
    const isAutoMode = !raw || raw === 'auto' || raw === 'auto-router' || raw === 'router' || raw === 'smart router';
    const targetModel = isAutoMode ? 'auto' : modelName.trim();

    // Check if model is not installed yet and not auto mode
    if (!isAutoMode) {
      const modelObj = this.models.find(m => m.name === targetModel || m.name.toLowerCase() === raw);
      if (modelObj && modelObj.isInstalled === false) {
        // Trigger download for not installed model
        this.showToast(`Starting installation of ${targetModel}...`, 'info');
        this.pullModel(targetModel);
        return;
      }
    }

    this.activeModel = targetModel;
    this.isAutoRouting = isAutoMode;
    this.isOpen = false;
    this.isModalOpen = false;
    localStorage.setItem('project_lumin_active_model', targetModel);
    this.requestUpdate();

    try {
      const res = await fetch('/api/models/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: targetModel }),
      });
      if (res.ok) {
        this.showToast(`Active engine: ${isAutoMode ? '⚡ Auto-Router' : targetModel}`, 'success');
      } else {
        this.showToast(`Active model: ${isAutoMode ? '⚡ Auto-Router' : targetModel}`, 'info');
      }
    } catch (err: any) {
      this.showToast(`Active model: ${isAutoMode ? '⚡ Auto-Router' : targetModel}`, 'info');
    }

    this.dispatchEvent(new CustomEvent('model-selected', {
      detail: { model: targetModel, isAuto: isAutoMode },
      bubbles: true,
      composed: true,
    }));
  }

  public isAuto(modelName?: string): boolean {
    if (modelName !== undefined) {
      const m = modelName.toLowerCase().trim();
      return !m || m === 'auto' || m === 'auto-router' || m === 'router' || m === 'smart router';
    }
    const current = (this.activeModel || '').toLowerCase().trim();
    return this.isAutoRouting || !current || current === 'auto' || current === 'auto-router' || current === 'router' || current === 'smart router';
  }

  private handleCustomModelSubmit() {
    const trimmed = this.customModelInput.trim();
    if (trimmed) {
      this.switchModel(trimmed);
      this.customModelInput = '';
    }
  }

  private showToast(text: string, type: 'success' | 'info' | 'error' = 'info') {
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.switchNotification = { text, type };
    this.notificationTimeout = setTimeout(() => {
      this.switchNotification = null;
      this.requestUpdate();
    }, 3000);
    this.requestUpdate();
  }

  private getActiveModelInfo(): OllamaModelInfo | null {
    if (this.isAuto()) return null;
    const current = (this.activeModel || '').toLowerCase().trim();
    return this.models.find(m => {
      const name = m.name.toLowerCase();
      return name === current || current.startsWith(name.split(':')[0]) || m.displayName.toLowerCase() === current;
    }) || null;
  }

  render() {
    const isCurrentAuto = this.isAuto();
    const activeInfo = this.getActiveModelInfo();
    const displayName = isCurrentAuto ? 'Auto-Router' : (activeInfo?.displayName || this.activeModel);
    const vramStatus = isCurrentAuto ? '⚡ AUTO' : (activeInfo?.isLoadedInVram ? 'VRAM' : (activeInfo ? activeInfo.parameterSize : 'ACTIVE'));

    // Filter models
    const filteredModels = this.models.filter(m => {
      if (this.selectedCategory === 'vram') {
        if (!m.isLoadedInVram && !this.runningModels.includes(m.name)) return false;
      } else if (this.selectedCategory !== 'all') {
        if (m.category !== this.selectedCategory) return false;
      }
      const q = this.searchQuery.toLowerCase().trim();
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || 
             m.displayName.toLowerCase().includes(q) || 
             m.recommendedUse.toLowerCase().includes(q) ||
             m.family.toLowerCase().includes(q);
    });

    return html`
      <div class="model-selector-wrapper" id="lumin-model-selector-container">
        
        <!-- Primary Trigger Dropdown Button -->
        <button 
          type="button"
          class="model-dropdown-trigger ${isCurrentAuto ? 'is-auto' : ''} ${this.isOpen ? 'is-open' : ''}" 
          @click=${this.toggleDropdown}
          id="lumin-model-selector-trigger"
          title="Active Model Routing: ${displayName} • Click to select model"
          aria-haspopup="listbox"
          aria-expanded="${this.isOpen}"
        >
          <div class="trigger-left-group">
            <span class="trigger-icon-badge ${isCurrentAuto ? 'auto' : ''}">
              ${isCurrentAuto ? '⚡' : '🧠'}
            </span>
            <span class="trigger-model-title">${displayName}</span>
          </div>

          <div class="trigger-right-group">
            <span class="trigger-vram-tag ${isCurrentAuto ? 'auto' : ''}">${vramStatus}</span>
            <span class="trigger-chevron">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
        </button>

        <!-- Dynamic Feedback Notification Toast -->
        ${this.switchNotification ? html`
          <div class="dropdown-toast ${this.switchNotification.type}">
            <span>${this.switchNotification.type === 'success' ? '✓' : 'ℹ'}</span>
            <span>${this.switchNotification.text}</span>
          </div>
        ` : ''}

        <!-- Populated Dropdown Selection Panel -->
        ${this.isOpen ? html`
          <div class="model-dropdown-panel" id="model-dropdown-options-panel" role="listbox">
            
            <!-- Search & Quick Category Filters Header -->
            <div class="dropdown-header-toolbar" @click=${(e: Event) => e.stopPropagation()}>
              <div class="search-input-box">
                <span class="search-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input 
                  type="text" 
                  class="dropdown-search-input" 
                  placeholder="Filter models, tags, architecture..." 
                  .value=${this.searchQuery}
                  @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
                />
                ${this.searchQuery ? html`
                  <button class="clear-search-btn" @click=${() => { this.searchQuery = ''; }} title="Clear search">×</button>
                ` : ''}
              </div>

              <div class="category-pills-row">
                <button type="button" class="cat-btn ${this.selectedCategory === 'all' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'all'; soundFX.playClick(); }}>All</button>
                <button type="button" class="cat-btn ${this.selectedCategory === 'fast' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'fast'; soundFX.playClick(); }}>⚡ Fast</button>
                <button type="button" class="cat-btn ${this.selectedCategory === 'coding' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'coding'; soundFX.playClick(); }}>💻 Code</button>
                <button type="button" class="cat-btn ${this.selectedCategory === 'reasoning' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'reasoning'; soundFX.playClick(); }}>🧠 Logic</button>
                <button type="button" class="cat-btn ${this.selectedCategory === 'vision' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'vision'; soundFX.playClick(); }}>👁️ Vision</button>
                <button type="button" class="cat-btn ${this.selectedCategory === 'vram' ? 'active' : ''}" @click=${() => { this.selectedCategory = 'vram'; soundFX.playClick(); }}>⭐ In VRAM</button>
              </div>
            </div>

            <!-- Scrollable Options List -->
            <div class="dropdown-options-list">
              
              <!-- Auto-Router Dynamic Intent Option -->
              ${(this.selectedCategory === 'all' || this.selectedCategory === 'fast') && !this.searchQuery ? html`
                <div 
                  class="model-option-row auto-router-row ${isCurrentAuto ? 'is-active' : ''}"
                  @click=${() => this.switchModel('auto')}
                  role="option"
                  aria-selected="${isCurrentAuto}"
                  id="model-option-auto-router"
                >
                  <div class="option-info">
                    <div class="option-title-line">
                      <span style="color: #c084fc; font-size: 0.82rem;">⚡</span>
                      <span class="option-name" style="color: #f3e8ff;">Auto-Router</span>
                      <span class="cat-badge cat-auto">DYNAMIC</span>
                    </div>
                    <div class="option-details-line">
                      <span style="color: #d8b4fe;">Autonomous intent classification & optimal engine dispatch</span>
                    </div>
                  </div>

                  ${isCurrentAuto ? html`
                    <span class="active-indicator-badge auto">✓ ACTIVE</span>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Local & Catalog Models List -->
              ${filteredModels.map(model => {
                const isActive = !isCurrentAuto && (
                  this.activeModel === model.name || 
                  this.activeModel.toLowerCase() === model.name.toLowerCase() ||
                  (model.name.includes(':') && this.activeModel === model.name.split(':')[0]) ||
                  this.activeModel.toLowerCase() === model.displayName.toLowerCase()
                );

                const dlState = this.downloadingModels[model.name];
                const isDownloading = Boolean(dlState && !dlState.error);
                const hasError = Boolean(dlState?.error);
                const isInstalled = model.isInstalled !== false;

                return html`
                  <div 
                    class="model-option-row ${isActive ? 'is-active' : ''} ${!isInstalled ? 'is-not-installed' : ''}"
                    @click=${() => this.switchModel(model.name)}
                    role="option"
                    aria-selected="${isActive}"
                    id="model-option-${model.name.replace(/[^a-zA-Z0-9]/g, '-')}"
                  >
                    <div class="option-info">
                      <div class="option-title-line">
                        <span class="option-name">${model.displayName}</span>
                        <span class="cat-badge cat-${model.category}">${model.category}</span>
                        <span class="option-tag">${model.name}</span>
                      </div>
                      <div class="option-details-line">
                        <span class="option-spec">${model.parameterSize}</span>
                        <span>•</span>
                        <span>${model.size}</span>
                        <span>•</span>
                        <span>${model.speedRating}</span>
                        ${model.isLoadedInVram ? html`<span class="option-vram-tag">VRAM</span>` : ''}
                      </div>

                      ${isDownloading ? html`
                        <div class="progress-bar-sub">
                          <div class="progress-bar-fill" style="width: ${dlState.percent || 10}%;"></div>
                        </div>
                      ` : ''}
                    </div>

                    <!-- Right Side Actions & Status Indicator -->
                    <div class="model-action-container" @click=${(e: Event) => e.stopPropagation()}>
                      ${isDownloading ? html`
                        <span class="download-progress-pill" title="${dlState.status}">
                          <div class="download-spinner-mini"></div>
                          <span>${dlState.percent > 0 ? `${dlState.percent}%` : 'Downloading'}</span>
                        </span>
                      ` : hasError ? html`
                        <button 
                          type="button"
                          class="download-action-btn retry-btn"
                          @click=${(e: Event) => this.pullModel(model.name, e)}
                          title="Download failed. Click to retry."
                        >
                          <span>⟳ Retry</span>
                        </button>
                      ` : !isInstalled ? html`
                        <button 
                          type="button"
                          class="download-action-btn"
                          @click=${(e: Event) => this.pullModel(model.name, e)}
                          title="Download ${model.displayName} to local storage (${model.size})"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <span>Get</span>
                        </button>
                      ` : isActive ? html`
                        <span class="active-indicator-badge">✓ ACTIVE</span>
                      ` : html`
                        <span class="status-badge-pill installed" title="Installed and ready">Ready</span>
                      `}
                    </div>
                  </div>
                `;
              })}

              ${filteredModels.length === 0 ? html`
                <div class="empty-results-msg">
                  <p style="margin: 0 0 6px 0;">No matching models found for "${this.searchQuery}".</p>
                  <button 
                    type="button" 
                    class="cat-btn active" 
                    @click=${() => { this.searchQuery = ''; this.selectedCategory = 'all'; }}
                  >
                    Reset Filters
                  </button>
                </div>
              ` : ''}

            </div>

            <!-- Footer: Daemon Status & Custom Tag Loader -->
            <div class="dropdown-footer" @click=${(e: Event) => e.stopPropagation()}>
              <div class="footer-status-bar">
                <div class="status-badge-inline">
                  <span class="status-dot-sm ${this.isOllamaRunning ? '' : 'offline'}"></span>
                  <span>${this.isOllamaRunning ? 'Ollama Daemon Online' : 'Catalog Standby'}</span>
                </div>
                <button 
                  type="button" 
                  class="rescan-action-btn ${this.isLoading ? 'spinning' : ''}" 
                  @click=${this.fetchModels}
                  title="Rescan installed local models"
                >
                  ${this.isLoading ? 'Scanning...' : '⟳ Rescan'}
                </button>
              </div>

              <div class="custom-input-bar">
                <input 
                  type="text" 
                  class="custom-tag-field" 
                  placeholder="Custom model tag (e.g. codellama:13b)"
                  .value=${this.customModelInput}
                  @input=${(e: Event) => { this.customModelInput = (e.target as HTMLInputElement).value; }}
                  @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.handleCustomModelSubmit(); }}
                />
                <button 
                  type="button" 
                  class="custom-tag-submit-btn" 
                  @click=${this.handleCustomModelSubmit}
                  title="Load custom Ollama tag"
                >
                  Load
                </button>
              </div>
            </div>

          </div>
        ` : ''}

      </div>
    `;
  }
}
