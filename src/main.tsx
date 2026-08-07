
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix: Removed unused HarmBlockThreshold and HarmCategory imports.
import {LitElement, PropertyValues, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createRef, ref, Ref} from 'lit/directives/ref.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {marked} from 'marked';
import {markedHighlight} from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import {blobToBase64, createBlob, decode, decodeAudioData, sanitizeTextForTTS} from './utils';
import {soundFX} from './sound-effects';

// Configure marked to use highlight.js
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// Configure DOMPurify to open links in a new tab
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
import './visual-3d';

const THEMES = {
  cyberware: {
    name: 'Cyberware',
    '--glow-color': '#00aaff',
    '--glow-color-faded': 'rgba(0, 170, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#a0a0e0',
    '--border-color': 'rgba(255, 255, 255, 0.1)',
  },
  crimson: {
    name: 'Crimson Rogue',
    '--glow-color': '#ff2a2a',
    '--glow-color-faded': 'rgba(255, 42, 42, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#f0e0e0',
    '--text-secondary': '#b09090',
    '--border-color': 'rgba(255, 200, 200, 0.1)',
  },
  matrix: {
    name: 'Emerald Matrix',
    '--glow-color': '#00ff7f',
    '--glow-color-faded': 'rgba(0, 255, 127, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#d0f0d0',
    '--text-secondary': '#90b090',
    '--border-color': 'rgba(200, 255, 200, 0.1)',
  },
  solar: {
    name: 'Solar Flare',
    '--glow-color': '#ffae00',
    '--glow-color-faded': 'rgba(255, 174, 0, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#fff0d0',
    '--text-secondary': '#b0a080',
    '--border-color': 'rgba(255, 240, 200, 0.1)',
  },
  arcane: {
    name: 'Arcane Violet',
    '--glow-color': '#cc55ff',
    '--glow-color-faded': 'rgba(204, 85, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e8d8f8',
    '--text-secondary': '#a898b8',
    '--border-color': 'rgba(230, 210, 255, 0.1)',
  },
  glacial: {
    name: 'Glacial Ice',
    '--glow-color': '#7DF9FF',
    '--glow-color-faded': 'rgba(125, 249, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#f0f8ff',
    '--text-secondary': '#a0b0c0',
    '--border-color': 'rgba(220, 240, 255, 0.1)',
  },
  golden: {
    name: 'Golden Age',
    '--glow-color': '#ffd700',
    '--glow-color-faded': 'rgba(255, 215, 0, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#fff5e0',
    '--text-secondary': '#bba888',
    '--border-color': 'rgba(255, 245, 220, 0.1)',
  },
  hotpink: {
    name: 'Hot Pink',
    '--glow-color': '#ff00c8',
    '--glow-color-faded': 'rgba(255, 0, 200, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#ffebf9',
    '--text-secondary': '#bb8bb0',
    '--border-color': 'rgba(255, 220, 250, 0.1)',
  },
  aqua: {
    name: 'Aquamarine',
    '--glow-color': '#00fca1',
    '--glow-color-faded': 'rgba(0, 252, 161, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e0fff8',
    '--text-secondary': '#88bba8',
    '--border-color': 'rgba(200, 255, 240, 0.1)',
  },
  tungsten: {
    name: 'Tungsten',
    '--glow-color': '#cccccc',
    '--glow-color-faded': 'rgba(204, 204, 204, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#ffffff',
    '--text-secondary': '#bbbbbb',
    '--border-color': 'rgba(255, 255, 255, 0.15)',
  },
};




type TranscriptionEntry = {
  speaker: 'user' | 'ai';
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileUri?: string;
  mimeType?: string;
  fileName?: string;
  isLoading?: boolean;
  responseTime?: number;
  ttsAudioBuffer?: AudioBuffer;
  voiceName?: string;
  citations?: {
    web?: {uri: string; title?: string};
    maps?: {uri: string; title?: string};
  }[];
};

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() private isTerminalOpen = false;
  @state() private isTerminalEnabled = false;
  @state() private isTerminalTabActive = true;
  @state() private terminalOpacity = 0.5;
  @state() private terminalPosition: 'left' | 'right' | 'top' | 'bottom' = 'right';
  @state() private isTerminalAutoOpenOnHover = localStorage.getItem('project_lumin_terminal_auto_open_hover') === 'true';
  @state() private isDraggingTab = false;
  private tabDragStartX = 0;
  private tabDragStartY = 0;
  private hasTabDragged = false;
  @state() private terminalWidth = Number(localStorage.getItem('project_lumin_terminal_width') || '420');
  @state() private terminalHeight = Number(localStorage.getItem('project_lumin_terminal_height') || '320');
  @state() private isDraggingResizer = false;
  @state() private isAgentRunning = false;
  @state() private isStartingAgent = false;
  @state() private isStoppingAgent = false;
  @state() private terminalLogs = '';
  @state() private terminalInput = '';
  @state() private isTerminalVoiceCaptureActive = false;
  @state() private terminalFontSize = Number(localStorage.getItem('project_lumin_terminal_font_size') || '14');
  @state() private terminalIsBold = localStorage.getItem('project_lumin_terminal_is_bold') !== 'false';
  @state() private chatFontSize: 'smaller' | 'default' | 'larger' = (localStorage.getItem('project_lumin_chat_font_size') as any) || 'default';
  @state() private chatFontBold = localStorage.getItem('project_lumin_chat_font_bold') === 'true';
  @state() private userName = localStorage.getItem('project_lumin_user_name') || 'You';
  @state() private systemName = localStorage.getItem('project_lumin_system_name') || 'LUMIN';
  @state() private userAvatar = localStorage.getItem('project_lumin_user_avatar') || 'U';
  @state() private systemAvatar = localStorage.getItem('project_lumin_system_avatar') || 'S';
  @state() private isAutoLaunchOnWakeWord = localStorage.getItem('project_lumin_auto_launch_wake') === 'true';
  @state() private isAutoStopOnSleepWord = localStorage.getItem('project_lumin_auto_stop_sleep') === 'true';
  @state() private autoPlayTTS = localStorage.getItem('project_lumin_auto_play_tts') === 'true';
  @state() private isDraggingFile = false;
  private terminalScreenRef: Ref<HTMLDivElement> = createRef();
  @state() status = '';
  @state() error = '';
  @state() isSettingsOpen = false;
  @state() private activePlatform = 'Ollama';
  @state() private activeModelName = 'llama3.2:3b';
  @state() private ollamaModel = 'llama3';
  @state() private piperVoice = 'en-US-JennyNeural';
  @state() private ttsMode: 'full' | 'short' | 'off' = (localStorage.getItem('project_lumin_tts_mode') as any) || 'full';
  @state() private llmCommandTemplate = 'ollama run {model} "{prompt}"';
  @state() private isMcpEnabled = false;
  @state() private activeSettingsTab:
    | 'GENERAL'
    | 'MCP'
    | 'POST_PROCESSING'
    | 'GLOW_EFFECTS'
    | 'GEOMETRY'
    | 'ENVIRONMENT'
    | 'THEMES'
    | 'VOICE_COMMANDS' = 'GENERAL';
  @state() private activeVisualsTab: number = 0;
  @state() isReconnecting = false;
  @state() isPendingSleep = false;
  private isSessionOpen = false;
  private recognitionPausedByTTS = false;
  private lastTTSFinishedTime = 0;
  private isSwitchingVoice = false;
  @state() private areActionsExpanded = false;
  @state() private isFullscreen = false;
  @state() private isIdle = true;
  private idleTimeout: any = null;
  private reconnectAttempts = 0;

  // Settings state
                @state() masterEffectsEnabled = true;
  @state() isReverbEnabled = false;
  @state() isDelayEnabled = false;
  @state() isFlangerEnabled = false;
  @state() private particleSize = 0.05;
  @state() private particleSpeed = 1.0;
  @state() private particleShape = 'saturn';
  @state() private visualizerShape = 'sphere';
  @state() private visualizerSize = 2.0;
  @state() private visualizerSpeed = 1.0;
  @state() private bloomIntensity = 0.5;
  @state() private bloomRadius = 0.35;
  @state() private bloomThreshold = 0.25;
  @state() private activeTheme: keyof typeof THEMES | 'custom' = 'cyberware';
  @state() private voiceMode: 'single' | 'continuous' = 'single';
  @state() private isContinuousActive = false;
  private micClickTimeout: any = null;
  private vadAnalyser: AnalyserNode | null = null;
  private vadInterval: any = null;
  private speechDetected = false;
  private lastSpeechTime = 0;
  private vadThreshold = 0.012; // RMS amplitude threshold for speech detection
  @state() private customThemeColors = ['#00aaff', '#ff2a2a', '#00ff7f', '#ffae00', '#cc55ff', '#ffd700', '#00fca1', '#ff00c8'];
  @state() private separateCustomColors = false;
  @state() private customMainColor = '#00aaff';
  @state() private customParticleColor = '#ff2a2a';
  @state() private showParticles = true;
  @state() private showMainVisualizer = true;
  @state() private globalScale = 1.0;
  @state() private enableMicrophone = false;
  @state() private enableDesktopAudio = false;
  @state() private activateWord = 'wake up';
  @state() private sleepCommandWord = 'go to sleep';
  private lastSleepTimestamp = 0;
  @state() private offlineMode = false;
  @state() afterimageEnabled = false;
  @state() afterimageStrength = 0.85;
  @state() chromaticAberrationEnabled = false;
  @state() chromaticAberrationIntensity = 0.005;
  @state() morphingEnabled = false;
  @state() morphingIntensity = 1.0;
  @state() filmGrainEnabled = false;
  @state() filmGrainIntensity = 0.35;
  @state() glowPulseStrength = 0.0;
  @state() themeTransitionSpeed = 1.0;
  
  @state() cameraRotX = 0;
  @state() cameraRotY = 0;
  @state() cameraZoomMult = 1.0;
  @state() cameraLocked = false;
  
  @state() private initialMasterEffectsEnabled = true;

  @state() private initialReverbState = false;
  @state() private initialDelayState = false;
  @state() private initialFlangerState = false;
  @state() private initialParticleSize = 0.05;
  @state() private initialParticleSpeed = 1.0;
  @state() private initialParticleShape = 'saturn';
  @state() private initialVisualizerShape = 'sphere';
  @state() private initialVisualizerSize = 2.0;
  @state() private initialVisualizerSpeed = 1.0;
  @state() private initialBloomIntensity = 0.5;
  @state() private initialBloomRadius = 0.35;
  @state() private initialBloomThreshold = 0.25;
  @state() private initialTheme: keyof typeof THEMES | 'custom' = 'cyberware';
  @state() private initialCustomThemeColors = ['#00aaff', '#ff2a2a', '#00ff7f', '#ffae00', '#cc55ff', '#ffd700', '#00fca1', '#ff00c8'];
  @state() private initialSeparateCustomColors = false;
  @state() private initialCustomMainColor = '#00aaff';
  @state() private initialCustomParticleColor = '#ff2a2a';
  @state() private initialShowParticles = true;
  @state() private initialShowMainVisualizer = true;
  @state() private initialGlobalScale = 1.0;
  @state() private initialEnableMicrophone = false;
  @state() private initialEnableDesktopAudio = false;
  @state() private initialActivateWord = 'wake up';
  @state() private initialSleepCommandWord = 'go to sleep';
  @state() private initialOfflineMode = false;
  @state() private initialAfterimageEnabled = false;
  @state() private initialAfterimageStrength = 0.85;
  @state() private initialChromaticAberrationEnabled = false;
  @state() private initialChromaticAberrationIntensity = 0.005;
  @state() private initialMorphingEnabled = false;
  @state() private initialMorphingIntensity = 1.0;
  @state() private initialFilmGrainEnabled = false;
  @state() private initialFilmGrainIntensity = 0.35;
  @state() private initialGlowPulseStrength = 0.0;
  @state() private initialThemeTransitionSpeed = 1.0;
  @state() metalness = 0.1;
  @state() roughness = 0.7;
  @state() rotationSpeed = 1.0;
  @state() rotationLocked = true;
  @state() autoPanEnabled = true;
  @state() autoPanSpeed = 1.0;
  @state() directionalLightIntensity = 1.2;
  @state() ambientLightIntensity = 0.15;

  @state() private initialMetalness = 0.1;
  @state() private initialRoughness = 0.7;
  @state() private initialRotationSpeed = 1.0;
  @state() private initialRotationLocked = true;
  @state() private initialAutoPanEnabled = true;
  @state() private initialAutoPanSpeed = 1.0;
  @state() private initialDirectionalLightIntensity = 1.2;
  @state() private initialAmbientLightIntensity = 0.15;
  @state() private initialWakeWord = 'Activate command protocol';
  @state() private initialSleepWord = 'Goodbye';

  // Fix: The title property from grounding chunks can be optional. Update type.
  @state() private searchCitations: {web: {uri: string; title?: string}}[] = [];

  // New state for transcription and camera
  @state() private isCameraEnabled = false;
  @state() private isScreenSharingEnabled = false;
  @state() private isTranscriptionVisible = false;
  @state() private inputTranscription = '';
  @state() private outputTranscription = '';
  @state() private transcriptionHistory: TranscriptionEntry[] = [];
  @state() private terminalPaneHeight = Number(localStorage.getItem('project_lumin_terminal_pane_height') || '220');
  // Terminal pane default state: starts minimized on initial page load
  @state() private isTerminalPaneCollapsed = true;
  @state() private isDraggingTerminalPaneResizer = false;
  @state() private videoDevices: MediaDeviceInfo[] = [];
  @state() private activeVideoDeviceId: string | null = null;
  private videoRef: Ref<HTMLVideoElement> = createRef();
  private screenVideoRef: Ref<HTMLVideoElement> = createRef();
  private canvasRef: Ref<HTMLCanvasElement> = createRef();
  private frameInterval: any = null;
  private screenFrameInterval: any = null;
  private videoStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private screenAudioSourceNode: MediaStreamAudioSourceNode | null = null;
  private wakeLock: any = null;
  private recognition: any = null;
  private isRecognitionActive = false;
  private initSpeechOnInteractionBound = () => {
    this.initSpeechRecognition();
    document.removeEventListener('click', this.initSpeechOnInteractionBound);
    document.removeEventListener('touchstart', this.initSpeechOnInteractionBound);
    document.removeEventListener('keydown', this.initSpeechOnInteractionBound);
  };

  @state() private isDraggingCamera = false;
  @state() private cameraPosition = { x: 0, y: 0 };
  @state() private isDraggingScreen = false;
  @state() private screenPosition = { x: 0, y: 0 };
  private dragStart = { x: 0, y: 0 };
  private initialCameraPosition = { x: 0, y: 0 };
  private initialScreenPosition = { x: 0, y: 0 };
  private cameraViewRef: Ref<HTMLDivElement> = createRef();
  private screenViewRef: Ref<HTMLDivElement> = createRef();

  private handleCameraDragStart(e: MouseEvent | TouchEvent) {
    if (!this.isCameraEnabled) return;
    this.isDraggingCamera = true;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    this.dragStart = { x: clientX, y: clientY };
    this.initialCameraPosition = { ...this.cameraPosition };

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!this.isDraggingCamera) return;
      
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      const deltaX = currentX - this.dragStart.x;
      const deltaY = currentY - this.dragStart.y;
      
      let newX = this.initialCameraPosition.x + deltaX;
      let newY = this.initialCameraPosition.y + deltaY;

      // Constrain to screen boundaries
      if (this.cameraViewRef.value) {
        const rect = this.cameraViewRef.value.getBoundingClientRect();
        const padding = 40; // Keep at least 40px visible
        
        const newLeft = rect.left - this.cameraPosition.x + newX;
        const newRight = newLeft + rect.width;
        const newTop = rect.top - this.cameraPosition.y + newY;
        const newBottom = newTop + rect.height;
        
        if (newRight < padding) {
          newX += padding - newRight;
        }
        if (newLeft > window.innerWidth - padding) {
          newX -= newLeft - (window.innerWidth - padding);
        }
        if (newBottom < padding) {
          newY += padding - newBottom;
        }
        if (newTop > window.innerHeight - padding) {
          newY -= newTop - (window.innerHeight - padding);
        }
      }
      
      this.cameraPosition = { x: newX, y: newY };
    };

    const handleDragEnd = () => {
      this.isDraggingCamera = false;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
  }

  private handleScreenDragStart(e: MouseEvent | TouchEvent) {
    if (!this.isScreenSharingEnabled) return;
    this.isDraggingScreen = true;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    this.dragStart = { x: clientX, y: clientY };
    this.initialScreenPosition = { ...this.screenPosition };

    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!this.isDraggingScreen) return;
      
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      const dx = currentX - this.dragStart.x;
      const dy = currentY - this.dragStart.y;
      
      this.screenPosition = {
        x: this.initialScreenPosition.x + dx,
        y: this.initialScreenPosition.y + dy
      };
    };

    const handleDragEnd = () => {
      this.isDraggingScreen = false;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('touchmove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
  }

  // New state for text chat
  @state() private chatInputText = '';
  @state() private attachedFiles: Array<{
    data?: string;
    fileUri?: string;
    mimeType: string;
    name: string;
    type: 'image' | 'video' | 'file';
    extractedText?: string;
    sizeStr?: string;
  }> = [];

  private get attachedFile() {
    return this.attachedFiles.length > 0 ? this.attachedFiles[0] : null;
  }

  private set attachedFile(val: any) {
    if (!val) {
      this.attachedFiles = [];
    } else {
      this.attachedFiles = [val];
    }
  }

  private removeAttachment(index: number) {
    this.attachedFiles = this.attachedFiles.filter((_, i) => i !== index);
  }
  @state() private isGeneratingResponse = false;
  @state() private responseTimer = 0;
  private responseTimerInterval: number | null = null;

  private startResponseTimer() {
    this.stopResponseTimer();
    this.responseTimer = 0;
    this.responseTimerInterval = window.setInterval(() => {
      this.responseTimer += 1;
    }, 1000);
  }

  private stopResponseTimer() {
    if (this.responseTimerInterval !== null) {
      clearInterval(this.responseTimerInterval);
      this.responseTimerInterval = null;
    }
  }
  @state() private playingTTSIndex: number | null = null;
  @state() private ttsPlaybackState: 'playing' | 'paused' | 'stopped' = 'stopped';
  private currentTTSSource: AudioBufferSourceNode | null = null;
  private currentTTSBuffer: AudioBuffer | null = null;
  private ttsStartedAt: number = 0;
  private ttsPausedAt: number = 0;
  @state() private ttsCurrentTime = 0;
  @state() private ttsDuration = 0;
  private ttsProgressTimer: any = null;
  private ttsProgressAnimationId: number | null = null;
  private isSeeking = false;
  private fileInputRef: Ref<HTMLInputElement> = createRef();
  private chatHistoryRef: Ref<HTMLDivElement> = createRef();

  // Fix: Cast window to `any` to allow for vendor prefixed `webkitAudioContext`.
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // Fix: Cast window to `any` to allow for vendor prefixed `webkitAudioContext`.
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  private micGainNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  @state() private audioDevices: MediaDeviceInfo[] = [];
  @state() private selectedMicAudioDeviceId = '';
  @state() private selectedDesktopAudioDeviceId = '';
  private initialSelectedMicAudioDeviceId = '';
  private initialSelectedDesktopAudioDeviceId = '';
  @state() private desktopDeviceStream: MediaStream | null = null;
  private desktopDeviceSourceNode: any = null;
  private voiceSubmitTimer: any = null;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();
  private micPausedByTTS = false;
  // Fix: The return type of `setTimeout` can be `number` (browser) or a `Timeout` object (Node). Using `any` accommodates both to prevent type errors.
  private restartMicTimer: any = null;
  private messageQueuePromise: Promise<void> = Promise.resolve();
  private keepAliveInterval: any = null;

  // Noise gate parameters to prevent Live API VAD from lingering
  @state() micSensitivity = 85; 
  private silenceFramesCount = 0;
  private hasSpokenInTurn = false;

  // Audio effect nodes
  private reverbNode: ConvolverNode;
  private reverbGain: GainNode;
  private delayNode: DelayNode;
  private delayGain: GainNode;
  private feedbackGain: GainNode;
  private dryGain: GainNode;
  private flangerNode: DelayNode;
  private flangerFeedback: GainNode;
  private flangerLFO: OscillatorNode;
  private flangerLFOGain: GainNode;
  private flangerWetGain: GainNode;

  static styles = css`
     :host {
      --glow-color: #00aaff;
      --glow-color-faded: rgba(0, 170, 255, 0.5);
      --background-primary: #000000;
      --background-secondary: rgba(0, 0, 0, 0.8);
      --border-color: rgba(255, 255, 255, 0.1);
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0e0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
        Roboto, Helvetica, Arial, sans-serif;
      -webkit-tap-highlight-color: transparent; /* Remove tap highlight on iOS */
    }

    /* Unified Sleek Custom Scrollbars */
    *::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    *::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
    }
    *::-webkit-scrollbar-thumb {
      background: var(--glow-color-faded);
      border-radius: 5px;
      border: 1px solid var(--border-color);
    }
    *::-webkit-scrollbar-thumb:hover {
      background: var(--glow-color);
    }

    .live-audio-container {
      position: absolute;
      inset: 0;
      height: 100%;
    }

    .hud {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 30px;
      /* Adjust padding for safe areas (notches, home bar) */
      padding-left: calc(30px + env(safe-area-inset-left));
      padding-right: calc(30px + env(safe-area-inset-right));
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      z-index: 110;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
    }

    .status-display {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
    }

    .status-text-container {
      display: flex;
      flex-direction: column;
      padding-top: 2px; /* Align text better with indicator */
    }

    .status-text-container span {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .error-message {
      color: #ff4141;
      font-size: 0.8rem;
      font-weight: 400;
      text-transform: none;
      letter-spacing: normal;
      margin-top: 4px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color);
      transition: background-color 0.3s, box-shadow 0.3s;
      margin-top: 4px; /* Align with first line of text */
    }

    .status-indicator.listening {
      animation: pulse-blue 2s infinite;
    }

    .status-indicator.recording {
      background-color: #ff4141;
      box-shadow: 0 0 12px #ff4141;
    }

    .status-indicator.speaking {
      background-color: #ffb800;
      box-shadow: 0 0 12px #ffb800;
      animation: pulse-yellow 1.5s infinite;
    }

    .status-indicator.switching {
      background-color: #a855f7;
      box-shadow: 0 0 12px #a855f7;
      animation: pulse-purple 1s infinite;
    }

    @keyframes pulse-blue {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.7;
      }
    }

    @keyframes pulse-purple {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.6;
      }
    }

    @keyframes pulse-yellow {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }

    .hud-actions {
      position: relative;
      display: flex;
      justify-content: flex-end;
      pointer-events: auto;
    }

    .actions-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .actions-menu {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      align-items: flex-end;
    }

    .actions-menu .hud-button {
      opacity: 0;
      transform: translateY(20px) scale(0.8);
      pointer-events: none;
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .actions-menu.expanded .hud-button {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    /* Staggered animation, from bottom to top (in visual order) */
    .actions-menu.expanded .hud-button:nth-last-child(1) {
      transition-delay: 0.2s;
    }
    .actions-menu.expanded .hud-button:nth-last-child(2) {
      transition-delay: 0.16s;
    }
    .actions-menu.expanded .hud-button:nth-last-child(3) {
      transition-delay: 0.12s;
    }
    .actions-menu.expanded .hud-button:nth-last-child(4) {
      transition-delay: 0.08s;
    }
    .actions-menu.expanded .hud-button:nth-last-child(5) {
      transition-delay: 0.04s;
    }
    .actions-menu.expanded .hud-button:nth-last-child(6) {
      transition-delay: 0s;
    }

    .actions-toggle-button {
      width: 48px;
      height: 48px;
      background: transparent;
      border: 1.5px solid var(--border-color);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s, transform 0.3s ease,
        border-color 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .actions-toggle-button:hover {
      transform: scale(1.05);
      background-color: var(--glow-color-faded);
      border-color: var(--glow-color);
    }
    .actions-toggle-button svg {
      width: 28px;
      height: 28px;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .actions-toggle-button.expanded svg {
      transform: rotate(45deg);
    }

    .hud-button {
      width: 44px;
      height: 44px;
      background: transparent;
      border: 1.5px solid var(--border-color);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s, border-color 0.2s, color 0.2s;
    }

    .hud-button:hover:not(:disabled) {
      background-color: var(--glow-color-faded);
      border-color: var(--glow-color);
    }

    .hud-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .hud-button.active {
      background-color: var(--glow-color);
      border-color: var(--glow-color);
      color: #000;
    }

    .hud-button.continuous {
      background-color: #34c759;
      border-color: #34c759;
      color: #000;
      animation: hud-mic-pulse-green 1.5s infinite ease-in-out;
    }

    @keyframes hud-mic-pulse-green {
      0% {
        box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(52, 199, 89, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(52, 199, 89, 0);
      }
    }

    .hud-button svg {
      width: 24px;
      height: 24px;
    }

    .settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 150;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .settings-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .settings-modal {
      display: flex;
      flex-direction: column;
      background: var(--background-secondary);
      color: var(--text-primary);
      border-radius: 16px;
      width: 90%;
      max-width: 800px;
      font-family: sans-serif;
      border: 1px solid var(--border-color);
      box-shadow: 0 0 30px var(--glow-color-faded);
      height: 75vh;
      min-height: 500px;
      max-height: 90vh;
      overflow: hidden;
      transform: scale(0.95);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .settings-modal-body {
      display: flex;
      flex: 1;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .settings-modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 16px;
    }

    .settings-overlay.open .settings-modal {
      transform: none;
    }

    .settings-nav {
      padding: 24px;
      border-right: 1px solid var(--border-color);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      width: 250px;
    }

    .config-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .config-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8rem;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .config-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--text-primary);
    }

    .settings-nav h2 {
      margin: 0 0 24px 0;
      font-size: 1.2rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--glow-color);
    }

    .settings-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .settings-nav button {
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      text-align: left;
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      transition: color 0.2s, background-color 0.2s;
    }

    .settings-nav button:hover {
      color: var(--text-primary);
      background-color: rgba(255, 255, 255, 0.05);
    }

    .settings-nav button.active {
      color: var(--text-primary);
      font-weight: 700;
      background-color: rgba(0, 170, 255, 0.1);
    }

    .settings-nav button.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 60%;
      background-color: var(--glow-color);
      border-radius: 0 4px 4px 0;
    }

    .settings-content {
      flex-grow: 1;
      padding: 24px 32px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .settings-modal *::-webkit-scrollbar {
      width: 10px;
    }
    .settings-modal *::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
    }
    .settings-modal *::-webkit-scrollbar-thumb {
      background: var(--glow-color-faded);
      border-radius: 5px;
      border: 1px solid var(--border-color);
    }
    .settings-modal *::-webkit-scrollbar-thumb:hover {
      background: var(--glow-color);
    }

    .settings-content h3 {
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 1.5rem;
    }

    .settings-modal form {
      display: flex;
      flex-direction: column;
      gap: 24px;
      flex-grow: 1;
    }

    .visuals-carousel {
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding-top: 16px;
      padding-bottom: 32px;
    }
    .visuals-carousel .form-section {
      width: 100%;
      box-sizing: border-box;
    }
    .visuals-sub-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: -8px; /* Pull it slightly closer to carousel */
    }
    .visuals-sub-tabs button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.85em;
      font-weight: 600;
      transition: all 0.2s;
    }
    .visuals-sub-tabs button:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .visuals-sub-tabs button.active {
      background: var(--glow-color-faded);
      color: var(--glow-color);
      border-color: var(--glow-color);
    }
    .custom-theme-colors input[type="color"] {
      -webkit-appearance: none;
      border: none;
      width: 100%;
      height: 36px;
      padding: 0;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
    }
    .custom-theme-colors input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    .custom-theme-colors input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 24px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 0px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .form-section h4 {
      font-size: 0.8rem;
      color: var(--glow-color);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-weight: 700;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      gap: 8px;
    }

    .setting-desc {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      margin-top: -4px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .form-field label {
      font-weight: 500;
      font-size: 0.9em;
      color: var(--text-primary);
      margin: 0;
    }
    
    .form-field-toggle {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      min-height: 52px;
    }

    .settings-modal input[type='text'],
    .settings-modal textarea,
    .settings-modal select {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 1em;
      padding: 12px 16px;
      transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }

    .settings-modal input[type='text']:focus,
    .settings-modal textarea:focus,
    .settings-modal select:focus {
      border-color: var(--glow-color);
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 0 1px var(--glow-color);
    }

    .settings-modal select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-size: 16px;
      padding-right: 40px;
      cursor: pointer;
    }

    .settings-modal select option {
      background-color: var(--background-secondary);
      color: var(--text-primary);
    }

    /* Fix for browser autofill background */
    .settings-modal input[type='text']:-webkit-autofill,
    .settings-modal textarea:-webkit-autofill,
    .settings-modal input[type='text']:-webkit-autofill:hover, 
    .settings-modal input[type='text']:-webkit-autofill:focus, 
    .settings-modal input[type='text']:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px var(--background-secondary) inset !important;
      -webkit-text-fill-color: var(--text-primary) !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    .settings-modal textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-field-toggle {
      /* now part of form-field flex layout */
      justify-content: space-between;
    }
    
    .form-field-toggle label {
      width: auto;
      flex-grow: 1;
    }

    input[role='switch'] {
      appearance: none;
      width: 48px;
      height: 26px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 13px;
      position: relative;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      flex-shrink: 0;
    }

    input[role='switch']::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #888;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    input[role='switch']:checked {
      background: var(--glow-color-faded);
      border-color: var(--glow-color);
    }

    input[role='switch']:checked::before {
      transform: translateX(22px);
      background: var(--glow-color);
      box-shadow: 0 0 8px var(--glow-color);
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-grow: 1;
      min-width: 0; /* Prevents overflow in flex child */
    }
    .slider-container input[type='range'] {
      flex-grow: 1;
      height: 24px; /* Sufficient height to catch taps */
      appearance: none;
      background: transparent;
      cursor: pointer;
      margin: 0;
    }
    .slider-container input[type='range']:focus {
      outline: none;
    }
    .slider-container input[type='range']::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      transition: background 0.2s;
      /* Provide centering for the track itself within the 24px height */
      margin: 10px 0;
    }
    .slider-container input[type='range']:hover::-webkit-slider-runnable-track {
      background: rgba(255, 255, 255, 0.2);
    }
    .slider-container input[type='range']::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
      border: 2px solid var(--background-primary);
      cursor: grab;
      margin-top: -7px; /* (Track Height 4px - Thumb Height 18px) / 2 = -7 center it ON the track itself */
      box-sizing: border-box;
      transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.2s;
    }
    .slider-container input[type='range']::-moz-range-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      transition: background 0.2s;
    }
    .slider-container input[type='range']::-moz-range-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
      border: 2px solid var(--background-primary);
      cursor: grab;
      box-sizing: content-box;
      transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.2s;
    }
    .slider-container input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 16px var(--glow-color);
    }
    .slider-container input[type='range']::-moz-range-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 16px var(--glow-color);
    }
    .slider-container span {
      font-family: 'Inter', monospace;
      font-size: 0.85em;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(0, 0, 0, 0.3);
      padding: 6px 10px;
      border-radius: 6px;
      min-width: 52px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.05);
      flex-shrink: 0;
    }

    .settings-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .theme-selector {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .custom-theme-picker {
      grid-column: 1 / -1;
      margin-top: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      padding: 16px;
      border-radius: 12px;
    }

    .settings-actions button {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-size: 0.8rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .settings-actions .cancel-btn {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
    }
    .settings-actions .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .settings-actions .save-btn {
      background: rgba(0, 170, 255, 0.15);
      color: var(--glow-color);
      border-color: var(--glow-color);
      box-shadow: 0 0 15px rgba(0, 170, 255, 0.2) inset;
    }
    .settings-actions .save-btn:hover {
      background: var(--glow-color);
      color: #000;
      box-shadow: 0 0 20px var(--glow-color);
      border-color: transparent;
    }

    .theme-selector {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .theme-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: transparent;
      border: 1.5px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      text-align: left;
    }

    .theme-option:hover {
      border-color: var(--text-secondary);
      background-color: rgba(255, 255, 255, 0.05);
    }

    .theme-option.active {
      border-color: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
    }

    .theme-preview {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .theme-name {
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.9rem;
    }

    .voice-selector {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .voice-option {
      padding: 16px;
      background-color: transparent;
      border: 1.5px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .voice-option:hover {
      border-color: var(--text-secondary);
      background-color: rgba(255, 255, 255, 0.05);
    }

    .voice-option.active {
      border-color: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
    }

    .voice-radio {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.2s;
      flex-shrink: 0;
    }

    .voice-option.active .voice-radio {
      border-color: var(--glow-color);
    }

    .voice-radio::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--glow-color);
      transform: scale(0);
      transition: transform 0.2s;
    }

    .voice-option.active .voice-radio::after {
      transform: scale(1);
    }

    .voice-details {
      flex-grow: 1;
    }

    .voice-name {
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1rem;
      margin: 0;
    }

    .voice-description {
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin: 4px 0 0;
    }

    .citations {
      z-index: 110;
      position: absolute;
      bottom: 20px;
      left: 30px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      font-family: sans-serif;
      color: var(--text-primary);
      font-size: 0.8rem;
      transition: opacity 0.5s ease-in-out;
    }

    .message-citations {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-top: 12px;
      font-family: sans-serif;
      color: var(--text-primary);
      font-size: 0.8rem;
    }

    .citations-header, .message-citations-header {
      font-weight: bold;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .citations a, .message-citations a {
      color: #b3d9ff;
      text-decoration: none;
      background-color: rgba(0, 170, 255, 0.1);
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid rgba(0, 170, 255, 0.2);
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background-color 0.2s, border-color 0.2s;

      &:hover {
        background-color: rgba(0, 170, 255, 0.2);
        border-color: rgba(0, 170, 255, 0.4);
        text-decoration: underline;
      }
    }

    .live-audio-container.idle .hud {
      opacity: 0;
    }
    .live-audio-container.idle .hud .hud-actions {
      pointer-events: none;
    }
    .live-audio-container.idle .citations {
      opacity: 0;
      pointer-events: none;
    }

    .live-audio-container:not(.idle):hover .hud,
    .live-audio-container:not(.idle).touch-active .hud {
      opacity: 1;
    }
    .live-audio-container:not(.idle):hover .hud .hud-actions,
    .live-audio-container:not(.idle).touch-active .hud .hud-actions {
      pointer-events: auto;
    }
    .live-audio-container:not(.idle):hover .citations,
    .live-audio-container:not(.idle).touch-active .citations {
      opacity: 1;
      pointer-events: auto;
    }

    .chat-panel {
      flex: 1 1 0%;
      min-height: 0;
      width: 100%;
      background: transparent;
      border: none;
      border-radius: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: none !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      transition: none !important;
      contain: layout style;
      box-sizing: border-box;
    }

    .chat-history {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    }

    .transcription-entry {
      display: flex;
      flex-direction: column;
      gap: 3px;
      opacity: 0;
      transform: translateY(10px);
      animation: fadeIn 0.5s forwards;
      max-width: 95%;
      box-sizing: border-box;
    }

    .transcription-entry.user {
      align-self: flex-end;
      align-items: flex-end;
      max-width: 85%;
    }

    .transcription-entry.ai {
      align-self: flex-start;
      align-items: flex-start;
      max-width: 100%;
      width: 100%;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .transcription-speaker {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      padding: 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .response-timer {
      font-size: 0.75rem;
      color: var(--text-secondary);
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
    }

    .tts-replay-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: color 0.2s, background-color 0.2s, transform 0.2s;
    }

    .tts-replay-btn:hover {
      color: var(--text-primary);
      background-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
    }

    .tts-replay-btn.playing {
      color: var(--glow-color);
      animation: pulse-glow 2s infinite;
    }

    .tts-controls {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      width: 100%;
      max-width: 320px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .tts-controls-row {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
    }

    .tts-progress-row {
      display: flex;
      gap: 8px;
      align-items: center;
      width: 100%;
    }

    .tts-slider {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .tts-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--glow-color);
      box-shadow: 0 0 8px var(--glow-color);
      cursor: pointer;
      transition: transform 0.1s;
    }

    .tts-slider::-webkit-slider-thumb:hover {
      transform: scale(1.3);
    }

    .tts-time-display {
      font-size: 10px;
      color: var(--text-secondary);
      font-family: monospace;
      min-width: 65px;
      text-align: right;
    }

    .tts-control-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: color 0.2s, background-color 0.2s, transform 0.2s;
    }

    .tts-control-btn:hover {
      color: var(--text-primary);
      background-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.1);
    }

    .tts-control-btn.playing {
      color: var(--glow-color);
    }

    .transcription-entry.ai .transcription-speaker {
      color: var(--glow-color);
    }

    .message-bubble {
      padding: 6px 12px;
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      box-sizing: border-box;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .transcription-entry.user .message-bubble {
      background-color: rgba(0, 170, 255, 0.1);
      border-color: rgba(0, 170, 255, 0.3);
      border-top-right-radius: 4px;
    }

    .transcription-entry.ai .message-bubble {
      border-top-left-radius: 4px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: auto;
      overflow-y: auto;
      max-height: 75vh;
    }

    .transcription-text {
      font-size: inherit;
      color: var(--text-primary);
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    .chat-history {
      font-size: var(--chat-font-size, 0.95rem) !important;
    }

    .chat-history .transcription-text,
    .chat-history .markdown-body,
    .chat-history .markdown-body p,
    .chat-history .markdown-body li,
    .chat-history .markdown-body ul,
    .chat-history .markdown-body ol {
      font-size: inherit !important;
    }

    .markdown-body {
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
      box-sizing: border-box;
      white-space: normal;
    }

    .markdown-body p {
      margin: 0 0 0.4em 0;
    }

    .markdown-body p:first-child {
      margin-top: 0;
    }

    .markdown-body p:last-child {
      margin-bottom: 0;
    }

    .markdown-body code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
      word-break: break-all;
    }

    .markdown-body pre {
      background: rgba(0, 0, 0, 0.5);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      max-width: 100%;
      box-sizing: border-box;
      margin: 1em 0;
      border: 1px solid var(--border-color);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .markdown-body pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
      color: #e6e6e6;
    }

    .markdown-body ul, .markdown-body ol {
      margin: 0 0 1em 0;
      padding-left: 1.5em;
    }

    .markdown-body a {
      color: var(--glow-color);
      text-decoration: none;
    }

    .markdown-body a:hover {
      text-decoration: underline;
    }

    .system-thought {
      font-size: 0.85rem;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid var(--glow-color);
      padding: 8px 12px;
      margin: 8px 0;
      border-radius: 4px;
      font-style: italic;
    }

    .message-bubble img,
    .message-bubble video {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 8px;
    }
    
    .file-attachment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-top: 8px;
      border: 1px solid var(--border-color);
    }
    
    .file-attachment-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--glow-color-faded);
      border-radius: 4px;
      color: var(--glow-color);
    }

    .loading-indicator {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .loading-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--glow-color);
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .loading-indicator span:nth-child(1) {
      animation-delay: -0.32s;
    }
    .loading-indicator span:nth-child(2) {
      animation-delay: -0.16s;
    }
    @keyframes bounce {
      0%,
      80%,
      100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    .chat-input-area {
      padding: 12px;
      border-top: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      will-change: height;
    }

    .attachment-preview {
      position: relative;
      margin: 0 8px 12px 8px;
    }
    .attachment-preview img,
    .attachment-preview video {
      max-width: 100px;
      max-height: 100px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }
    .file-preview-placeholder {
      width: 100px;
      height: 60px;
      background: #222;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      padding: 4px;
      text-align: center;
      overflow: hidden;
    }
    .remove-attachment-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border: 1px solid var(--border-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 18px;
      padding: 4px 6px;
      border: 1px solid var(--border-color);
      box-sizing: border-box;
      width: 100%;
      position: relative;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      will-change: border-color, box-shadow;
    }
    .input-wrapper:focus-within {
      border-color: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
    }

    /* User message input textarea: vertically resizable with min/max height & layout stability */
    .chat-input-area textarea {
      flex: 1 1 auto;
      min-width: 0;
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      box-shadow: none;
      color: var(--text-primary);
      font-size: 0.95rem;
      padding: 8px 10px 6px 10px;
      min-height: 38px; /* Compact initial min-height aligned with buttons */
      max-height: 200px; /* ~8-10 lines max height */
      resize: vertical; /* Enable vertical resizability handle */
      line-height: 1.4;
      font-family: inherit;
      box-sizing: border-box;
      overflow-y: auto;
      display: block;
      margin: 0;
      vertical-align: bottom;
      transition: none; /* Prevents height layout shifts during typing & backspacing */
    }
    .chat-input-area textarea:focus {
      outline: none;
      box-shadow: none;
      border: none;
    }
    .chat-input-area textarea::placeholder {
      color: rgba(255, 255, 255, 0.45);
    }

    .chat-input-area button {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      align-self: flex-end;
      margin-bottom: 1px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.65);
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s, background-color 0.2s, box-shadow 0.2s;
    }

    .chat-input-area button:hover:not(:disabled) {
      color: var(--glow-color);
      background-color: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 8px var(--glow-color-faded);
    }

    .chat-font-slider {
      appearance: none;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.15) !important;
      border-radius: 2px;
      height: 3px;
      outline: none;
    }
    .chat-font-slider::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--glow-color) !important;
      box-shadow: 0 0 6px var(--glow-color);
      cursor: pointer;
    }
    .chat-font-slider::-moz-range-thumb {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--glow-color) !important;
      border: none;
      cursor: pointer;
    }

    .chat-input-area button.send-btn {
      background-color: var(--glow-color);
      color: var(--background-primary);
    }
    .chat-input-area button.send-btn:disabled {
      background-color: #555;
      color: #999;
      cursor: not-allowed;
    }

    .chat-input-area button.mic-btn.recording {
      color: #ff3b30;
      background-color: rgba(255, 59, 48, 0.15);
      animation: mic-pulse 1.5s infinite ease-in-out;
    }

    .chat-input-area button.mic-btn.continuous {
      color: #34c759 !important;
      background-color: rgba(52, 199, 89, 0.15) !important;
      border: 1.5px solid #34c759 !important;
      animation: mic-pulse-green 1.5s infinite ease-in-out !important;
    }
    
    @keyframes mic-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(255, 59, 48, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 59, 48, 0);
      }
    }

    @keyframes mic-pulse-green {
      0% {
        box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.4);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(52, 199, 89, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(52, 199, 89, 0);
      }
    }

    .camera-view, .screen-view {
      position: absolute;
      top: calc(30px + env(safe-area-inset-top));
      right: calc(30px + env(safe-area-inset-right));
      width: 200px;
      border-radius: 8px;
      border: 2px solid var(--border-color);
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
      background: #000;
      overflow: hidden;
      transform-origin: top right;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
      z-index: 90;
      cursor: grab;
      touch-action: none;
    }

    .screen-view {
      top: calc(260px + env(safe-area-inset-top)); /* Place below camera if both active */
    }

    .camera-view.dragging, .screen-view.dragging {
      cursor: grabbing;
      transition: none;
    }

    .camera-view:not(.active), .screen-view:not(.active) {
      opacity: 0;
      pointer-events: none;
    }

    .camera-view video, .screen-view video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .camera-canvas {
      display: none;
    }

    /* New styles for the initialization overlay */
    .init-overlay {
      position: fixed;
      inset: 0;
      background: var(--background-primary);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      text-align: center;
      padding: 20px;
      transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
      opacity: 1;
      visibility: visible;
    }
    .init-overlay.fade-out {
      opacity: 0;
      visibility: hidden;
    }
    .init-content {
      max-width: 500px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .init-content h1 {
      font-size: 2.5rem;
      color: var(--glow-color);
      text-shadow: 0 0 15px var(--glow-color-faded);
    }
    .init-content p {
      font-size: 1.1rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .start-btn {
      background-color: var(--glow-color);
      color: #000;
      border: none;
      border-radius: 50px;
      padding: 15px 30px;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 0 20px var(--glow-color-faded);
      animation: pulse-glow 2s infinite;
    }
    .start-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 30px var(--glow-color);
    }
    .start-btn svg {
      width: 28px;
      height: 28px;
    }
    .disclaimer {
      font-size: 0.9rem;
      opacity: 0.7;
    }
    @keyframes pulse-glow {
      0% {
        box-shadow: 0 0 20px var(--glow-color-faded);
      }
      50% {
        box-shadow: 0 0 35px var(--glow-color);
      }
      100% {
        box-shadow: 0 0 20px var(--glow-color-faded);
      }
    }

    /* Collapsible Sidebar and Terminal Pane (All Positions) */
    .app-layout-container {
      display: flex;
      width: 100vw;
      height: 100dvh;
      overflow: hidden;
      background: var(--background-primary);
      transition: flex-direction 0.3s ease;
      position: relative;
    }

    /* Disable transitions and pointer events on all canvas/visual elements during resizer dragging to guarantee silky-smooth, zero-lag, zero-jitter 60fps tracking */
    .app-layout-container.dragging-active canvas,
    .app-layout-container.dragging-active iframe,
    .app-layout-container.dragging-active video,
    .app-layout-container.dragging-active .visualizer-container,
    .app-layout-container.dragging-active .chat-history,
    .app-layout-container.dragging-active .three-container,
    .app-layout-container.dragging-active gdm-live-audio-visuals-3d {
      pointer-events: none !important;
      user-select: none !important;
    }

    .main-canvas-area {
      flex: 1;
      height: 100%;
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    .agent-sidebar {
      background: rgba(10, 10, 14, 0.92);
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      z-index: 120;
      position: absolute;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s;
      will-change: transform;
      contain: layout style;
      visibility: visible;
    }

    .agent-sidebar.collapsed {
      pointer-events: none;
      visibility: hidden;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s 0.3s;
    }

    .agent-sidebar.dragging {
      transition: none !important;
    }

    .sidebar-resizer {
      position: absolute;
      z-index: 130;
      background: transparent;
      transition: background-color 0.2s;
    }
    .sidebar-resizer:hover, .sidebar-resizer.dragging {
      background-color: var(--glow-color-faded);
    }
    .pos-right .sidebar-resizer {
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
    }
    .pos-left .sidebar-resizer {
      right: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
    }
    .pos-top .sidebar-resizer {
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      cursor: row-resize;
    }
    .pos-bottom .sidebar-resizer {
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      cursor: row-resize;
    }

    /* Positional Styles */
    .agent-sidebar.pos-right {
      right: 0;
      top: 0;
      bottom: 0;
      width: 420px;
      height: 100%;
      border-left: 1px solid var(--border-color);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
    }
    .agent-sidebar.pos-right.collapsed {
      transform: translateX(100%);
      border-left: none;
      box-shadow: none;
    }

    .agent-sidebar.pos-left {
      left: 0;
      top: 0;
      bottom: 0;
      width: 420px;
      height: 100%;
      border-right: 1px solid var(--border-color);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.8);
    }
    .agent-sidebar.pos-left.collapsed {
      transform: translateX(-100%);
      border-right: none;
      box-shadow: none;
    }

    .agent-sidebar.pos-top {
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 320px;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    }
    .agent-sidebar.pos-top.collapsed {
      transform: translateY(-100%);
      border-bottom: none;
      box-shadow: none;
    }

    .agent-sidebar.pos-bottom {
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 320px;
      border-top: 1px solid var(--border-color);
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.8);
    }
    .agent-sidebar.pos-bottom.collapsed {
      transform: translateY(100%);
      border-top: none;
      box-shadow: none;
    }

    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.4);
    }

    .sidebar-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--glow-color);
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sidebar-close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 50%;
      transition: background-color 0.2s, color 0.2s;
    }

    .sidebar-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    /* Workspace Terminal Pane CSS */
    .terminal-pane-resizer {
      height: 6px;
      margin: -3px 0;
      background: transparent;
      z-index: 10;
      cursor: row-resize;
      transition: background-color 0.2s;
      flex-shrink: 0;
    }
    .terminal-pane-resizer:hover, .terminal-pane-resizer.dragging {
      background-color: var(--glow-color);
      box-shadow: 0 0 8px var(--glow-color);
    }
    .terminal-pane-container {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: rgba(12, 12, 12, 0.95);
      border-top: 1px solid var(--border-color);
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }
    .terminal-pane-container.dragging {
      transition: none !important;
    }
    .terminal-pane-container.collapsed {
      height: 32px !important;
      min-height: 32px !important;
    }
    .terminal-pane-container.collapsed .terminal-screen,
    .terminal-pane-container.collapsed .terminal-input-row,
    .terminal-pane-container.collapsed .terminal-controls {
      display: none !important;
    }

    /* Command Prompt Styled Terminal Window */
    .terminal-window {
      flex: 1;
      background: #0c0c0c;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .terminal-header {
      padding: 8px 12px;
      background: #1e1e1e;
      border-bottom: 1px solid #2d2d2d;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #9b9b9b;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .terminal-header-dots {
      display: flex;
      gap: 6px;
    }

    .terminal-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .terminal-dot:hover {
      opacity: 0.85;
      transform: scale(1.15);
    }
    .terminal-dot.red { background: #ff5f56; }
    .terminal-dot.yellow { background: #ffbd2e; }
    .terminal-dot.green { background: #27c93f; }

    .terminal-screen {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      overflow-x: auto;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      color: #e0e0e0;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      word-wrap: break-word;
      font-variant-ligatures: none;
      font-feature-settings: "liga" 0;
      letter-spacing: normal;
    }

    .terminal-screen::-webkit-scrollbar {
      width: 8px;
    }
    .terminal-screen::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    .terminal-screen::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    .terminal-screen::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .terminal-input-row {
      padding: 12px 16px;
      background: #0f0f0f;
      border-top: 1px solid #1e1e1e;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.85rem;
      transition: all 0.3s ease;
    }

    .terminal-input-row.voice-active {
      background: rgba(39, 201, 63, 0.08);
      border-top-color: #27c93f;
    }

    .terminal-prompt {
      color: var(--glow-color);
      flex-shrink: 0;
      font-weight: 700;
    }

    .terminal-input {
      flex: 1;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      color: #ffffff !important;
      font-family: inherit !important;
      font-size: inherit !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
    }

    .terminal-voice-btn {
      background: transparent;
      border: none;
      color: #777;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 50%;
      transition: all 0.2s ease;
      margin-left: 4px;
    }

    .terminal-voice-btn:hover:not(:disabled) {
      color: var(--glow-color);
      background: rgba(255, 255, 255, 0.08);
    }

    .terminal-voice-btn.active {
      color: #27c93f;
      background: rgba(39, 201, 63, 0.18);
      animation: pulse-mic-glow 1.5s infinite;
    }

    .terminal-voice-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .terminal-window.voice-active {
      border-color: #27c93f !important;
      box-shadow: 0 0 15px rgba(39, 201, 63, 0.2) !important;
    }

    @keyframes pulse-border-green {
      0% { border-color: rgba(39, 201, 63, 0.4); box-shadow: 0 0 5px rgba(39, 201, 63, 0.1); }
      50% { border-color: rgba(39, 201, 63, 1.0); box-shadow: 0 0 15px rgba(39, 201, 63, 0.3); }
      100% { border-color: rgba(39, 201, 63, 0.4); box-shadow: 0 0 5px rgba(39, 201, 63, 0.1); }
    }

    @keyframes pulse-mic-glow {
      0% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(39, 201, 63, 0); }
      100% { box-shadow: 0 0 0 0 rgba(39, 201, 63, 0); }
    }

    /* Terminal Action/Control Buttons */
    .terminal-controls {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: rgba(0, 0, 0, 0.2);
    }

    .terminal-status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .terminal-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #888;
    }
    .terminal-status-dot.active {
      background: #27c93f;
      box-shadow: 0 0 8px #27c93f;
    }
    .terminal-status-dot.starting {
      background: #ffaa00;
      box-shadow: 0 0 8px #ffaa00;
      animation: status-pulse-orange 1s infinite alternate;
    }
    .terminal-status-dot.stopping {
      background: #ff2a2a;
      box-shadow: 0 0 8px #ff2a2a;
      animation: status-pulse-red 1s infinite alternate;
    }
    @keyframes status-pulse-orange {
      from { opacity: 0.5; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1.1); }
    }
    @keyframes status-pulse-red {
      from { opacity: 0.5; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1.1); }
    }

    .terminal-btn {
      background: var(--glow-color-faded);
      border: 1px solid var(--glow-color);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s ease;
    }

    .terminal-btn:hover:not(:disabled) {
      background: var(--glow-color);
      color: #000;
      box-shadow: 0 0 10px var(--glow-color);
    }

    .terminal-btn.stop {
      border-color: #ff5555;
      background: rgba(255, 85, 85, 0.15);
      color: #ff8888;
    }

    .terminal-btn.stop:hover:not(:disabled) {
      background: #ff5555;
      color: #000;
      box-shadow: 0 0 12px #ff5555;
    }

    .terminal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Floating Tab Trigger (All Positions) */
    .terminal-float-tab {
      position: fixed;
      background: rgba(10, 10, 14, 0.85);
      border: 1px solid var(--border-color);
      cursor: pointer;
      z-index: 115;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--glow-color);
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .terminal-float-tab.dragging {
      transition: none !important;
    }

    .terminal-float-tab:hover {
      background: rgba(15, 15, 22, 0.95);
      color: var(--text-primary);
      border-color: var(--glow-color);
    }

    /* Float tab layout per position */
    .terminal-float-tab.pos-right {
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      border-right: none;
      padding: 16px 8px;
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
      flex-direction: column;
    }
    .terminal-float-tab.pos-right.shifted {
      right: 420px;
    }
    .terminal-float-tab.pos-right .terminal-float-tab-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
    }

    .terminal-float-tab.pos-left {
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      border-left: none;
      padding: 16px 8px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
      flex-direction: column;
    }
    .terminal-float-tab.pos-left.shifted {
      left: 420px;
    }
    .terminal-float-tab.pos-left .terminal-float-tab-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
    }

    .terminal-float-tab.pos-top {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      border-top: none;
      padding: 8px 16px;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
      flex-direction: row;
    }
    .terminal-float-tab.pos-top.shifted {
      top: 320px;
    }
    .terminal-float-tab.pos-top .terminal-float-tab-text {
      writing-mode: horizontal-tb;
    }

    .terminal-float-tab.pos-bottom {
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      border-bottom: none;
      padding: 8px 16px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      flex-direction: row;
    }
    .terminal-float-tab.pos-bottom.shifted {
      bottom: 320px;
    }
    .terminal-float-tab.pos-bottom .terminal-float-tab-text {
      writing-mode: horizontal-tb;
    }

    .terminal-float-tab svg {
      width: 20px;
      height: 20px;
    }

    .terminal-float-tab-text {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    @media (max-width: 768px) {
      .agent-sidebar {
        width: 100vw;
        position: fixed;
        right: 0;
        top: 0;
        bottom: 0;
      }
      .terminal-float-tab.shifted {
        right: 0;
        display: none;
      }
      .settings-modal-body {
        flex-direction: column;
      }

      .settings-modal {
        width: 95vw;
        max-height: 85vh;
      }

      .settings-nav {
        border-right: none;
        border-bottom: 1px solid var(--border-color);
        padding: 16px;
        width: 100%;
        display: block;
      }

      .settings-nav h2 {
        margin-bottom: 16px;
        text-align: center;
        font-size: 1.1rem;
      }

      .settings-nav ul {
        flex-direction: row;
        overflow-x: auto;
        gap: 0;
        -webkit-overflow-scrolling: touch; /* Momentum scrolling */
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
      }

      .settings-nav ul::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }

      .settings-nav button {
        padding: 8px 16px;
        white-space: nowrap;
        text-align: center;
      }

      .settings-nav button.active::before {
        left: 50%;
        top: auto;
        bottom: 0;
        transform: translateX(-50%);
        width: 70%;
        height: 3px;
        border-radius: 3px 3px 0 0;
      }

      .settings-content {
        padding: 24px 16px;
      }

      .theme-selector {
        grid-template-columns: 1fr;
      }

      .hud {
        padding: 15px;
        padding-left: calc(15px + env(safe-area-inset-left));
        padding-right: calc(15px + env(safe-area-inset-right));
        padding-bottom: calc(15px + env(safe-area-inset-bottom));
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .hud-actions {
        align-self: flex-end;
      }

      .chat-panel {
        display: none; /* Too cluttered on small screens */
      }
      .camera-view, .screen-view {
        width: 120px;
        top: calc(15px + env(safe-area-inset-top));
        right: calc(15px + env(safe-area-inset-right));
      }
      .screen-view {
        top: calc(160px + env(safe-area-inset-top));
      }

      /* Hide status display and citations on mobile for a cleaner view */
      .status-display,
      .citations {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this.initClient();
    this.applyTheme(this.activeTheme);

    // Load wake/sleep words from localStorage if present
    const savedActivate = localStorage.getItem('project_lumin_activate_word') || localStorage.getItem('synthra_activate_word');
    if (savedActivate !== null) {
      this.activateWord = savedActivate;
      this.initialActivateWord = savedActivate;
    }
    const savedSleep = localStorage.getItem('project_lumin_sleep_word') || localStorage.getItem('synthra_sleep_word');
    if (savedSleep !== null) {
      this.sleepCommandWord = savedSleep;
      this.initialSleepCommandWord = savedSleep;
    }

    // Load microphone and desktop audio configuration from localStorage
    const savedMic = localStorage.getItem('project_lumin_enable_microphone') || localStorage.getItem('synthra_enable_microphone');
    if (savedMic !== null) {
      this.enableMicrophone = savedMic === 'true';
    } else {
      this.enableMicrophone = false;
    }
    const savedDesktop = localStorage.getItem('project_lumin_enable_desktop_audio') || localStorage.getItem('synthra_enable_desktop_audio');
    if (savedDesktop !== null) {
      this.enableDesktopAudio = savedDesktop === 'true';
    } else {
      this.enableDesktopAudio = false;
    }

    // Load selected device configurations
    const savedMicDevice = localStorage.getItem('project_lumin_selected_mic_device') || localStorage.getItem('synthra_selected_mic_device');
    if (savedMicDevice !== null) {
      this.selectedMicAudioDeviceId = savedMicDevice;
    }
    const savedDesktopDevice = localStorage.getItem('project_lumin_selected_desktop_device') || localStorage.getItem('synthra_selected_desktop_device');
    if (savedDesktopDevice !== null) {
      this.selectedDesktopAudioDeviceId = savedDesktopDevice;
    }

    // Load terminal position and enabled status
    const savedTerminalEnabled = localStorage.getItem('project_lumin_terminal_enabled');
    if (savedTerminalEnabled !== null) {
      this.isTerminalEnabled = savedTerminalEnabled === 'true';
    } else {
      this.isTerminalEnabled = true; // Default to true!
    }

    const savedTerminalOpen = localStorage.getItem('project_lumin_terminal_open');
    if (savedTerminalOpen !== null) {
      this.isTerminalOpen = savedTerminalOpen === 'true';
    } else {
      this.isTerminalOpen = true; // Default to true so the sidebar workspace is open on load!
    }
    const savedTerminalTabActive = localStorage.getItem('project_lumin_terminal_tab_active');
    if (savedTerminalTabActive !== null) {
      this.isTerminalTabActive = savedTerminalTabActive === 'true';
    } else {
      this.isTerminalTabActive = true;
    }
    const savedTerminalOpacity = localStorage.getItem('project_lumin_terminal_opacity');
    if (savedTerminalOpacity !== null) {
      this.terminalOpacity = parseFloat(savedTerminalOpacity);
    } else {
      this.terminalOpacity = 0.5;
    }
    const savedTerminalPos = localStorage.getItem('project_lumin_terminal_position');
    if (savedTerminalPos === 'left' || savedTerminalPos === 'right' || savedTerminalPos === 'top' || savedTerminalPos === 'bottom') {
      this.terminalPosition = savedTerminalPos as any;
    } else {
      this.terminalPosition = 'right';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mousemove', this.resetIdleTimer);
    document.addEventListener('touchstart', this.resetIdleTimer);
    document.addEventListener('click', this.handleGlobalClick);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('resize', this.handleWindowResize);
    
    // Automatically initialize speech recognition on first user interaction to enable continuous wake word detection
    document.addEventListener('click', this.initSpeechOnInteractionBound);
    document.addEventListener('touchstart', this.initSpeechOnInteractionBound);
    document.addEventListener('keydown', this.initSpeechOnInteractionBound);
  }

  private handleWindowResize = () => {
    this.requestUpdate();
  };

  private handleBeforeUnload = () => {
    this.cleanupAllResources();
  };

  private handleGlobalClick = (e: MouseEvent) => {
    if (!this.isTerminalOpen) return;
    
    const path = e.composedPath();
    let clickedInsideSidebar = false;
    let clickedInsideTab = false;
    
    for (const el of path) {
      if (el instanceof HTMLElement) {
        if (el.classList.contains('agent-sidebar')) {
          clickedInsideSidebar = true;
        }
        if (el.classList.contains('terminal-float-tab')) {
          clickedInsideTab = true;
        }
      }
    }
    
    if (!clickedInsideSidebar && !clickedInsideTab) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      this.toggleTerminal(false);
    }
  };

  private triggerWindowResize() {
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 310);
  }

  private toggleTerminal(forceState?: boolean) {
    const nextState = forceState !== undefined ? forceState : !this.isTerminalOpen;
    if (!nextState && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.isTerminalOpen = nextState;
    localStorage.setItem('project_lumin_terminal_open', String(this.isTerminalOpen));
    
    if (this.isTerminalOpen) {
      this.scrollTerminalToBottom();
      this.initTerminalWebSocket();
    }
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private toggleAgentTerminalFeature(forceState?: boolean) {
    if (forceState !== undefined) {
      this.isTerminalTabActive = forceState;
    } else {
      this.isTerminalTabActive = !this.isTerminalTabActive;
    }
    localStorage.setItem('project_lumin_terminal_tab_active', String(this.isTerminalTabActive));
    
    if (!this.isTerminalTabActive) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      this.isTerminalOpen = false;
    } else {
      this.initTerminalWebSocket();
    }
    
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private adjustTerminalFontSize(delta: number) {
    this.terminalFontSize = Math.max(10, Math.min(30, this.terminalFontSize + delta));
    localStorage.setItem('project_lumin_terminal_font_size', String(this.terminalFontSize));
    this.requestUpdate();
  }

  private toggleTerminalBold() {
    this.terminalIsBold = !this.terminalIsBold;
    localStorage.setItem('project_lumin_terminal_is_bold', String(this.terminalIsBold));
    this.requestUpdate();
  }

  private handleResizerMouseDown(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    this.isDraggingResizer = true;
    
    const isTouch = 'touches' in e;
    const startX = isTouch ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const startY = isTouch ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    const startWidth = this.terminalWidth;
    const startHeight = this.terminalHeight;
    const position = this.terminalPosition;
    
    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!this.isDraggingResizer) return;
      
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      if (position === 'right') {
        const newWidth = Math.max(280, Math.min(window.innerWidth - 100, startWidth - deltaX));
        this.terminalWidth = newWidth;
        localStorage.setItem('project_lumin_terminal_width', String(newWidth));
      } else if (position === 'left') {
        const newWidth = Math.max(280, Math.min(window.innerWidth - 100, startWidth + deltaX));
        this.terminalWidth = newWidth;
        localStorage.setItem('project_lumin_terminal_width', String(newWidth));
      } else if (position === 'bottom') {
        const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startHeight - deltaY));
        this.terminalHeight = newHeight;
        localStorage.setItem('project_lumin_terminal_height', String(newHeight));
      } else if (position === 'top') {
        const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startHeight + deltaY));
        this.terminalHeight = newHeight;
        localStorage.setItem('project_lumin_terminal_height', String(newHeight));
      }
      
      this.triggerWindowResize();
    };
    
    const handleMouseUp = () => {
      this.isDraggingResizer = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
  }

  // Draggable Agent Terminal tab logic to dock to any screen edge (top, left, right, bottom)
  private handleTabMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    this.isDraggingTab = true;
    this.tabDragStartX = e.clientX;
    this.tabDragStartY = e.clientY;
    this.hasTabDragged = false;

    window.addEventListener('mousemove', this.handleTabMouseMove);
    window.addEventListener('mouseup', this.handleTabMouseUp);
  };

  private handleTabMouseMove = (e: MouseEvent) => {
    if (!this.isDraggingTab) return;
    const dx = Math.abs(e.clientX - this.tabDragStartX);
    const dy = Math.abs(e.clientY - this.tabDragStartY);
    if (dx > 5 || dy > 5) {
      this.hasTabDragged = true;
    }
    if (this.hasTabDragged) {
      const distLeft = e.clientX;
      const distRight = window.innerWidth - e.clientX;
      const distTop = e.clientY;
      const distBottom = window.innerHeight - e.clientY;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      let newPos: 'left' | 'right' | 'top' | 'bottom' = 'right';

      if (minDist === distLeft) newPos = 'left';
      else if (minDist === distRight) newPos = 'right';
      else if (minDist === distTop) newPos = 'top';
      else if (minDist === distBottom) newPos = 'bottom';

      if (newPos !== this.terminalPosition) {
        this.terminalPosition = newPos;
        localStorage.setItem('project_lumin_terminal_position', newPos);
        this.triggerWindowResize();
        this.requestUpdate();
      }
    }
  };

  private handleTabMouseUp = () => {
    if (!this.isDraggingTab) return;
    this.isDraggingTab = false;
    window.removeEventListener('mousemove', this.handleTabMouseMove);
    window.removeEventListener('mouseup', this.handleTabMouseUp);

    if (!this.hasTabDragged) {
      this.toggleTerminal();
    }
  };

  private handleTabTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.isDraggingTab = true;
    this.tabDragStartX = touch.clientX;
    this.tabDragStartY = touch.clientY;
    this.hasTabDragged = false;

    window.addEventListener('touchmove', this.handleTabTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTabTouchEnd);
  };

  private handleTabTouchMove = (e: TouchEvent) => {
    if (!this.isDraggingTab || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - this.tabDragStartX);
    const dy = Math.abs(touch.clientY - this.tabDragStartY);
    if (dx > 5 || dy > 5) {
      this.hasTabDragged = true;
      e.preventDefault();
    }
    if (this.hasTabDragged) {
      const distLeft = touch.clientX;
      const distRight = window.innerWidth - touch.clientX;
      const distTop = touch.clientY;
      const distBottom = window.innerHeight - touch.clientY;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      let newPos: 'left' | 'right' | 'top' | 'bottom' = 'right';

      if (minDist === distLeft) newPos = 'left';
      else if (minDist === distRight) newPos = 'right';
      else if (minDist === distTop) newPos = 'top';
      else if (minDist === distBottom) newPos = 'bottom';

      if (newPos !== this.terminalPosition) {
        this.terminalPosition = newPos;
        localStorage.setItem('project_lumin_terminal_position', newPos);
        this.triggerWindowResize();
        this.requestUpdate();
      }
    }
  };

  private handleTabTouchEnd = () => {
    if (!this.isDraggingTab) return;
    this.isDraggingTab = false;
    window.removeEventListener('touchmove', this.handleTabTouchMove);
    window.removeEventListener('touchend', this.handleTabTouchEnd);

    if (!this.hasTabDragged) {
      this.toggleTerminal();
    }
  };

  private renderAvatarIcon(speaker: 'user' | 'ai') {
    const isUser = speaker === 'user';
    const avatar = isUser ? (this.userAvatar || 'U') : (this.systemAvatar || 'S');
    const isImage = avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('blob:');

    if (isImage) {
      return html`
        <img
          src=${avatar}
          alt=${isUser ? 'User Avatar' : 'System Avatar'}
          style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid ${isUser ? 'var(--glow-color)' : 'rgba(255,255,255,0.2)'}; flex-shrink: 0;"
        />
      `;
    }

    return html`
      <span
        class="user-avatar"
        style="width: 20px; height: 20px; border-radius: 50%; background: ${isUser ? 'var(--glow-color)' : 'rgba(255,255,255,0.12)'}; color: ${isUser ? 'var(--background-primary, #000)' : 'var(--text-primary, #fff)'}; border: 1px solid ${isUser ? 'var(--glow-color)' : 'var(--border-color, rgba(255,255,255,0.2))'}; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; font-family: sans-serif; flex-shrink: 0; line-height: 1;"
      >
        ${avatar}
      </span>
    `;
  }

  private handleUserAvatarUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = evt.target?.result as string;
      if (res) {
        this.userAvatar = res;
        localStorage.setItem('project_lumin_user_avatar', res);
        this.requestUpdate();
      }
    };
    reader.readAsDataURL(file);
  };

  private handleSystemAvatarUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = evt.target?.result as string;
      if (res) {
        this.systemAvatar = res;
        localStorage.setItem('project_lumin_system_avatar', res);
        this.requestUpdate();
      }
    };
    reader.readAsDataURL(file);
  };

  private handleAutoLaunchWakeToggle = (checked: boolean) => {
    this.isAutoLaunchOnWakeWord = checked;
    localStorage.setItem('project_lumin_auto_launch_wake', String(checked));
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({
        type: 'input',
        data: checked ? 'auto_launch_wake=true' : 'auto_launch_wake=false'
      }));
    }
    this.requestUpdate();
  };

  private handleAutoStopSleepToggle = (checked: boolean) => {
    this.isAutoStopOnSleepWord = checked;
    localStorage.setItem('project_lumin_auto_stop_sleep', String(checked));
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({
        type: 'input',
        data: checked ? 'auto_stop_sleep=true' : 'auto_stop_sleep=false'
      }));
    }
    this.requestUpdate();
  };

  private handleAutoPlayTTSToggle = (checked: boolean) => {
    this.autoPlayTTS = checked;
    localStorage.setItem('project_lumin_auto_play_tts', String(checked));
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({
        type: 'input',
        data: checked ? 'auto_play_tts=true' : 'auto_play_tts=false'
      }));
    }
    this.requestUpdate();
  };

  private handleTerminalPaneResizerMouseDown(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    this.isDraggingTerminalPaneResizer = true;
    
    if (this.isTerminalPaneCollapsed) {
      this.isTerminalPaneCollapsed = false;
      localStorage.setItem('project_lumin_terminal_pane_collapsed', 'false');
    }

    const isTouch = 'touches' in e;
    const startY = isTouch ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const startHeight = this.terminalPaneHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!this.isDraggingTerminalPaneResizer) return;
      
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const deltaY = currentY - startY;
      
      const newHeight = Math.max(100, Math.min(window.innerHeight - 200, startHeight - deltaY));
      this.terminalPaneHeight = newHeight;
      localStorage.setItem('project_lumin_terminal_pane_height', String(newHeight));
      this.requestUpdate();
    };
    
    const handleMouseUp = () => {
      this.isDraggingTerminalPaneResizer = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
  }

  private clearTerminalLogs() {
    this.terminalLogs = '[SYSTEM] Console logs cleared.\n';
    this.requestUpdate();
  }

  private handleScrollTerminalToBottomClick() {
    this.scrollTerminalToBottom();
  }

  private addCodeCopyButtons() {
    const chatHistoryEl = this.chatHistoryRef.value;
    if (!chatHistoryEl) return;
    
    const preElements = chatHistoryEl.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.copy-code-btn')) return;
      
      pre.style.position = 'relative';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code-btn';
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor" style="margin-right: 4px;">
          <rect fill="none" height="24" width="24"/>
          <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
        </svg>
        Copy
      `;
      copyBtn.title = 'Copy code block';
      copyBtn.style.position = 'absolute';
      copyBtn.style.top = '6px';
      copyBtn.style.right = '6px';
      copyBtn.style.background = 'rgba(0, 0, 0, 0.4)';
      copyBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      copyBtn.style.color = '#ccc';
      copyBtn.style.padding = '4px 8px';
      copyBtn.style.fontSize = '11px';
      copyBtn.style.fontFamily = 'monospace';
      copyBtn.style.borderRadius = '4px';
      copyBtn.style.cursor = 'pointer';
      copyBtn.style.display = 'flex';
      copyBtn.style.alignItems = 'center';
      copyBtn.style.zIndex = '10';
      copyBtn.style.transition = 'all 0.2s';
      
      copyBtn.addEventListener('mouseenter', () => {
        copyBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        copyBtn.style.color = '#fff';
      });
      copyBtn.addEventListener('mouseleave', () => {
        copyBtn.style.background = 'rgba(0, 0, 0, 0.4)';
        copyBtn.style.color = '#ccc';
      });
      
      copyBtn.addEventListener('click', () => {
        const codeText = pre.querySelector('code')?.innerText || pre.innerText;
        navigator.clipboard.writeText(codeText).then(() => {
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="#00ff7f" style="margin-right: 4px;">
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            Copied!
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor" style="margin-right: 4px;">
                <rect fill="none" height="24" width="24"/>
                <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
              </svg>
              Copy
            `;
          }, 2000);
        });
      });
      
      pre.appendChild(copyBtn);
    });
  }

  firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);

    // Global delegated sound FX listeners for shadow DOM elements
    this.shadowRoot?.addEventListener('click', (e: Event) => {
      const path = e.composedPath ? e.composedPath() : [e.target];
      const target = path[0] as HTMLElement;

      // Handle toggle switches and checkboxes with soft tactile switch sound
      const toggleEl = target?.closest?.('input[role="switch"], [role="switch"], input[type="checkbox"]');
      if (toggleEl) {
        const input = toggleEl as HTMLInputElement;
        // Small delay so checked state updates in DOM
        setTimeout(() => {
          soundFX.playToggle(input.checked);
        }, 0);
        return;
      }

      // Handle standard buttons, controls, and interactive elements with click sound
      if (target?.closest?.('button, a, select, input[type="radio"], [role="button"], .interactive, .tab, .theme-option, .terminal-btn, .hud-button, .sidebar-close-btn, .terminal-dot')) {
        soundFX.playClick();
      }
    });

    // Automatically initialize WebSocket connection to server to track active sessions and launch agent
    this.shouldStartOnConnect = true;
    this.initTerminalWebSocket(true);

    const handleUnload = () => {
      if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
        try {
          this.wsTerminal.send(JSON.stringify({ type: 'unload' }));
          this.wsTerminal.close();
        } catch (e) {}
      }
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/shutdown');
        } else {
          fetch('/api/shutdown', { method: 'POST', keepalive: true });
        }
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  private wsTerminal: WebSocket | null = null;
  private shouldStartOnConnect = false;

  private initTerminalWebSocket(forceConnect = false) {
    if (!forceConnect && !this.isTerminalEnabled && !this.isTerminalOpen && !this.isTerminalTabActive) {
      console.log('Skipping Terminal WebSocket connection (Terminal is not active/enabled).');
      return;
    }

    if (!forceConnect && this.wsTerminal && (this.wsTerminal.readyState === WebSocket.OPEN || this.wsTerminal.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.wsTerminal) {
      try {
        this.wsTerminal.close();
      } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal`;

    console.log('Connecting to terminal WebSocket at:', wsUrl);
    const ws = new WebSocket(wsUrl);
    this.wsTerminal = ws;

    ws.onopen = () => {
      if (this.wsTerminal !== ws) {
        console.log('Old/replaced Terminal WebSocket connected. Closing it.');
        try { ws.close(); } catch (e) {}
        return;
      }
      console.log('Terminal WebSocket connected.');
      if (this.shouldStartOnConnect) {
        console.log('Starting local agent...');
        this.startAgent();
        this.shouldStartOnConnect = false;
      }
    };

    ws.onmessage = (event) => {
      if (this.wsTerminal !== ws) {
        console.log('Received message on old/replaced Terminal WebSocket. Ignoring and closing.');
        try { ws.close(); } catch (e) {}
        return;
      }
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
          this.isAgentRunning = msg.running;
          if (msg.running) {
            this.isStartingAgent = false;
          } else {
            this.isStoppingAgent = false;
          }
          this.requestUpdate();
        } else if (msg.type === 'scrollback') {
          this.terminalLogs = msg.data;
          this.requestUpdate();
          this.scrollTerminalToBottom();
        } else if (msg.type === 'output') {
          this.terminalLogs += msg.data;
          this.requestUpdate();
          this.scrollTerminalToBottom();

          // Strip ANSI escape codes first to get clean text
          const cleanData = msg.data.replace(/\u001b\[[0-9;]*m/g, '');

          // Parse dynamic platform and model from routing engine logs
          const routerMatch = cleanData.match(/>>> \[HYBRID ROUTER\]:\s*Task='.*?'\s*->\s*Platform=(\S+)\s*Model=(\S+)/i);
          if (routerMatch && routerMatch[1] && routerMatch[2]) {
            this.activePlatform = 'Ollama';
            this.activeModelName = routerMatch[2].trim();
            this.requestUpdate();
          }

          // Parse visualizer theme shifts and shape morphing
          const systemShiftMatch = cleanData.match(/>>> \[SYSTEM SHIFT\]:\s*Visualizer theme changing to '([^'\r\n]+)'/i);
          if (systemShiftMatch && systemShiftMatch[1]) {
            const theme = systemShiftMatch[1].trim().toLowerCase() as any;
            const validThemes = ["cyberware", "crimson", "matrix", "solar", "arcane", "glacial", "golden", "hotpink", "aqua", "tungsten"];
            if (validThemes.includes(theme)) {
              this.activeTheme = theme;
              this.requestUpdate();
            }
          }

          const geometryAlterMatch = cleanData.match(/>>> \[GEOMETRY ALTER\]:\s*Morphing core vertex array into a '([^'\r\n]+)'/i);
          if (geometryAlterMatch && geometryAlterMatch[1]) {
            const shape = geometryAlterMatch[1].trim().toLowerCase() as any;
            const validShapes = ["sphere", "cube", "pyramid", "torus", "helix", "triangle", "saturn"];
            if (validShapes.includes(shape)) {
              this.visualizerShape = shape;
              this.particleShape = shape;
              this.requestUpdate();
            }
          }

          // Also match embedded [COMMAND: CHANGE_THEME=...] or [COMMAND: SET_SHAPE=...]
          const commandRegex = /\[COMMAND:\s*(CHANGE_THEME|SET_SHAPE)[:=]\s*([^\]]+)\]/gi;
          let cmdMatch: RegExpExecArray | null;
          while ((cmdMatch = commandRegex.exec(cleanData)) !== null) {
            const cmd = cmdMatch[1].toUpperCase();
            const val = cmdMatch[2].trim().toLowerCase();
            if (cmd === 'CHANGE_THEME') {
              const validThemes = ["cyberware", "crimson", "matrix", "solar", "arcane", "glacial", "golden", "hotpink", "aqua", "tungsten"];
              if (validThemes.includes(val)) {
                this.activeTheme = val as any;
                this.requestUpdate();
              }
            } else if (cmd === 'SET_SHAPE') {
              const validShapes = ["sphere", "cube", "pyramid", "torus", "helix", "triangle", "saturn"];
              if (validShapes.includes(val)) {
                this.visualizerShape = val as any;
                this.particleShape = val as any;
                this.requestUpdate();
              }
            }
          }

          // Parse MCP server layer status
          if (cleanData.includes('MCP SERVICE LAYER: ONLINE') || cleanData.includes('Model Context Protocol Server ENABLED') || cleanData.includes('MCP Server layer has been ENABLED')) {
            this.isMcpEnabled = true;
            this.requestUpdate();
          } else if (cleanData.includes('MCP SERVICE LAYER: DISABLED') || cleanData.includes('Model Context Protocol Server DISABLED') || cleanData.includes('MCP Server layer has been DISABLED')) {
            this.isMcpEnabled = false;
            this.requestUpdate();
          }

          // Parse pipeline updates (local cognitive mode)
          const pipelineMatch = cleanData.match(/COGNITIVE PIPELINE:\s*([^\n\r]+)/i);
          if (pipelineMatch && pipelineMatch[1]) {
            this.activePlatform = 'Ollama';
            this.requestUpdate();
          }
          const responseMatch = cleanData.match(/Agent Response:\s*([\s\S]+)/i);
          if (responseMatch && responseMatch[1]) {
            let responseText = responseMatch[1].trim();
            if (responseText) {
              // Clean up system messages or subsequent outputs that might have been captured in the same buffer chunk
              responseText = responseText.split('\n')
                .filter(line => {
                  const l = line.trim();
                  return !l.startsWith('TTS Speech Output:') && 
                         !l.startsWith('🎤') && 
                         !l.startsWith('[Voice STT input]') && 
                         !l.startsWith('User Input:') && 
                         !l.startsWith('>>>') && 
                         !l.includes('LOCAL LUMIN ROUTER AGENT') &&
                         !l.startsWith('===');
                })
                .join('\n')
                .trim();

              if (responseText) {
                const isMetaCommand = 
                  responseText.includes('[META]') ||
                  responseText.toLowerCase().includes('lumin meta') || 
                  responseText.toLowerCase().includes('command manager') || 
                  responseText.toLowerCase().includes('command manger') || 
                  responseText.toLowerCase().includes('help / ?') ||
                  responseText.toLowerCase().includes('active locked model') ||
                  responseText.toLowerCase().includes('supported voices');

                const displayResponseText = responseText.replace('[META]', '').trim();

                if (displayResponseText) {
                  const durationSeconds = this.responseTimer;
                  this.stopResponseTimer();

                  // Remove any loading state message
                  this.transcriptionHistory = this.transcriptionHistory.filter(msg => !msg.isLoading);
                  
                  // Check for voice change and update local state
                  const voiceMatch = displayResponseText.match(/Successfully switched default speech synthesis voice to:\s*([a-zA-Z0-9_-]+)/i);
                  if (voiceMatch && voiceMatch[1]) {
                    this.piperVoice = voiceMatch[1].trim();
                    console.log('Client updated piperVoice to:', this.piperVoice);
                  }

                  const aiMessage: TranscriptionEntry = {
                    speaker: 'ai',
                    text: displayResponseText,
                    voiceName: this.piperVoice,
                    responseTime: durationSeconds,
                  };
                  this.transcriptionHistory = [...this.transcriptionHistory, aiMessage];
                  this.isGeneratingResponse = false;
                  soundFX.playMessageReceived();
                  
                  // Play TTS for the response only if auto-play is enabled, it is NOT a meta command, and ttsMode is not 'off'!
                  if (!isMetaCommand && this.autoPlayTTS && this.ttsMode !== 'off') {
                    this.playTTS(displayResponseText, this.transcriptionHistory.length - 1, this.piperVoice);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      if (this.wsTerminal !== ws) {
        console.log('Old/replaced Terminal WebSocket closed. Ignoring reconnect.');
        return;
      }
      console.log('Terminal WebSocket closed.');
      this.wsTerminal = null;
      this.isAgentRunning = false;
      this.isStartingAgent = false;
      this.isStoppingAgent = false;
      this.requestUpdate();
      if (this.isTerminalEnabled) {
        console.log('Reconnecting in 3s...');
        setTimeout(() => {
          if (!this.wsTerminal && this.isTerminalEnabled) {
            this.initTerminalWebSocket();
          }
        }, 3000);
      }
    };

    ws.onerror = (err: Event) => {
      if (this.wsTerminal !== ws) return;
      console.warn('Terminal WebSocket connection issue (reconnection handled on close):', err.type || 'error');
    };
  }

  private startAgent() {
    this.isStartingAgent = true;
    this.isStoppingAgent = false;
    this.requestUpdate();

    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ type: 'start' }));
    } else {
      console.log('Terminal WS not connected. Connecting first to start agent...');
      this.shouldStartOnConnect = true;
      this.initTerminalWebSocket(true);
      
      if (!this.terminalLogs) {
        this.terminalLogs = '';
      }
      this.terminalLogs += '\n[System: Connecting to server and launching LUMIN Agent process...]\n';
      this.requestUpdate();
      this.scrollTerminalToBottom();
    }
  }

  private stopAgent() {
    this.isStoppingAgent = true;
    this.isStartingAgent = false;
    this.requestUpdate();

    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ type: 'stop' }));
    } else {
      console.log('Terminal WS not connected. Force-stopping client state.');
      this.isAgentRunning = false;
      this.isStoppingAgent = false;
      this.requestUpdate();
    }
    if (this.isTerminalVoiceCaptureActive) {
      this.stopTerminalVoiceCapture();
    }
  }

  private sendTerminalInput() {
    const text = this.terminalInput;
    if (!text) return;

    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ type: 'input', data: text }));
      // Echo typed/spoken input to terminal logs for visual consistency
      this.terminalLogs += `${text}\n`;
    }
    this.terminalInput = '';
    this.requestUpdate();
    this.scrollTerminalToBottom();
  }

  private async startTerminalVoiceCapture() {
    this.isTerminalVoiceCaptureActive = true;
    this.enableMicrophone = true;
    if (!this.mediaStream) {
      await this.initMicrophoneAndListeners();
      this.initSpeechRecognition();
    }
    this.startRecording();
    this.requestUpdate();
  }

  private stopTerminalVoiceCapture() {
    this.isTerminalVoiceCaptureActive = false;
    this.stopRecording();
    this.requestUpdate();
  }

  private handleTerminalEmptyEnter() {
    const recentLogs = this.terminalLogs.slice(-300);
    const isSpeakMode = /speak/i.test(recentLogs) || /press enter/i.test(recentLogs);

    if (this.isAgentRunning && isSpeakMode) {
      if (this.isTerminalVoiceCaptureActive) {
        // If they already have spoken words, send them! Otherwise just toggle off.
        if (this.terminalInput.trim()) {
          this.sendTerminalInput();
        }
        this.stopTerminalVoiceCapture();
      } else {
        this.startTerminalVoiceCapture();
      }
    } else if (this.isAgentRunning) {
      // General voice toggle fallback or empty command
      if (this.isTerminalVoiceCaptureActive) {
        if (this.terminalInput.trim()) {
          this.sendTerminalInput();
        }
        this.stopTerminalVoiceCapture();
      } else {
        // Send a plain carriage return to advance process
        if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
          this.wsTerminal.send(JSON.stringify({ type: 'input', data: '' }));
          this.terminalLogs += '\n';
        }
      }
    }
  }

  private scrollTerminalToBottom() {
    setTimeout(() => {
      if (this.terminalScreenRef.value) {
        this.terminalScreenRef.value.scrollTop = this.terminalScreenRef.value.scrollHeight;
      }
    }, 50);
  }

  private renderTerminalLogsHTML() {
    if (!this.terminalLogs) {
      return html`<div style="color: #666; font-style: italic;">Connecting to local Python agent session...\nPress "LAUNCH AGENT" to execute start_agent.bat if not active.</div>`;
    }

    // Split logs into lines and normalize terminal box borders to guarantee perfect alignment on the first frame
    const lines = this.terminalLogs.split('\n');
    let W = 80; // Default to 80 as defined in python/node runner
    
    // First pass: detect box width based on top/bottom borders
    for (const line of lines) {
      if ((line.includes('┌') && line.includes('┐')) || (line.includes('└') && line.includes('┘')) || (line.includes('+') && line.includes('-'))) {
        const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
        if (cleanLine.length >= 40 && cleanLine.length <= 100) {
          W = cleanLine.length;
          break;
        }
      }
    }

    const processedLines = lines.map(line => {
      const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '');
      const firstPipeIdx = cleanLine.indexOf('│') !== -1 ? cleanLine.indexOf('│') : cleanLine.indexOf('|');
      const lastPipeIdx = cleanLine.lastIndexOf('│') !== -1 ? cleanLine.lastIndexOf('│') : cleanLine.lastIndexOf('|');
      const isBoxLine = firstPipeIdx !== -1 && lastPipeIdx !== -1 && firstPipeIdx !== lastPipeIdx && firstPipeIdx <= 5 && lastPipeIdx >= cleanLine.length - 6;

      // 1. Top border
      if ((cleanLine.includes('┌') && cleanLine.includes('┐') && cleanLine.indexOf('┌') <= 5 && cleanLine.lastIndexOf('┐') >= cleanLine.length - 6) ||
          (cleanLine.includes('+') && cleanLine.includes('-') && cleanLine.indexOf('+') === 0 && cleanLine.lastIndexOf('+') === cleanLine.length - 1)) {
        const title = cleanLine.replace(/[┌┐─+-]/g, '').trim();
        const titleLen = title.length;
        const dashLen = Math.floor((W - 4 - titleLen) / 2);
        const leftDashes = '-'.repeat(dashLen);
        const rightDashes = '-'.repeat(W - 4 - titleLen - dashLen);
        return `+${leftDashes} ${title} ${rightDashes}+`;
      }
      
      // 2. Bottom border
      if ((cleanLine.includes('└') && cleanLine.includes('┘') && cleanLine.indexOf('└') <= 5 && cleanLine.lastIndexOf('┘') >= cleanLine.length - 6) ||
          (cleanLine.includes('+') && cleanLine.indexOf('+') === 0 && cleanLine.lastIndexOf('+') === cleanLine.length - 1 && cleanLine.replace(/[+-]/g, '').length === 0)) {
        return `+` + '-'.repeat(W - 2) + `+`;
      }
      
      // 3. Body lines
      if (isBoxLine) {
        const firstPipeOriginalIdx = line.indexOf('│') !== -1 ? line.indexOf('│') : line.indexOf('|');
        const lastPipeOriginalIdx = line.lastIndexOf('│') !== -1 ? line.lastIndexOf('│') : line.lastIndexOf('|');
        if (firstPipeOriginalIdx !== -1 && lastPipeOriginalIdx !== -1 && firstPipeOriginalIdx !== lastPipeOriginalIdx) {
          const innerContentClean = cleanLine.substring(firstPipeIdx + 1, lastPipeIdx).trim();
          const innerContentWithAnsi = line.substring(firstPipeOriginalIdx + 1, lastPipeOriginalIdx).trim();
          const visibleLength = innerContentClean.length;
          const neededSpaces = Math.max(0, (W - 4) - visibleLength);
          return `| ` + innerContentWithAnsi + ' '.repeat(neededSpaces) + ` |`;
        }
      }
      
      return line;
    });

    const normalizedLogs = processedLines.join('\n');

    // Escape HTML first
    let clean = normalizedLogs
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // High-fidelity stateful ANSI escape to HTML inline styles mapping
    const ansiMap: Record<string, string> = {
      '1': 'font-weight: bold;',
      '3': 'text-decoration: underline;',
      '4': 'text-decoration: underline;',
      '30': 'color: #303030;',
      '31': 'color: #ff5555;',
      '32': 'color: #50fa7b;', // Bright vibrant green for highly legible console logs
      '33': 'color: #f1fa8c;', // Bright vibrant yellow
      '34': 'color: #8be9fd;', // cyan/blue hybrid
      '35': 'color: #ff79c6;', // magenta
      '36': 'color: #8be9fd;', // cyan
      '37': 'color: #f8f8f2;', // off-white
      '90': 'color: #6272a4;', // high contrast comment gray
      '91': 'color: #ff6e6e;', // bright red
      '92': 'color: #69ff94;', // neon green
      '93': 'color: #ffffa5;', // neon yellow
      '94': 'color: #bd93f9;', // soft purple
      '95': 'color: #ff92df;', // light pink
      '96': 'color: #a4ffff;', // light cyan
      '97': 'color: #ffffff;', // pure white
      '40': 'background-color: #21222c;',
      '41': 'background-color: #ff5555;',
      '42': 'background-color: #50fa7b;',
      '43': 'background-color: #f1fa8c;',
      '44': 'background-color: #bd93f9;',
      '45': 'background-color: #ff79c6;',
      '46': 'background-color: #8be9fd;',
      '47': 'background-color: #f8f8f2;',
    };

    let openSpanCount = 0;

    // Matches standard ESC[m or ESC[#;...;#m styles
    clean = clean.replace(/[\u001b\x1b]\[([0-9;]*)m/g, (match, p1) => {
      if (!p1 || p1 === '0') {
        const closeTags = '</span>'.repeat(openSpanCount);
        openSpanCount = 0;
        return closeTags;
      }
      
      const codes = p1.split(';');
      let styles: string[] = [];
      
      for (const code of codes) {
        if (code === '0') {
          const closeTags = '</span>'.repeat(openSpanCount);
          openSpanCount = 0;
          return closeTags;
        } else if (ansiMap[code]) {
          styles.push(ansiMap[code]);
        }
      }
      
      if (styles.length > 0) {
        openSpanCount++;
        return `<span style="${styles.join(' ')}">`;
      }
      return '';
    });

    if (openSpanCount > 0) {
      clean += '</span>'.repeat(openSpanCount);
    }

    return unsafeHTML(clean);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mousemove', this.resetIdleTimer);
    document.removeEventListener('touchstart', this.resetIdleTimer);
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('click', this.initSpeechOnInteractionBound);
    document.removeEventListener('touchstart', this.initSpeechOnInteractionBound);
    document.removeEventListener('keydown', this.initSpeechOnInteractionBound);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleWindowResize);
    this.cleanupAllResources();
  }

  private cleanupAudioResources() {
    // Stop all media streams and tracks
    try {
      const streams = [this.mediaStream, this.desktopDeviceStream, this.screenStream, this.videoStream];
      streams.forEach(stream => {
        if (stream) {
          try {
            stream.getTracks().forEach(track => {
              try {
                track.stop();
              } catch (err) {}
            });
          } catch (e) {}
        }
      });
    } catch (e) {}

    this.mediaStream = null as any;
    this.desktopDeviceStream = null;
    this.screenStream = null;
    this.videoStream = null as any;

    try {
      this.flangerLFO?.stop();
    } catch (e) {}

    try {
      const nodes = [
        this.sourceNode,
        this.desktopDeviceSourceNode,
        this.micGainNode,
        this.inputNode,
        this.outputNode,
        this.reverbNode,
        this.reverbGain,
        this.delayNode,
        this.delayGain,
        this.feedbackGain,
        this.dryGain,
        this.flangerNode,
        this.flangerFeedback,
        this.flangerLFOGain,
        this.flangerWetGain,
        this.scriptProcessorNode
      ];
      nodes.forEach(node => {
        if (node) {
          try {
            node.disconnect();
          } catch (e) {}
        }
      });
    } catch (e) {}

    try {
      if (this.sources) {
        this.sources.forEach(source => {
          try {
            source.stop();
            source.disconnect();
          } catch (e) {}
        });
        this.sources.clear();
      }
    } catch (e) {}

    try {
      if (this.currentTTSSource) {
        try {
          this.currentTTSSource.stop();
          this.currentTTSSource.disconnect();
        } catch (e) {}
        this.currentTTSSource = null;
      }
    } catch (e) {}

    try {
      if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
        this.inputAudioContext.close();
      }
    } catch (e) {}

    try {
      if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
        this.outputAudioContext.close();
      }
    } catch (e) {}
  }

  private cleanupAllResources() {
    this.stopResponseTimer();
    this.cleanupAudioResources();
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.releaseWakeLock(); // Release wake lock if active
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null as any;
    }
    if (this.desktopDeviceStream) {
      try {
        this.desktopDeviceStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.desktopDeviceStream = null;
    }
    if (this.videoStream) {
      try {
        this.videoStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.videoStream = null as any;
    }
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    this.stopScreenShare();
    this.stopDesktopDeviceAudio();
    try {
      this.flangerLFO?.stop();
    } catch (e) {}
    this.stopRecording();
    if (this.wsTerminal) {
      try {
        this.wsTerminal.close();
      } catch (e) {}
      this.wsTerminal = null;
    }
    if (this.voiceSubmitTimer) {
      clearTimeout(this.voiceSubmitTimer);
      this.voiceSubmitTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
  }

  private handleFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
    this.triggerWindowResize();
  };

  private resetIdleTimer = () => {
    this.isIdle = false;
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => {
      this.isIdle = true;
    }, 2500);
  };

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('activeTheme') || changedProperties.has('customThemeColors') || changedProperties.has('customMainColor') || changedProperties.has('separateCustomColors')) {
      this.applyTheme(this.activeTheme);
    }
    if (changedProperties.has('transcriptionHistory') || changedProperties.has('inputTranscription') || changedProperties.has('outputTranscription')) {
      this.chatHistoryRef.value?.scrollTo({
        top: this.chatHistoryRef.value.scrollHeight,
        behavior: 'smooth',
      });
      setTimeout(() => this.addCodeCopyButtons(), 50);
    }
  }

  private customThemeAnimationFrame: number | null = null;

  private applyTheme(themeKey: keyof typeof THEMES | 'custom') {
    if (this.customThemeAnimationFrame) {
      cancelAnimationFrame(this.customThemeAnimationFrame);
      this.customThemeAnimationFrame = null;
    }

    if (themeKey === 'custom') {
      const theme = THEMES['cyberware'];
      for (const [key, value] of Object.entries(theme)) {
        if (key !== 'name' && key !== '--glow-color' && key !== '--glow-color-faded') {
          (this as unknown as HTMLElement).style.setProperty(key, value);
        }
      }

      const updateCustomGlow = () => {
        if (this.activeTheme !== 'custom') return;
        
        if (this.separateCustomColors) {
          const finalHex = this.customMainColor || '#00aaff';
          (this as unknown as HTMLElement).style.setProperty('--glow-color', finalHex);
          (this as unknown as HTMLElement).style.setProperty('--glow-color-faded', finalHex + '80');
        } else {
          const colorCount = this.customThemeColors.length;
          if (colorCount > 0) {
            const t = performance.now();
            const cycleTime = 2000 / Math.max(0.1, this.themeTransitionSpeed);
            const colorProgress = (t % (cycleTime * colorCount)) / cycleTime;
            const colorIndex1 = Math.floor(colorProgress) % colorCount;
            const colorIndex2 = (colorIndex1 + 1) % colorCount;
            const mixRatio = colorProgress % 1;

            const parseHex = (hex: string) => {
              let r = 0, g = 0, b = 0;
              if (hex && hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
              } else if (hex && hex.length === 7) {
                r = parseInt(hex.slice(1, 3), 16);
                g = parseInt(hex.slice(3, 5), 16);
                b = parseInt(hex.slice(5, 7), 16);
              }
              return [r, g, b];
            };

            const c1 = parseHex(this.customThemeColors[colorIndex1] || '#00aaff');
            const c2 = parseHex(this.customThemeColors[colorIndex2] || '#00aaff');
            
            const r = Math.round(c1[0] + (c2[0] - c1[0]) * mixRatio);
            const g = Math.round(c1[1] + (c2[1] - c1[1]) * mixRatio);
            const b = Math.round(c1[2] + (c2[2] - c1[2]) * mixRatio);
            
            const hexR = r.toString(16).padStart(2, '0');
            const hexG = g.toString(16).padStart(2, '0');
            const hexB = b.toString(16).padStart(2, '0');
            const finalHex = `#${hexR}${hexG}${hexB}`;

            (this as unknown as HTMLElement).style.setProperty('--glow-color', finalHex);
            (this as unknown as HTMLElement).style.setProperty('--glow-color-faded', finalHex + '80');
          }
        }
        
        this.customThemeAnimationFrame = requestAnimationFrame(updateCustomGlow);
      };

      updateCustomGlow();
      return;
    }
    const theme = THEMES[themeKey];
    for (const [key, value] of Object.entries(theme)) {
      if (key !== 'name') {
        // Fix: Cast `this` to `unknown` and then `HTMLElement` to satisfy strict type checking.
        (this as unknown as HTMLElement).style.setProperty(
          key,
          value as string,
        );
      }
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isRecognitionActive = true;
    };

    this.recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Feedback loop guard: ignore any speech recognition results received while TTS is playing
      // or within 1.5 seconds after it has stopped, to prevent the AI from responding to its own voice.
      if (this.ttsPlaybackState === 'playing' || (Date.now() - this.lastTTSFinishedTime < 1500)) {
        if (finalTranscript.trim() || interimTranscript.trim()) {
          console.log('[Feedback Guard] Discarded transcription during/immediately after TTS playback:', finalTranscript || interimTranscript);
        }
        return;
      }

      const lowerFinal = finalTranscript.toLowerCase();
      const lowerInterim = interimTranscript.toLowerCase();

      const customActivate = this.activateWord.trim().toLowerCase();
      const wakeWords = Array.from(new Set([customActivate, 'wake up', 'hey lumin', 'ok lumin', 'okay lumin', 'hi lumin', 'hello lumin'].filter(Boolean)));
      const sleepWordLower = this.sleepCommandWord.trim().toLowerCase();

      const containsActivate = wakeWords.some(w => lowerFinal.includes(w) || lowerInterim.includes(w));
      const containsSleep = sleepWordLower !== '' && (lowerFinal.includes(sleepWordLower) || lowerInterim.includes(sleepWordLower));

      if (containsSleep) {
        this.lastSleepTimestamp = Date.now();
        if (this.voiceSubmitTimer) {
          clearTimeout(this.voiceSubmitTimer);
          this.voiceSubmitTimer = null;
        }
        this.chatInputText = '';
        soundFX.playVoiceStop();
        this.stopEverythingAndGoToIdle();
        this.updateStatus('Audiovisualizer Deactivated');
        if (this.recognition) {
          try {
            this.recognition.abort();
          } catch (e) {}
        }
        return;
      }

      if (containsActivate) {
        // Prevent accidental re-activation if sleep command was issued recently (<2.5s ago)
        if (Date.now() - this.lastSleepTimestamp < 2500) {
          return;
        }

        // Clear any pending voice auto-submit timer & prevent hotword text contamination
        if (this.voiceSubmitTimer) {
          clearTimeout(this.voiceSubmitTimer);
          this.voiceSubmitTimer = null;
        }

        // Auto-launch agent if toggle is ON and agent is not yet running
        if (this.isAutoLaunchOnWakeWord) {
          this.isTerminalEnabled = true;
          this.isTerminalOpen = true;
          if (!this.isAgentRunning && !this.isStartingAgent) {
            console.log('[Wake Word Auto-Launch] Launching agent session...');
            this.startAgent();
          }
        }

        // Extract any follow-up speech spoken along with the wake word in the transcript
        const fullTranscript = (finalTranscript || interimTranscript).trim();
        let followUpQuery = '';
        for (const ww of wakeWords) {
          const idx = fullTranscript.toLowerCase().indexOf(ww);
          if (idx !== -1) {
            followUpQuery = fullTranscript.slice(idx + ww.length).replace(/^[^a-zA-Z0-9]+/, '').trim();
            break;
          }
        }
        this.chatInputText = followUpQuery;

        // Activate and continuously maintain audiovisualizer active state
        if (!this.isRecording || this.micPausedByTTS) {
          soundFX.playVoiceStart();
          await this.startVoiceSession();
        } else {
          this.updateStatus('Audiovisualizer Active');
        }

        // If follow-up text exists, start silence auto-submit timer
        if (followUpQuery) {
          this.voiceSubmitTimer = setTimeout(() => {
            if (this.chatInputText.trim() && this.isRecording && !this.isGeneratingResponse) {
              console.log('[Auto-Submit] Submitting follow-up query after wake word:', this.chatInputText);
              this.stopRecording(false);
              this.handleSendMessage();
            }
          }, 1500);
        }
        return;
      }

      if (this.isRecording) {
         if (this.isTerminalVoiceCaptureActive) {
           if (finalTranscript.trim()) {
             this.terminalInput = (this.terminalInput + " " + finalTranscript).trim();
             this.requestUpdate();
           }
           return;
         }

         if (this.handleVoiceCommand(finalTranscript)) {
             return;
         }

         // Accumulate text while recording
         this.chatInputText = (this.chatInputText + " " + finalTranscript).trim();
         
         // Auto-submit after silence/speech end (1.5s)
         if (interimTranscript.trim() || finalTranscript.trim()) {
           if (this.voiceSubmitTimer) {
             clearTimeout(this.voiceSubmitTimer);
           }
           this.voiceSubmitTimer = setTimeout(() => {
             if (this.chatInputText.trim() && this.isRecording && !this.isGeneratingResponse) {
               console.log('[Auto-Submit] Auto-submitting transcription due to silence:', this.chatInputText);
                this.stopRecording(false);
               this.handleSendMessage();
             }
           }, 1500);
         }
      }
    };

    this.recognition.onerror = (event: any) => {
      // Suppress common transient errors to keep the console clean.
      const ignoredErrors = ['no-speech', 'audio-capture', 'not-allowed', 'network', 'aborted'];
      if (ignoredErrors.includes(event.error)) {
        if (event.error === 'not-allowed') {
          this.isRecognitionActive = false;
        }
        return;
      }
      // Only log critical errors that might need debugging
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      if (this.recognitionPausedByTTS) {
        return; // Do NOT restart while TTS is playing to prevent microphone loop!
      }
      // Automatically restart to keep listening for wake/sleep words continuously
      setTimeout(() => {
        try {
          if (this.recognition && !this.isReconnecting && !this.recognitionPausedByTTS) {
            this.recognition.start();
          }
        } catch (e) {
          // Silently fail restart to avoid log spam
        }
      }, 1000);
    };

    try {
      this.recognition.start();
    } catch (e) {
      // Silently fail start to avoid log spam
    }
  }

  private async requestWakeLock() {
    if ('wakeLock' in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        // Silent handling of permission issues to avoid log spam
      }
    }
  }

  private async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  private async initMicrophoneAndListeners() {
    if (!this.enableMicrophone) {
      this.mediaStream = null;
      return;
    }
    try {
      this.updateStatus('Requesting microphone...');
      const audioConstraints: any = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };
      if (this.selectedMicAudioDeviceId) {
        audioConstraints.deviceId = { exact: this.selectedMicAudioDeviceId };
      }
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      this.updateStatus(``);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error initializing microphone:', errorMessage);
      this.updateStatus(`Error: Could not access microphone. ${errorMessage}`);
      this.updateError(`Error: Could not access microphone. ${errorMessage}`);
    }
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();
    this.setupAudioEffects();
    // No more Live API session to init
  }

  private async createImpulseResponse() {
    const sampleRate = this.outputAudioContext.sampleRate;
    const duration = 2; // 2 seconds
    const decay = 3;
    const length = sampleRate * duration;
    const impulse = this.outputAudioContext.createBuffer(
      2,
      length,
      sampleRate,
    );
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return impulse;
  }

  private async setupAudioEffects() {
    // Disconnect the direct output to insert effects chain
    this.outputNode.disconnect();

    // Create common nodes
    this.dryGain = this.outputAudioContext.createGain();

    // -- Reverb Path --
    this.reverbNode = this.outputAudioContext.createConvolver();
    this.reverbGain = this.outputAudioContext.createGain();
    this.reverbNode.buffer = await this.createImpulseResponse();
    this.outputNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.outputAudioContext.destination);

    // -- Delay Path --
    this.delayNode = this.outputAudioContext.createDelay(1.0);
    this.delayGain = this.outputAudioContext.createGain();
    this.feedbackGain = this.outputAudioContext.createGain();
    this.delayNode.delayTime.value = 0.4;
    this.feedbackGain.gain.value = 0.4;
    this.outputNode.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayGain.connect(this.outputAudioContext.destination);

    // -- Flanger Path --
    this.flangerNode = this.outputAudioContext.createDelay(0.1);
    this.flangerFeedback = this.outputAudioContext.createGain();
    this.flangerWetGain = this.outputAudioContext.createGain();
    this.flangerLFO = this.outputAudioContext.createOscillator();
    this.flangerLFOGain = this.outputAudioContext.createGain();
    this.flangerNode.delayTime.value = 0.005; // 5ms delay
    this.flangerFeedback.gain.value = 0.5;
    this.flangerLFO.type = 'sine';
    this.flangerLFO.frequency.value = 0.25; // Slow swoosh
    this.flangerLFOGain.gain.value = 0.0025; // Depth of modulation
    this.outputNode.connect(this.flangerNode);
    this.flangerNode.connect(this.flangerWetGain);
    this.flangerNode.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerNode);
    this.flangerWetGain.connect(this.outputAudioContext.destination);
    this.flangerLFO.connect(this.flangerLFOGain);
    this.flangerLFOGain.connect(this.flangerNode.delayTime);
    this.flangerLFO.start();

    // -- Dry Path --
    this.outputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputAudioContext.destination);

    // Set initial gains for all effects
    this.updateAudioEffects();
  }

  private updateAudioEffects() {
    const hasEffects =
      this.masterEffectsEnabled && (this.isReverbEnabled || this.isDelayEnabled || this.isFlangerEnabled);
    const rampTime = this.outputAudioContext.currentTime + 0.1;

    // Reverb gain
    this.reverbGain.gain.linearRampToValueAtTime(
      (this.masterEffectsEnabled && this.isReverbEnabled) ? 0.6 : 0,
      rampTime,
    );

    // Delay gain
    this.delayGain.gain.linearRampToValueAtTime(
      (this.masterEffectsEnabled && this.isDelayEnabled) ? 0.4 : 0,
      rampTime,
    );
    this.feedbackGain.gain.linearRampToValueAtTime(
      (this.masterEffectsEnabled && this.isDelayEnabled) ? 0.5 : 0,
      rampTime,
    );

    // Flanger gain
    this.flangerWetGain.gain.linearRampToValueAtTime(
      (this.masterEffectsEnabled && this.isFlangerEnabled) ? 0.6 : 0,
      rampTime,
    );
    this.flangerFeedback.gain.linearRampToValueAtTime(
      (this.masterEffectsEnabled && this.isFlangerEnabled) ? 0.5 : 0,
      rampTime,
    );

    // Adjust dry gain to prevent clipping when effects are on
    this.dryGain.gain.linearRampToValueAtTime(
      hasEffects ? 0.8 : 1.0,
      rampTime,
    );
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
    if (msg) {
      soundFX.playError();
    }
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    if (this.enableMicrophone && !this.mediaStream) {
      this.updateError('Microphone stream not available.');
      this.updateStatus(
        'Error: Microphone stream not available. Please allow microphone access.',
      );
      return;
    }

    if (this.mediaStream) {
      this.mediaStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = this.enableMicrophone));
    }

    this.inputAudioContext.resume();
    this.updateStatus('Listening...');

    try {
      if (this.enableMicrophone && this.mediaStream && !this.sourceNode) {
        this.sourceNode = this.inputAudioContext.createMediaStreamSource(
          this.mediaStream,
        );
        this.sourceNode.connect(this.micGainNode);
        this.micGainNode.connect(this.inputNode);
      }

      this.isRecording = true;
      this.micGainNode.gain.value = 1;
      this.requestWakeLock();
      this.startVAD();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error starting recording:', errorMessage);
      this.updateStatus(`Error: ${errorMessage}`);
      this.stopRecording();
    }
  }

  private stopRecording(isPausingForTTS = false) {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.isRecording = false;
    this.micGainNode.gain.value = 0;
    this.stopVAD();
    if (isPausingForTTS) {
      this.micPausedByTTS = true;
      // The microphone track is no longer disabled here to prevent system
      // sounds on Android. The `micPausedByTTS` flag is sufficient to
      // prevent the wake word listener from re-triggering.
    } else {
      this.micPausedByTTS = false;
    }

    // We no longer disconnect the scriptProcessorNode and sourceNode here.
    // Reusing them prevents InvalidStateError on some browsers when calling
    // createMediaStreamSource multiple times for the same stream.
    // The `isRecording` flag in `onaudioprocess` prevents data from being sent.

    if (!isPausingForTTS) {
      this.updateStatus('');
    }
  }

  private startVAD() {
    this.stopVAD();
    this.speechDetected = false;
    this.lastSpeechTime = Date.now();

    if (!this.vadAnalyser && this.inputAudioContext && this.mediaStream) {
      try {
        this.vadAnalyser = this.inputAudioContext.createAnalyser();
        this.vadAnalyser.fftSize = 512;
        if (this.micGainNode) {
          this.micGainNode.connect(this.vadAnalyser);
        }
      } catch (e) {
        console.error('Error creating VAD analyser:', e);
      }
    }

    this.vadInterval = setInterval(() => {
      if (!this.isRecording || this.isGeneratingResponse || !this.vadAnalyser) {
        return;
      }

      const bufferLength = this.vadAnalyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      this.vadAnalyser.getFloatTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Speech detection
      if (rms > this.vadThreshold) {
        this.lastSpeechTime = Date.now();
        this.speechDetected = true;
      } else if (this.chatInputText.trim() !== '') {
        // SpeechRecognition transcribed something, speech was definitely detected
        this.speechDetected = true;
      }

      // If speech was detected and now we have silence (1.5s)
      if (this.speechDetected && (Date.now() - this.lastSpeechTime > 1500)) {
        console.log('[VAD] Silence detected. Auto-submitting transcription:', this.chatInputText);
        this.stopVAD();
        if (this.voiceSubmitTimer) {
          clearTimeout(this.voiceSubmitTimer);
          this.voiceSubmitTimer = null;
        }
        this.stopRecording(false);
        this.handleSendMessage();
      }
    }, 100);
  }

  private stopVAD() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    this.speechDetected = false;
  }

  private stopEverythingAndGoToIdle() {
    this.isPendingSleep = false;
    this.isContinuousActive = false;
    this.chatInputText = '';
    if (this.voiceSubmitTimer) {
      clearTimeout(this.voiceSubmitTimer);
      this.voiceSubmitTimer = null;
    }
    this.releaseWakeLock();
    // Stop any pending microphone restart
    if (this.restartMicTimer) {
      clearTimeout(this.restartMicTimer);
      this.restartMicTimer = null;
    }

    // Stop any currently playing TTS
    for (const source of this.sources) {
      try {
        source.stop();
      } catch (e) {}
    }
    this.sources.clear();
    this.nextStartTime = 0;

    // Call the original stopRecording to handle mic/state cleanup
    this.stopRecording(false);

    // Stop screen share / desktop audio devices
    this.stopScreenShare();
    this.stopDesktopDeviceAudio();

    // Explicitly re-enable microphone for wake word listener.
    // This is crucial if the sleep word is said while the AI is talking (mic is muted).
    if (this.mediaStream) {
      this.mediaStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = this.enableMicrophone));
    }
    this.requestUpdate();
  }

  private handleMicClick(e: Event) {
    e.preventDefault();
    if (this.micClickTimeout) {
      clearTimeout(this.micClickTimeout);
      this.micClickTimeout = null;
      this.handleMicDoubleTap();
    } else {
      this.micClickTimeout = setTimeout(() => {
        this.micClickTimeout = null;
        this.handleMicSingleTap();
      }, 250);
    }
  }

  private async handleMicSingleTap() {
    if (this.isContinuousActive) {
      this.exitContinuousMode();
      return;
    }
    this.voiceMode = 'single';
    if (this.isRecording || this.micPausedByTTS) {
      soundFX.playVoiceStop();
      this.stopEverythingAndGoToIdle();
    } else {
      soundFX.playVoiceStart();
      await this.startVoiceSession();
    }
  }

  private async handleMicDoubleTap() {
    if (this.isContinuousActive) {
      this.exitContinuousMode();
      return;
    }
    this.voiceMode = 'continuous';
    this.isContinuousActive = true;
    soundFX.playVoiceStart();
    this.updateStatus('Continuous Mode Enabled');
    await this.startVoiceSession();
  }

  private exitContinuousMode() {
    this.isContinuousActive = false;
    this.voiceMode = 'single';
    soundFX.playVoiceStop();
    this.stopEverythingAndGoToIdle();
    this.updateStatus('Continuous Mode Disabled');
  }

  private async startVoiceSession() {
    this.chatInputText = '';
    if (this.enableMicrophone) {
      if (!this.mediaStream) {
        await this.initMicrophoneAndListeners();
      }
    }
    
    this.initSpeechRecognition();

    if (this.enableDesktopAudio) {
      if (this.selectedDesktopAudioDeviceId && this.selectedDesktopAudioDeviceId !== 'screen-share') {
        await this.startDesktopDeviceAudio();
      } else {
        if (!this.isScreenSharingEnabled) {
          await this.startScreenShare();
        }
      }
    }

    await this.startRecording();
  }

  private async toggleRecording() {
    this.voiceMode = 'single';
    if (this.isRecording || this.micPausedByTTS || this.isScreenSharingEnabled || this.desktopDeviceStream) {
      this.stopEverythingAndGoToIdle();
    } else {
      await this.startVoiceSession();
    }
  }

  private reset() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    this.isReconnecting = false; // Cancel any pending reconnect attempts
    this.reconnectAttempts = 0;
    this.stopEverythingAndGoToIdle();
    this.searchCitations = [];
    this.inputTranscription = '';
    this.outputTranscription = '';
    this.updateError(''); // Immediately clear error on manual reset
    this.updateStatus('Session Reset');
  }

  private openSettings() {
    this.isSettingsOpen = true;
    this.initialMasterEffectsEnabled = this.masterEffectsEnabled;
    this.initialReverbState = this.isReverbEnabled;
    this.initialDelayState = this.isDelayEnabled;
    this.initialFlangerState = this.isFlangerEnabled;
    this.initialParticleSize = this.particleSize;
    this.initialParticleSpeed = this.particleSpeed;
    this.initialParticleShape = this.particleShape;
    this.initialVisualizerShape = this.visualizerShape;
    this.initialVisualizerSize = this.visualizerSize;
    this.initialVisualizerSpeed = this.visualizerSpeed;
    this.initialShowParticles = this.showParticles;
    this.initialShowMainVisualizer = this.showMainVisualizer;
    this.initialEnableMicrophone = this.enableMicrophone;
    this.initialEnableDesktopAudio = this.enableDesktopAudio;
    this.initialSelectedMicAudioDeviceId = this.selectedMicAudioDeviceId;
    this.initialSelectedDesktopAudioDeviceId = this.selectedDesktopAudioDeviceId;
    this.initialActivateWord = this.activateWord;
    this.initialSleepCommandWord = this.sleepCommandWord;
    this.initialOfflineMode = this.offlineMode;
    this.initialBloomIntensity = this.bloomIntensity;
    this.initialBloomRadius = this.bloomRadius;
    this.initialBloomThreshold = this.bloomThreshold;
    this.initialTheme = this.activeTheme;
    this.initialCustomThemeColors = [...this.customThemeColors];
    this.initialSeparateCustomColors = this.separateCustomColors;
    this.initialCustomMainColor = this.customMainColor;
    this.initialCustomParticleColor = this.customParticleColor;
    this.initialGlobalScale = this.globalScale;
    this.initialAfterimageEnabled = this.afterimageEnabled;
    this.initialAfterimageStrength = this.afterimageStrength;
    this.initialChromaticAberrationEnabled = this.chromaticAberrationEnabled;
    this.initialMorphingEnabled = this.morphingEnabled;
    this.initialFilmGrainEnabled = this.filmGrainEnabled;
    this.initialFilmGrainIntensity = this.filmGrainIntensity;
    this.initialGlowPulseStrength = this.glowPulseStrength;
    this.initialThemeTransitionSpeed = this.themeTransitionSpeed;
    this.initialMetalness = this.metalness;
    this.initialRoughness = this.roughness;
    this.initialRotationSpeed = this.rotationSpeed;
    this.initialRotationLocked = this.rotationLocked;
    this.initialAutoPanEnabled = this.autoPanEnabled;
    this.initialAutoPanSpeed = this.autoPanSpeed;
    this.initialDirectionalLightIntensity = this.directionalLightIntensity;
    this.initialAmbientLightIntensity = this.ambientLightIntensity;
    this.activeSettingsTab = 'GENERAL';

    // Query for physical audio input devices
    this.updateAudioDevicesList();
  }

  private cancelSettings() {
    this.isSettingsOpen = false;
    this.masterEffectsEnabled = this.initialMasterEffectsEnabled;
    this.isReverbEnabled = this.initialReverbState;
    this.isDelayEnabled = this.initialDelayState;
    this.isFlangerEnabled = this.initialFlangerState;
    this.particleSize = this.initialParticleSize;
    this.particleSpeed = this.initialParticleSpeed;
    this.particleShape = this.initialParticleShape;
    this.visualizerShape = this.initialVisualizerShape;
    this.visualizerSize = this.initialVisualizerSize;
    this.visualizerSpeed = this.initialVisualizerSpeed;
    this.showParticles = this.initialShowParticles;
    this.showMainVisualizer = this.initialShowMainVisualizer;
    this.enableMicrophone = this.initialEnableMicrophone;
    this.enableDesktopAudio = this.initialEnableDesktopAudio;
    this.selectedMicAudioDeviceId = this.initialSelectedMicAudioDeviceId;
    this.selectedDesktopAudioDeviceId = this.initialSelectedDesktopAudioDeviceId;
    this.activateWord = this.initialActivateWord;
    this.sleepCommandWord = this.initialSleepCommandWord;
    this.offlineMode = this.initialOfflineMode;
    this.bloomIntensity = this.initialBloomIntensity;
    this.bloomRadius = this.initialBloomRadius;
    this.bloomThreshold = this.initialBloomThreshold;
    this.activeTheme = this.initialTheme;
    this.customThemeColors = [...this.initialCustomThemeColors];
    this.separateCustomColors = this.initialSeparateCustomColors;
    this.customMainColor = this.initialCustomMainColor;
    this.customParticleColor = this.initialCustomParticleColor;
    this.globalScale = this.initialGlobalScale;
    this.afterimageEnabled = this.initialAfterimageEnabled;
    this.afterimageStrength = this.initialAfterimageStrength;
    this.chromaticAberrationEnabled = this.initialChromaticAberrationEnabled;
    this.morphingEnabled = this.initialMorphingEnabled;
    this.filmGrainEnabled = this.initialFilmGrainEnabled;
    this.filmGrainIntensity = this.initialFilmGrainIntensity;
    this.glowPulseStrength = this.initialGlowPulseStrength;
    this.themeTransitionSpeed = this.initialThemeTransitionSpeed;
    this.metalness = this.initialMetalness;
    this.roughness = this.initialRoughness;
    this.rotationSpeed = this.initialRotationSpeed;
    this.rotationLocked = this.initialRotationLocked;
    this.autoPanEnabled = this.initialAutoPanEnabled;
    this.autoPanSpeed = this.initialAutoPanSpeed;
    this.directionalLightIntensity = this.initialDirectionalLightIntensity;
    this.ambientLightIntensity = this.initialAmbientLightIntensity;
    this.chromaticAberrationIntensity =
      this.initialChromaticAberrationIntensity;
    this.updateAudioEffects();
  }

  private saveSettings(e: Event) {
    e.preventDefault();
    this.isSettingsOpen = false;
    
    // Save to localStorage
    localStorage.setItem('project_lumin_activate_word', this.activateWord);
    localStorage.setItem('project_lumin_sleep_word', this.sleepCommandWord);
    localStorage.setItem('project_lumin_enable_microphone', String(this.enableMicrophone));
    localStorage.setItem('project_lumin_enable_desktop_audio', String(this.enableDesktopAudio));
    localStorage.setItem('project_lumin_selected_mic_device', this.selectedMicAudioDeviceId);
    localStorage.setItem('project_lumin_selected_desktop_device', this.selectedDesktopAudioDeviceId);
    
    if (!this.enableMicrophone && this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null as any;
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null as any;
      }
    }

    if (!this.enableDesktopAudio && this.isScreenSharingEnabled) {
      this.stopScreenShare();
    }
    
    this.reset();

    // Reinitialize speech recognition to cleanly apply the new words and keep wake word detection active
    this.initSpeechRecognition();
  }

  private adjustCameraPreviewAspectRatio() {
    if (!this.videoRef.value || !this.isCameraEnabled) return;
    const video = this.videoRef.value;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;
    const aspectRatio = videoWidth / videoHeight;
    // Fix: Cast `this` to LitElement to access `shadowRoot` property.
    const previewContainer = (this as LitElement).shadowRoot?.querySelector(
      '.camera-view',
    ) as HTMLElement;
    if (previewContainer) {
      const width = previewContainer.offsetWidth;
      previewContainer.style.height = `${width / aspectRatio}px`;
    }
  }

  private isCameraTransitioning = false;

  private async updateAudioDevicesList() {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.audioDevices = devices.filter(d => d.kind === 'audioinput');
        console.log('[AudioDevices] Loaded devices:', this.audioDevices);
        this.requestUpdate();
      }
    } catch (e) {
      console.warn('Failed to enumerate audio devices:', e);
    }
  }

  private async startDesktopDeviceAudio() {
    if (this.desktopDeviceStream) return;
    try {
      console.log('Capturing custom desktop audio device:', this.selectedDesktopAudioDeviceId);
      this.desktopDeviceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: this.selectedDesktopAudioDeviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      
      const audioTracks = this.desktopDeviceStream.getAudioTracks();
      if (audioTracks.length > 0) {
        if (this.inputAudioContext.state === 'suspended') {
          await this.inputAudioContext.resume();
        }
        this.desktopDeviceSourceNode = this.inputAudioContext.createMediaStreamSource(this.desktopDeviceStream);
        this.desktopDeviceSourceNode.connect(this.inputNode);
        console.log('Successfully connected custom desktop audio device to visualizer.');
      }
    } catch (err) {
      console.error('Failed to capture custom desktop audio device:', err);
      this.updateError(`Could not access selected desktop audio device. Please ensure it is not in use.`);
    }
  }

  private stopDesktopDeviceAudio() {
    if (this.desktopDeviceSourceNode) {
      try {
        this.desktopDeviceSourceNode.disconnect();
      } catch (e) {}
      this.desktopDeviceSourceNode = null;
    }
    if (this.desktopDeviceStream) {
      try {
        this.desktopDeviceStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.desktopDeviceStream = null;
    }
  }

  private stopScreenShare() {
    this.isScreenSharingEnabled = false;
    if (this.screenAudioSourceNode) {
      try {
        this.screenAudioSourceNode.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.screenAudioSourceNode = null;
    }
    if (this.screenFrameInterval) {
      clearInterval(this.screenFrameInterval);
      this.screenFrameInterval = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.screenVideoRef.value) {
      this.screenVideoRef.value.srcObject = null;
      this.screenVideoRef.value.onloadedmetadata = null;
    }
  }

  private async startScreenShare() {
    if (this.isScreenSharingEnabled) return;

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { max: 15 },
        },
        audio: this.enableDesktopAudio, // Enable audio capture based on setting
      });

      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      const audioTracks = this.screenStream.getAudioTracks();
      if (audioTracks.length > 0) {
        try {
          // Resume audio context in case it was suspended due to autoplay policies
          if (this.inputAudioContext.state === 'suspended') {
            await this.inputAudioContext.resume();
          }
          this.screenAudioSourceNode = this.inputAudioContext.createMediaStreamSource(this.screenStream);
          this.screenAudioSourceNode.connect(this.inputNode);
        } catch (e) {
          console.error('Failed to create media stream source from screen share audio:', e);
        }
      }

      if (this.screenVideoRef.value) {
        this.screenVideoRef.value.srcObject = this.screenStream;
        this.screenVideoRef.value.onloadedmetadata = () => {
          this.adjustScreenPreviewAspectRatio();
        };
        this.isScreenSharingEnabled = true;
        this.startScreenFrameCapture();
      }
    } catch (err) {
      console.error(`Error starting screen share:`, err);
      this.updateError('Could not start screen sharing. Permission may have been denied.');
      this.stopScreenShare();
    }
  }

  private startScreenFrameCapture() {
    if (this.screenFrameInterval) {
      clearInterval(this.screenFrameInterval);
    }
    // Capture frames at ~2fps to avoid overloading the system and websocket
    this.screenFrameInterval = setInterval(() => {
      this.captureScreenFrame();
    }, 500);
  }

  private captureScreenFrame() {
    if (
      !this.isScreenSharingEnabled ||
      !this.screenVideoRef.value ||
      !this.canvasRef.value
    ) {
      return;
    }

    const video = this.screenVideoRef.value;
    const canvas = this.canvasRef.value;
    const context = canvas.getContext('2d');

    if (context && video.videoWidth > 0 && video.videoHeight > 0) {
      // Scale down to 720p max to prevent base64 encoding from freezing UI
      let width = video.videoWidth;
      let height = video.videoHeight;
      const MAX_DIM = 1280;
      if (width > MAX_DIM || height > MAX_DIM) {
         if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
         } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
         }
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      // For offline applet, could save or use locally.
    }
  }

  private adjustScreenPreviewAspectRatio() {
    if (this.screenVideoRef.value && this.screenViewRef.value) {
      const video = this.screenVideoRef.value;
      const container = this.screenViewRef.value;
      const videoRatio = video.videoWidth / video.videoHeight;
      
      // Default container size
      let width = 180;
      let height = width / videoRatio;
      
      // Ensure it doesn't get too tall
      if (height > 240) {
        height = 240;
        width = height * videoRatio;
      }
      
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
    }
  }

  private stopCamera() {
    this.isCameraEnabled = false;
    this.activeVideoDeviceId = null;
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      this.videoStream = null;
    }
    if (this.videoRef.value) {
      this.videoRef.value.srcObject = null;
      this.videoRef.value.onloadedmetadata = null;
    }
  }

  private async startCamera() {
    if (this.isCameraEnabled || this.isCameraTransitioning) return;
    this.isCameraTransitioning = true;

    try {
      if (this.videoDevices.length === 0) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          tempStream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          const devices = await navigator.mediaDevices.enumerateDevices();
          this.videoDevices = devices.filter(
            (device) => device.kind === 'videoinput',
          );
        } catch (e) {
          this.updateError('Camera permission denied.');
          console.error('Could not get camera permissions to list devices.', e);
          return;
        }
      }

      if (this.videoDevices.length === 0) {
        this.updateError('No camera found.');
        return;
      }

      const nextDeviceId = this.videoDevices[0].deviceId;
      
      try {
        const constraints = {video: {deviceId: {exact: nextDeviceId}}};
        this.videoStream = await navigator.mediaDevices.getUserMedia(
          constraints,
        );
        const videoTrack = this.videoStream.getVideoTracks()[0];
        this.activeVideoDeviceId = videoTrack.getSettings().deviceId ?? null;
        if (this.videoRef.value) {
          this.videoRef.value.srcObject = this.videoStream;
          this.videoRef.value.onloadedmetadata = () => {
            this.adjustCameraPreviewAspectRatio();
          };
          this.isCameraEnabled = true;
          this.startFrameCapture();
        }
      } catch (err) {
        console.error(`Error starting camera:`, err);
        this.updateError('Could not start the selected camera. It may be in use.');
        this.stopCamera();
      }
    } finally {
      this.isCameraTransitioning = false;
    }
  }

  private async cycleCamera(turnOffIfAtEnd: boolean = false, backward: boolean = false) {
    if (!this.isCameraEnabled || this.isCameraTransitioning) return;
    this.isCameraTransitioning = true;

    try {
      const currentDeviceId = this.activeVideoDeviceId;
      const currentIndex = this.videoDevices.findIndex(
        (d) => d.deviceId === currentDeviceId,
      );
      
      let nextIndex;
      if (backward) {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = this.videoDevices.length - 1; // Loop to end
        }
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= this.videoDevices.length) {
          if (turnOffIfAtEnd) {
            this.stopCamera();
            return;
          } else {
            nextIndex = 0; // Loop to start
          }
        }
      }

      const nextDeviceId = this.videoDevices[nextIndex].deviceId;
      
      // Always fully stop the current camera before starting a new one
      this.stopCamera();

      // Small delay to ensure hardware is fully released
      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        const constraints = {video: {deviceId: {exact: nextDeviceId}}};
        this.videoStream = await navigator.mediaDevices.getUserMedia(
          constraints,
        );
        const videoTrack = this.videoStream.getVideoTracks()[0];
        this.activeVideoDeviceId = videoTrack.getSettings().deviceId ?? null;
        if (this.videoRef.value) {
          this.videoRef.value.srcObject = this.videoStream;
          this.videoRef.value.onloadedmetadata = () => {
            this.adjustCameraPreviewAspectRatio();
          };
          this.isCameraEnabled = true;
          this.startFrameCapture();
        }
      } catch (err) {
        console.error(`Error starting camera:`, err);
        // If the next camera fails, just turn it off without an error message
        // to gracefully handle broken/virtual cameras at the end of the list.
        this.stopCamera();
      }
    } finally {
      this.isCameraTransitioning = false;
    }
  }

  private async toggleCamera() {
    if (this.isCameraEnabled) {
      await this.cycleCamera(true);
    } else {
      await this.startCamera();
    }
  }

  private startFrameCapture() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
    }
    const FRAME_RATE = 2; // Capture 2 frames per second
    this.frameInterval = setInterval(async () => {
      if (
        !this.isCameraEnabled ||
        !this.videoRef.value ||
        !this.canvasRef.value
      ) {
        return;
      }

      const videoEl = this.videoRef.value;
      const canvasEl = this.canvasRef.value;
      const ctx = canvasEl.getContext('2d');

      if (videoEl.readyState >= 2) {
        let width = videoEl.videoWidth;
        let height = videoEl.videoHeight;
        const MAX_DIM = 1280;
        if (width > MAX_DIM || height > MAX_DIM) {
           if (width > height) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
           } else {
              width *= MAX_DIM / height;
              height = MAX_DIM;
           }
        }

        canvasEl.width = width;
        canvasEl.height = height;
        ctx.drawImage(videoEl, 0, 0, width, height);

        // Frame captured. Offline CLI might not consume real-time frames anyway.
      }
    }, 1000 / FRAME_RATE);
  }

  private async uploadAndGetPath(file: File, fileType: string, mimeType: string): Promise<{ path: string, base64: string }> {
    const rawBase64 = await blobToBase64(file);
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        type: fileType,
        mimeType: mimeType,
        data: rawBase64
      })
    });
    if (!uploadResponse.ok) {
      throw new Error(`Upload server error: ${uploadResponse.statusText}`);
    }
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Failed to upload file to backend');
    }
    return { path: uploadResult.path, base64: rawBase64 };
  }

  private async handleAttachmentChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    this.updateStatus(`Uploading ${files.length} file(s)...`);

    try {
      const newAttachments = [];
      for (const file of files) {
        let fileType: 'image' | 'video' | 'file' = 'file';
        let mimeType = file.type;
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'application/x-zip-compressed') {
          if (ext === 'mp3') mimeType = 'audio/mpeg';
          else if (ext === 'wav') mimeType = 'audio/wav';
          else if (ext === 'ogg') mimeType = 'audio/ogg';
          else if (ext === 'mp4') mimeType = 'video/mp4';
          else if (ext === 'webm') mimeType = 'video/webm';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'pdf') mimeType = 'application/pdf';
          else if (ext === 'csv') mimeType = 'text/csv';
          else if (ext === 'txt' || ext === 'md') mimeType = 'text/plain';
          else if (ext === 'json') mimeType = 'application/json';
          else if (ext === 'html') mimeType = 'text/html';
          else if (ext === 'css') mimeType = 'text/css';
          else if (ext === 'js') mimeType = 'text/javascript';
          else if (ext === 'ts') mimeType = 'text/x-typescript';
          else if (ext === 'py') mimeType = 'text/x-python';
          else mimeType = 'application/octet-stream';
        }

        if (mimeType.startsWith('image/')) fileType = 'image';
        else if (mimeType.startsWith('video/')) fileType = 'video';

        if (file.size > 20 * 1024 * 1024) {
          throw new Error(`File '${file.name}' exceeds the 20MB limit.`);
        }
        
        const uploadResult = await this.uploadAndGetPath(file, fileType, mimeType);
        const fileUri = uploadResult.path;
        const rawBase64 = uploadResult.base64;
        
        let base64Data: string = rawBase64;
        if (fileType === 'image' || fileType === 'video') {
           base64Data = URL.createObjectURL(file);
        } else {
           base64Data = `data:${mimeType};base64,${rawBase64}`;
        }

        let extractedText = '';
        const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.csv', '.yaml', '.yml', '.ini', '.cfg', '.xml', '.sh', '.bat', '.sql'];
        const fileExt = ext ? '.' + ext : '';
        if (mimeType.startsWith('text/') || textExtensions.includes(fileExt)) {
          extractedText = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });
        }

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeStr = `${sizeInMB} MB`;

        newAttachments.push({
          data: base64Data,
          fileUri: fileUri,
          mimeType: mimeType,
          name: file.name,
          type: fileType,
          extractedText: extractedText,
          sizeStr: sizeStr
        });
      }

      this.attachedFiles = [...this.attachedFiles, ...newAttachments];
      this.updateStatus(`${files.length} file(s) attached securely.`);
    } catch (err) {
      console.error('Error reading file:', err);
      this.updateError(err instanceof Error ? err.message : 'Could not process file.');
      this.updateStatus('Upload error.');
    } finally {
      input.value = '';
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingFile = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingFile = false;
  }

  private async handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingFile = false;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    this.updateStatus(`Processing dropped file ${file.name}...`);
    try {
      let fileType: 'image' | 'video' | 'file' = 'file';
      let mimeType = file.type;
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'application/x-zip-compressed') {
        if (ext === 'mp3') mimeType = 'audio/mpeg';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'ogg') mimeType = 'audio/ogg';
        else if (ext === 'mp4') mimeType = 'video/mp4';
        else if (ext === 'webm') mimeType = 'video/webm';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'csv') mimeType = 'text/csv';
        else if (ext === 'txt' || ext === 'md') mimeType = 'text/plain';
        else if (ext === 'json') mimeType = 'application/json';
        else if (ext === 'html') mimeType = 'text/html';
        else if (ext === 'css') mimeType = 'text/css';
        else if (ext === 'js') mimeType = 'text/javascript';
        else if (ext === 'ts') mimeType = 'text/x-typescript';
        else if (ext === 'py') mimeType = 'text/x-python';
        else mimeType = 'application/octet-stream';
      }

      const supportedMimeTypes = new Set([
        'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
        'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
        'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp', 'video/quicktime',
        'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/x-javascript', 'text/x-typescript', 'application/x-typescript', 'text/csv', 'text/markdown', 'text/x-python', 'application/x-python-code', 'application/json', 'text/xml', 'application/rtf', 'text/rtf',
        'application/pdf'
      ]);

      if (mimeType.startsWith('text/') && !supportedMimeTypes.has(mimeType)) {
        mimeType = 'text/plain';
      }

      if (!supportedMimeTypes.has(mimeType)) {
        this.updateError(`Unsupported file type: ${ext ? '.' + ext : mimeType}.`);
        this.updateStatus('Ready');
        return;
      }

      if (mimeType.startsWith('image/')) fileType = 'image';
      else if (mimeType.startsWith('video/')) fileType = 'video';

      // Perform actual upload to Express server backend to save it locally in uploads/
      const isLargeFile = file.size > 20 * 1024 * 1024;
      if (isLargeFile) {
        throw new Error('File exceeds the 20MB inline size limit.');
      }
      
      const uploadResult = await this.uploadAndGetPath(file, fileType, mimeType);
      const fileUri = uploadResult.path;
      const rawBase64 = uploadResult.base64;
      
      let base64Data: string = rawBase64;
      // We can use object URL for UI preview efficiency for images/videos
      if (fileType === 'image' || fileType === 'video') {
         // Create local object URL for UI preview efficiency
         base64Data = URL.createObjectURL(file);
      } else {
         base64Data = `data:${mimeType};base64,${rawBase64}`;
      }

      let extractedText = '';
      let isTextLike = false;
      const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.csv', '.yaml', '.yml', '.ini', '.cfg', '.xml', '.sh', '.bat', '.sql'];
      const fileExt = '.' + ext;
      if (mimeType.startsWith('text/') || textExtensions.includes(fileExt)) {
        isTextLike = true;
      }
      
      if (isTextLike) {
        extractedText = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsText(file);
        });
      }

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = `${sizeInMB} MB`;

      this.attachedFile = {
        data: base64Data,
        fileUri: fileUri,
        mimeType: mimeType,
        name: file.name,
        type: fileType,
        extractedText: extractedText,
        sizeStr: sizeStr
      };

      this.updateStatus(`${file.name} attached via drag & drop.`);
    } catch (err) {
      console.error('Error processing drop file:', err);
      this.updateError(err instanceof Error ? err.message : 'Could not process dropped file.');
      this.updateStatus('Drop error.');
    }
  }

  private formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    
    const updateProgress = () => {
      if (this.ttsPlaybackState === 'playing' && !this.isSeeking) {
        const elapsed = this.outputAudioContext.currentTime - this.ttsStartedAt;
        if (elapsed >= this.ttsDuration) {
          this.ttsCurrentTime = this.ttsDuration;
          this.stopProgressTimer();
          this.requestUpdate();
          return;
        } else {
          this.ttsCurrentTime = elapsed;
          this.requestUpdate();
        }
      }
      this.ttsProgressAnimationId = requestAnimationFrame(updateProgress);
    };
    
    this.ttsProgressAnimationId = requestAnimationFrame(updateProgress);
  }

  private stopProgressTimer() {
    if (this.ttsProgressAnimationId) {
      cancelAnimationFrame(this.ttsProgressAnimationId);
      this.ttsProgressAnimationId = null;
    }
    if (this.ttsProgressTimer) {
      clearInterval(this.ttsProgressTimer);
      this.ttsProgressTimer = null;
    }
  }

  private skipTTS(seconds: number) {
    if (!this.currentTTSBuffer) return;
    
    // Calculate current position
    let currentPos = 0;
    if (this.ttsPlaybackState === 'playing') {
      currentPos = this.outputAudioContext.currentTime - this.ttsStartedAt;
    } else if (this.ttsPlaybackState === 'paused') {
      currentPos = this.ttsPausedAt;
    }
    
    let targetPos = currentPos + seconds;
    if (targetPos < 0) targetPos = 0;
    if (targetPos > this.ttsDuration) targetPos = this.ttsDuration;
    
    if (this.ttsPlaybackState === 'playing') {
      if (this.currentTTSSource) {
        this.currentTTSSource.onended = null;
        try {
          this.currentTTSSource.stop();
        } catch (e) {}
        this.currentTTSSource.disconnect();
        this.currentTTSSource = null;
      }
      this.startTTSPlayback(targetPos);
    } else {
      this.ttsPausedAt = targetPos;
      this.ttsCurrentTime = targetPos;
    }
  }

  private seekTTS(targetPos: number) {
    if (!this.currentTTSBuffer) return;
    if (targetPos < 0) targetPos = 0;
    if (targetPos > this.ttsDuration) targetPos = this.ttsDuration;
    
    if (this.ttsPlaybackState === 'playing') {
      if (this.currentTTSSource) {
        this.currentTTSSource.onended = null;
        try {
          this.currentTTSSource.stop();
        } catch (e) {}
        this.currentTTSSource.disconnect();
        this.currentTTSSource = null;
      }
      this.startTTSPlayback(targetPos);
    } else {
      this.ttsPausedAt = targetPos;
      this.ttsCurrentTime = targetPos;
    }
  }

  private async playTTS(text: string, index: number, voiceName?: string) {
    if (this.playingTTSIndex === index) {
      if (this.ttsPlaybackState === 'playing') {
        this.pauseTTS();
      } else if (this.ttsPlaybackState === 'paused') {
        this.resumeTTS();
      } else if (this.ttsPlaybackState === 'stopped') {
        this.resumeTTS();
      }
      return;
    }

    // Stop any currently playing TTS completely
    this.stopTTS(true);

    this.playingTTSIndex = index;
    this.ttsPlaybackState = 'playing';

    // Pause recording if active
    if (this.isRecording) {
      if (this.isContinuousActive) {
        this.stopRecording(true);
      } else {
        this.stopRecording(false);
      }
    }
    this.recognitionPausedByTTS = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    const cleanText = sanitizeTextForTTS(text);
    const lowCleanText = cleanText.toLowerCase();
    if (!cleanText || 
        cleanText.includes('[META]') ||
        lowCleanText.includes('lumin meta') || 
        lowCleanText.includes('command manager') || 
        lowCleanText.includes('command manger') || 
        lowCleanText.includes('help / ?') ||
        lowCleanText.includes('active locked model') ||
        lowCleanText.includes('supported voices')) {
      this.stopTTS(true);
      return;
    }

    try {
      if (this.offlineMode) {
        // Fallback to offline native TTS
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => {
          if (this.playingTTSIndex === index) {
            this.stopTTS(true);
          }
        };
        window.speechSynthesis.speak(utterance);
        return;
      }
      
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice: voiceName || this.piperVoice })
      });
      if (!ttsRes.ok) throw new Error(await ttsRes.text());
      const arrayBuffer = await ttsRes.arrayBuffer();
      const audioBuffer = await this.outputAudioContext.decodeAudioData(arrayBuffer);
      
      if (this.playingTTSIndex === index) {
        this.currentTTSBuffer = audioBuffer;
        this.ttsDuration = audioBuffer.duration;
        this.startTTSPlayback(0);
      }
    } catch (err) {
      console.warn('Local TTS failed or unavailable, falling back to native browser SpeechSynthesis:', err);
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => {
          if (this.playingTTSIndex === index) {
            this.stopTTS(true);
          }
        };
        window.speechSynthesis.speak(utterance);
      } catch (speechErr) {
        console.error('Browser SpeechSynthesis also failed:', speechErr);
        if (this.playingTTSIndex === index) {
          this.stopTTS(true);
        }
      }
    }
  }

  private startTTSPlayback(offset: number) {
    if (!this.currentTTSBuffer) return;

    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume().catch(() => {});
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = this.currentTTSBuffer;
    source.connect(this.outputNode);
    
    source.onended = () => {
      if (this.ttsPlaybackState === 'playing') {
        this.stopTTS(false); // keep controls visible and buffer available
      }
    };

    this.currentTTSSource = source;
    this.ttsStartedAt = this.outputAudioContext.currentTime - offset;
    this.ttsCurrentTime = offset;
    try {
      source.start(0, offset);
    } catch (e) {
      console.error('Error starting source playback:', e);
    }
    this.ttsPlaybackState = 'playing';
    this.startProgressTimer();
  }

  private pauseTTS() {
    if (this.offlineMode) {
      window.speechSynthesis.pause();
      this.ttsPlaybackState = 'paused';
      if (this.isContinuousActive) {
        this.startRecording();
      }
      return;
    }
    if (this.ttsPlaybackState === 'playing' && this.currentTTSSource) {
      this.currentTTSSource.onended = null;
      try {
        this.currentTTSSource.stop();
      } catch (e) {}
      this.currentTTSSource.disconnect();
      this.currentTTSSource = null;
      this.ttsPausedAt = this.outputAudioContext.currentTime - this.ttsStartedAt;
      this.ttsPlaybackState = 'paused';
      this.stopProgressTimer();
      if (this.isContinuousActive) {
        this.stopTTS(true);
      }
    }
  }

  private resumeTTS() {
    if (this.offlineMode) {
      window.speechSynthesis.resume();
      this.ttsPlaybackState = 'playing';
      return;
    }
    if (this.ttsPlaybackState === 'paused' && this.currentTTSBuffer) {
      this.startTTSPlayback(this.ttsPausedAt);
    } else if (this.ttsPlaybackState === 'stopped' && this.currentTTSBuffer) {
      this.startTTSPlayback(0);
    }
  }

  private restartTTS() {
    if (this.offlineMode) {
      window.speechSynthesis.resume();
      this.ttsPlaybackState = 'playing';
      return;
    }
    if (this.currentTTSBuffer) {
      if (this.currentTTSSource) {
        this.currentTTSSource.onended = null;
        try {
          this.currentTTSSource.stop();
        } catch (e) {}
         this.currentTTSSource.disconnect();
         this.currentTTSSource = null;
      }
      this.startTTSPlayback(0);
    }
  }

  private stopTTS(clearAll: boolean = false) {
    this.lastTTSFinishedTime = Date.now();
    if (this.offlineMode) {
      window.speechSynthesis.cancel();
      this.playingTTSIndex = null;
      this.ttsPlaybackState = 'stopped';
      if (this.isContinuousActive) {
        this.startRecording();
      } else {
        this.micPausedByTTS = false;
        this.stopEverythingAndGoToIdle();
      }
      return;
    }
    
    this.stopProgressTimer();

    if (this.currentTTSSource) {
      this.currentTTSSource.onended = null;
      try {
        this.currentTTSSource.stop();
      } catch (e) {}
      this.currentTTSSource.disconnect();
      this.currentTTSSource = null;
    }

    this.ttsPlaybackState = 'stopped';
    this.ttsPausedAt = 0;
    this.ttsCurrentTime = 0;

    if (clearAll) {
      this.currentTTSBuffer = null;
      this.playingTTSIndex = null;
      this.ttsDuration = 0;
    }
    
    // Resume recording if paused for TTS
    this.recognitionPausedByTTS = false;
    if (this.recognition && !this.isRecognitionActive) {
      try {
        this.recognition.start();
      } catch (e) {}
    }

    if (this.isContinuousActive) {
      this.startRecording();
    } else {
      this.micPausedByTTS = false;
      this.stopEverythingAndGoToIdle();
    }
  }

  private handleVoiceCommand(text: string): boolean {
    const t = text.toLowerCase().replace(/[^a-z0-9\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
    let matched = false;

    // To prevent random background audio (YouTube/games) from triggering commands,
    // we require either a direct address ("visualizer", "computer") or an explicit action phrase.
    const explicitIntentRegex = /\b(theme|shape|particle|visualizer|computer|hey visualizer|make|set|change|turn|switch|give me|show|hide|bring|i want|can you|could you|please|particles|color|just|only|next)\b/;
    if (!explicitIntentRegex.test(t)) {
        return false;
    }

    const isOn = (str: string) => /\b(turn on|enable|show|start|activate|bring back|bring them back)\b/.test(str);
    const isOff = (str: string) => /\b(turn off|disable|hide|stop|deactivate|no)\b/.test(str);

    const numWordToDigit: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    };
    
    const getNumberSuffix = (prefixStr: string): number | null => {
        const regex = new RegExp(`\\b${prefixStr}\\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|[0-9]+)\\b`);
        const m = t.match(regex);
        if (!m) return null;
        const val = m[1];
        if (numWordToDigit[val]) return numWordToDigit[val];
        const n = parseInt(val, 10);
        return isNaN(n) ? null : n;
    };

    // Theme Colors
    const themeKeys = Object.keys(THEMES);
    const themeNum = getNumberSuffix('(?:theme|color)');
    if (themeNum !== null && themeNum >= 1 && themeNum <= themeKeys.length) {
        this.activeTheme = themeKeys[themeNum - 1] as any;
        matched = true;
    } else if (/\b(next theme|next color)\b/.test(t)) {
        const idx = themeKeys.indexOf(this.activeTheme);
        this.activeTheme = themeKeys[(idx + 1) % themeKeys.length] as any;
        matched = true;
    } else {
        const themeMap: Record<string, string> = {
            'cyberware': 'cyberware',
            'crimson rogue': 'crimson',
            'crimson': 'crimson',
            'red': 'crimson',
            'matrix': 'matrix',
            'emerald matrix': 'matrix',
            'emerald': 'matrix',
            'green': 'matrix',
            'solar flare': 'solar',
            'solar': 'solar',
            'orange': 'solar',
            'arcane violet': 'arcane',
            'arcane': 'arcane',
            'purple': 'arcane',
            'glacial ice': 'glacial',
            'glacial': 'glacial',
            'ice': 'glacial',
            'golden age': 'golden',
            'golden': 'golden',
            'gold': 'golden',
            'hot pink': 'hotpink',
            'pink': 'hotpink',
            'hotpink': 'hotpink',
            'aquamarine': 'aqua',
            'aqua': 'aqua',
            'blue': 'aqua',
            'tungsten': 'tungsten',
            'grey': 'tungsten',
            'gray': 'tungsten',
            'white': 'tungsten'
        };

        if (/\b(theme|color|background|look like|make it)\b/.test(t)) {
            for (const [key, val] of Object.entries(themeMap)) {
                // Need a word boundary check to avoid matching "green" inside "greenhouse"
                const regex = new RegExp(`\\b${key}\\b`);
                if (regex.test(t)) {
                    // To avoid random color words, require an intent if they just say a color
                    const colorIntent = /\b(make|set|change|switch|theme|color|background|to)\b/;
                    if (colorIntent.test(t) || t.includes('theme') || t.includes('color')) {
                        this.activeTheme = val as any;
                        matched = true;
                        break;
                    }
                }
            }
        }
    }

    // Particle Track Shape
    const partShapes = ['saturn', 'sphere', 'triangle', 'flowerOfLife', 'vesicaPiscis', 'spiral', 'lissajous', 'trefoil', 'cinquefoil', 'heart', 'butterfly', 'infinity', 'galaxy', 'star', 'rose', 'hypocycloid', 'atom', 'torus', 'helix'];
    const partShapeNum = getNumberSuffix('(?:particle|particles) (?:shape|look like|set to|pattern|type|number)');
    if (partShapeNum !== null && partShapeNum >= 1 && partShapeNum <= partShapes.length) {
        this.particleShape = partShapes[partShapeNum - 1];
        matched = true;
    } else if (/\b(next particle shape)\b/.test(t)) {
        const idx = partShapes.indexOf(this.particleShape);
        this.particleShape = partShapes[(idx + 1) % partShapes.length];
        matched = true;
    } else if (/\b(particle|particles|dots|specks)\b/.test(t) || (!matched && !/\b(visualizer|main)\b/.test(t) && /\b(shape|look like|set|make|switch|turn|give me)\b/.test(t))) {
        if (/\b(saturn|rings)\b/.test(t)) { this.particleShape = 'saturn'; matched = true; }
        else if (/\b(sphere|spheres|ball|balls|globe|round)\b/.test(t)) { this.particleShape = 'sphere'; matched = true; }
        else if (/\b(triangle|triangles)\b/.test(t)) { this.particleShape = 'triangle'; matched = true; }
        else if (/\b(flower|flower of life|flowers)\b/.test(t)) { this.particleShape = 'flowerOfLife'; matched = true; }
        else if (/\b(vesica|piscis|eye)\b/.test(t)) { this.particleShape = 'vesicaPiscis'; matched = true; }
        else if (/\b(spiral|spirals|fractal)\b/.test(t)) { this.particleShape = 'spiral'; matched = true; }
        else if (/\b(infinity|figure 8|eight|figure eight)\b/.test(t)) { this.particleShape = 'infinity'; matched = true; }
        else if (/\b(torus|donut|donuts)\b/.test(t)) { this.particleShape = 'torus'; matched = true; }
        else if (/\b(helix|dna|double helix)\b/.test(t)) { this.particleShape = 'helix'; matched = true; }
        else if (/\b(lissajous)\b/.test(t)) { this.particleShape = 'lissajous'; matched = true; }
        else if (/\b(trefoil|knot)\b/.test(t)) { this.particleShape = 'trefoil'; matched = true; }
        else if (/\b(cinquefoil)\b/.test(t)) { this.particleShape = 'cinquefoil'; matched = true; }
        else if (/\b(heart|hearts)\b/.test(t)) { this.particleShape = 'heart'; matched = true; }
        else if (/\b(butterfly|butterflies)\b/.test(t)) { this.particleShape = 'butterfly'; matched = true; }
        else if (/\b(galaxy|space)\b/.test(t)) { this.particleShape = 'galaxy'; matched = true; }
        else if (/\b(star|stars)\b/.test(t)) { this.particleShape = 'star'; matched = true; }
        else if (/\b(rose|roses)\b/.test(t)) { this.particleShape = 'rose'; matched = true; }
        else if (/\b(hypocycloid)\b/.test(t)) { this.particleShape = 'hypocycloid'; matched = true; }
        else if (/\b(atom|atoms|nucleus)\b/.test(t)) { this.particleShape = 'atom'; matched = true; }
    }

    // Main Visualizer Shape
    const visShapes = ['sphere', 'cube', 'pyramid'];
    const visShapeNum = getNumberSuffix('(?:visualizer|main|center) (?:shape|pattern|type|number)');
    if (visShapeNum !== null && visShapeNum >= 1 && visShapeNum <= visShapes.length) {
        this.visualizerShape = visShapes[visShapeNum - 1];
        matched = true;
    } else if (/\b(next visualizer shape|next shape)\b/.test(t)) {
        const idx = visShapes.indexOf(this.visualizerShape);
        this.visualizerShape = visShapes[(idx + 1) % visShapes.length];
        matched = true;
    } else if (/\b(visualizer|main shape|middle|center)\b/.test(t) || (!matched && /\b(shape|set|make|switch|turn|give me)\b/.test(t))) {
        if (/\b(sphere|spheres|ball|balls|globe|round)\b/.test(t)) { this.visualizerShape = 'sphere'; matched = true; }
        else if (/\b(cube|cubes|square|squares|box|boxes)\b/.test(t)) { this.visualizerShape = 'cube'; matched = true; }
        else if (/\b(pyramid|pyramids|triangle|triangles)\b/.test(t)) { this.visualizerShape = 'pyramid'; matched = true; }
    }

    // Post-processing
    if (/\b(afterimage|after image|trails|echo)\b/.test(t)) {
        if (isOn(t) || /\b(make|with)\b/.test(t)) this.afterimageEnabled = true;
        if (isOff(t) || /\b(without)\b/.test(t)) this.afterimageEnabled = false;
        matched = true;
    }
    if (/\b(aberration|chromatic|glitch|rgb split)\b/.test(t)) {
        if (isOn(t) || /\b(make|with)\b/.test(t)) this.chromaticAberrationEnabled = true;
        if (isOff(t) || /\b(without)\b/.test(t)) this.chromaticAberrationEnabled = false;
        matched = true;
    }
    if (/\b(morph|morphing|wobble|distortion)\b/.test(t)) {
        if (isOn(t) || /\b(make|with)\b/.test(t)) this.morphingEnabled = true;
        if (isOff(t) || /\b(without)\b/.test(t)) this.morphingEnabled = false;
        matched = true;
    }
    if (/\b(grain|film|noise)\b/.test(t)) {
        if (isOn(t) || /\b(make|with)\b/.test(t)) this.filmGrainEnabled = true;
        if (isOff(t) || /\b(without)\b/.test(t)) this.filmGrainEnabled = false;
        matched = true;
    }
    if (/\b(master effect|post processing|effects|filters)\b/.test(t)) {
        if (isOn(t)) this.masterEffectsEnabled = true;
        if (isOff(t)) this.masterEffectsEnabled = false;
        matched = true;
    }

    // Visibility
    if (/\b(visualizer|main shape|middle|center)\b/.test(t) && (isOff(t) || isOn(t))) {
        if (isOff(t)) { this.showMainVisualizer = false; matched = true; }
        if (isOn(t) || /\b(bring back)\b/.test(t)) { this.showMainVisualizer = true; matched = true; }
    } else if (/\b(visualizer|main|middle|center shape)\b/.test(t) && isOff(t)) {
        this.showMainVisualizer = false; matched = true;
    } else if (/\b(visualizer|main|middle|center shape)\b/.test(t) && isOn(t)) {
        this.showMainVisualizer = true; matched = true;
    }
    
    if (/\b(particle|particles|dots)\b/.test(t)) { 
        if (isOff(t)) this.showParticles = false;
        if (isOn(t) || /\b(bring back|bring them back)\b/.test(t)) this.showParticles = true;
        matched = true;
    }
    if (/\b(back on|everything on|turn them back|bring them back|bring it back)\b/.test(t)) {
        this.showMainVisualizer = true;
        this.showParticles = true;
        matched = true;
    }

    return matched;
  }

  private async handleSendMessage() {
    if (this.voiceSubmitTimer) {
      clearTimeout(this.voiceSubmitTimer);
      this.voiceSubmitTimer = null;
    }

    // Ensure terminal is active for processing messages
    if (!this.isTerminalEnabled) {
      this.isTerminalEnabled = true;
    }
    if (!this.isTerminalOpen) {
      this.isTerminalOpen = true;
    }

    if (this.isScreenSharingEnabled && this.canvasRef.value && !this.attachedFile) {
      const dataUrl = this.canvasRef.value.toDataURL('image/jpeg', 0.6);
      if (dataUrl && dataUrl.length > 20) {
        this.attachedFile = {
          name: 'screenshare.jpg',
          type: 'image',
          mimeType: 'image/jpeg',
          data: dataUrl.split(',')[1] || ''
        };
        if (!this.chatInputText.trim()) {
          this.chatInputText = "What's on my screen right now?";
        }
      }
    }

    if (!this.isContinuousActive) {
      this.stopRecording(false);
    }

    if (
      (!this.chatInputText.trim() && this.attachedFiles.length === 0) ||
      this.isGeneratingResponse
    ) {
      return;
    }

    const currentAttachments = [...this.attachedFiles];
    const userMessage: TranscriptionEntry = {
      speaker: 'user',
      text: this.chatInputText,
      fileName: currentAttachments.length > 0 ? currentAttachments.map(a => a.name).join(', ') : undefined,
    };

    if (currentAttachments.length > 0) {
      const firstAtt = currentAttachments[0];
      const dataUrl = firstAtt.data?.startsWith('blob:')
        ? firstAtt.data
        : `data:${firstAtt.mimeType};base64,${firstAtt.data}`;
      if (firstAtt.type === 'image') {
        userMessage.imageUrl = dataUrl;
      } else if (firstAtt.type === 'video') {
        userMessage.videoUrl = dataUrl;
      } else {
        userMessage.fileUrl = dataUrl;
      }
    }

    this.transcriptionHistory = [...this.transcriptionHistory, userMessage];

    const prompt = this.chatInputText;
    this.chatInputText = '';
    this.attachedFiles = [];
    this.isGeneratingResponse = true;

    let promptToSend = prompt;
    if (currentAttachments.length > 0) {
      const attachmentsPayload = currentAttachments.map(f => ({
        path: f.fileUri,
        name: f.name,
        mimeType: f.mimeType,
        type: f.type
      }));

      promptToSend = JSON.stringify({
        text: prompt,
        attachments: attachmentsPayload,
        attachment: attachmentsPayload[0]
      });
    }

    try {
      this.startResponseTimer();
      this.transcriptionHistory = [
        ...this.transcriptionHistory,
        { speaker: 'ai', text: '', isLoading: true },
      ];

      if (!this.isAgentRunning) {
        if (!this.isStartingAgent) {
          console.log('[Auto-Launch] Launching LUMIN Agent process...');
          this.startAgent();
        }
        let attempts = 0;
        while (attempts < 30 && !this.isAgentRunning) {
          await new Promise(r => setTimeout(r, 250));
          attempts++;
        }
      }

      if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
        this.wsTerminal.send(JSON.stringify({ type: 'input', data: promptToSend }));
      } else {
        console.warn('Terminal WS not connected. Re-initializing connection...');
        this.initTerminalWebSocket(true);
        let wsAttempts = 0;
        while (wsAttempts < 15 && (!this.wsTerminal || this.wsTerminal.readyState !== WebSocket.OPEN)) {
          await new Promise(r => setTimeout(r, 200));
          wsAttempts++;
        }
        if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
          this.wsTerminal.send(JSON.stringify({ type: 'input', data: promptToSend }));
        } else {
          throw new Error('Could not establish WebSocket connection to the LUMIN Agent. Please check the Agent Terminal.');
        }
      }
    } catch (err: any) {
      console.error('Text sending failed:', err);
      this.stopResponseTimer();
      this.transcriptionHistory = this.transcriptionHistory.filter(msg => !msg.isLoading);
      this.transcriptionHistory = [
        ...this.transcriptionHistory,
        {
          speaker: 'ai',
          text: `**System Error**: ${err.message || 'Call failed'}.`,
          voiceName: this.piperVoice,
        },
      ];
    } finally {
      this.isGeneratingResponse = false;
    }
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    this.isSwitchingVoice = false;
    if (this.isContinuousActive) {
      this.stopRecording(true); // pause mic so it doesn't loop via monitor
    } else {
      this.stopRecording(false);
    }
    this.recognitionPausedByTTS = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.outputAudioContext.state === 'suspended') {
      this.outputAudioContext.resume();
    }
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputNode); // Goes to effects and visualizer
    source.start();
    this.sources.add(source);
    this.ttsPlaybackState = 'playing';

    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) {
         this.ttsPlaybackState = 'stopped';
         this.recognitionPausedByTTS = false;
         if (this.recognition && !this.isRecognitionActive) {
           try {
             this.recognition.start();
           } catch (e) {}
         }
         if (this.isContinuousActive) {
             this.startRecording();
         } else {
             this.micPausedByTTS = false;
             this.stopEverythingAndGoToIdle();
         }
      }
    };
  }

  private renderSettingsNav() {
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'GENERAL', label: 'General' },
      { id: 'MCP', label: 'MCP Protocol' },
      { id: 'POST_PROCESSING', label: 'Post-Processing' },
      { id: 'GLOW_EFFECTS', label: 'Glow Effects' },
      { id: 'GEOMETRY', label: 'Geometry' },
      { id: 'ENVIRONMENT', label: 'Environment' },
      { id: 'THEMES', label: 'Themes' },
      { id: 'VOICE_COMMANDS', label: 'Voice Commands' },
    ];
    return html`
      <div class="settings-nav">
        <h2>Settings</h2>
        <ul>
          ${tabs.map(
            (tab) => html`
              <li>
                <button
                  type="button"
                  class=${this.activeSettingsTab === tab.id ? 'active' : ''}
                  @click=${() => {
                    this.activeSettingsTab = tab.id as any;
                  }}>
                  ${tab.label}
                </button>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  private renderSettingsContent() {
    return html`
      <div class="settings-content" style="padding-bottom: 0;">
        <div style="display: flex; flex-direction: column; min-height: 100%;">
          <div style="flex: 1; padding-bottom: 32px;">
            ${this.activeSettingsTab === 'GENERAL'
            ? html`
                <h3>General Settings</h3>
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <h4 style="margin: 0 0 12px 0; color: #ffaa00; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <circle cx="12" cy="12" r="7"></circle>
                    </svg>
                    Interactive Camera & Visualizer Controls
                  </h4>
                  <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 0.9em; line-height: 1.6;">
                    <li style="margin-bottom: 4px;"><strong>Look Around:</strong> Left-click and drag anywhere on the visualizer to orbit the camera view.</li>
                    <li style="margin-bottom: 4px;"><strong>Zoom:</strong> Use your mouse scroll wheel to zoom in and out smoothly.</li>
                    <li><strong>Lock View:</strong> Right-click to permanently lock the camera in its current orientation and zoom. Right-click again to unlock and let the visualizer snap back to default. Locked positions save properly when exporting presets!</li>
                  </ul>
                </div>
                <div class="form-section">
                  <div class="form-grid">
                        <div class="form-field">
                          <label for="particle-size">Particle Size</label>
                          <span class="setting-desc">Adjust the size of the individual swarming particles.</span>
                          <div class="slider-container">
                            <input
                              id="particle-size"
                              type="range"
                              min="0.01"
                              max="0.2"
                              step="0.005"
                              .value=${String(this.particleSize)}
                              @input=${(e: Event) =>
                                (this.particleSize = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.particleSize.toFixed(3)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="visualizer-size">Visualizer Size</label>
                          <span class="setting-desc">Control the overall size of the main central 3D shape.</span>
                          <div class="slider-container">
                            <input
                              id="visualizer-size"
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.05"
                              .value=${String(this.visualizerSize)}
                              @input=${(e: Event) =>
                                (this.visualizerSize = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.visualizerSize.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="particle-speed">Particle Speed</label>
                          <span class="setting-desc">Change how fast the particles orbit and respond.</span>
                          <div class="slider-container">
                            <input
                              id="particle-speed"
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              .value=${String(this.particleSpeed)}
                              @input=${(e: Event) =>
                                (this.particleSpeed = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.particleSpeed.toFixed(1)}x</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="visualizer-speed">Visualizer Speed</label>
                          <span class="setting-desc">Adjust the speed of the shape's animations and rotations.</span>
                          <div class="slider-container">
                            <input
                              id="visualizer-speed"
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.1"
                              .value=${String(this.visualizerSpeed)}
                              @input=${(e: Event) =>
                                (this.visualizerSpeed = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.visualizerSpeed.toFixed(1)}x</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="global-scale">Global Scale</label>
                          <span class="setting-desc">Scale the entire 3D scene up or down.</span>
                          <div class="slider-container">
                            <input
                              id="global-scale"
                              type="range"
                              min="0.8"
                              max="3.0"
                              step="0.05"
                              .value=${String(this.globalScale)}
                              @input=${(e: Event) =>
                                (this.globalScale = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.globalScale.toFixed(2)}x</span>
                          </div>
                        </div>
                        <div class="form-field form-field-toggle">
                          <label for="enable-microphone-toggle">Enable Microphone</label>
                          <input
                            id="enable-microphone-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.enableMicrophone}
                            @change=${(e: Event) => {
                              this.enableMicrophone = (e.target as HTMLInputElement).checked;
                              if (this.enableMicrophone) {
                                this.updateAudioDevicesList();
                              }
                            }} />
                        </div>
                        ${this.enableMicrophone
                          ? html`
                              <div class="form-field" style="margin-left: 12px; border-left: 2px solid var(--glow-color-faded, rgba(0, 170, 255, 0.5)); padding-left: 12px;">
                                <label for="mic-audio-device">Microphone Input Device</label>
                                <span class="setting-desc">Select which physical microphone device to capture.</span>
                                <select
                                  id="mic-audio-device"
                                  style="background: #111; color: #fff; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); padding: 8px; border-radius: 4px; width: 100%; margin-top: 4px;"
                                  .value=${this.selectedMicAudioDeviceId}
                                  @change=${(e: Event) => {
                                    this.selectedMicAudioDeviceId = (e.target as HTMLSelectElement).value;
                                  }}>
                                  <option value="">Default (System Default)</option>
                                  ${this.audioDevices.map(
                                    (device) => html`
                                      <option value=${device.deviceId} ?selected=${this.selectedMicAudioDeviceId === device.deviceId}>
                                        ${device.label || `Microphone Input (${device.deviceId.slice(0, 5)}...)`}
                                      </option>
                                    `,
                                  )}
                                </select>
                              </div>
                            `
                          : ''}
                        <div class="form-field form-field-toggle">
                          <label for="enable-desktop-audio-toggle">Enable Desktop Audio</label>
                          <input
                            id="enable-desktop-audio-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.enableDesktopAudio}
                            @change=${(e: Event) => {
                              this.enableDesktopAudio = (e.target as HTMLInputElement).checked;
                              if (this.enableDesktopAudio) {
                                this.updateAudioDevicesList();
                              }
                            }} />
                        </div>
                        ${this.enableDesktopAudio
                          ? html`
                              <div class="form-field" style="margin-left: 12px; border-left: 2px solid var(--glow-color-faded, rgba(0, 170, 255, 0.5)); padding-left: 12px;">
                                <label for="desktop-audio-device">Desktop / System Audio Device</label>
                                <span class="setting-desc">Choose direct physical audio input/loopback, or select standard browser screen sharing.</span>
                                <select
                                  id="desktop-audio-device"
                                  style="background: #111; color: #fff; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); padding: 8px; border-radius: 4px; width: 100%; margin-top: 4px;"
                                  .value=${this.selectedDesktopAudioDeviceId}
                                  @change=${(e: Event) => {
                                    this.selectedDesktopAudioDeviceId = (e.target as HTMLSelectElement).value;
                                  }}>
                                  <option value="screen-share" ?selected=${this.selectedDesktopAudioDeviceId === 'screen-share' || !this.selectedDesktopAudioDeviceId}>
                                    Default (Browser Screen/Window Share Audio)
                                  </option>
                                  ${this.audioDevices.map(
                                    (device) => html`
                                      <option value=${device.deviceId} ?selected=${this.selectedDesktopAudioDeviceId === device.deviceId}>
                                        ${device.label || `Audio Capture Device (${device.deviceId.slice(0, 5)}...)`}
                                      </option>
                                    `,
                                  )}
                                </select>
                              </div>
                            `
                          : ''}
                        <div class="form-field form-field-toggle">
                          <label for="show-visualizer-toggle">Show Main Visualizer</label>
                          <input
                            id="show-visualizer-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.showMainVisualizer}
                            @change=${(e: Event) =>
                              (this.showMainVisualizer = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        <div class="form-field form-field-toggle">
                          <label for="show-particles-toggle">Show Particles</label>
                          <input
                            id="show-particles-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.showParticles}
                            @change=${(e: Event) =>
                              (this.showParticles = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        <div class="form-field form-field-toggle">
                          <label for="enable-terminal-toggle">Enable Agent Terminal</label>
                          <input
                            id="enable-terminal-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.isTerminalEnabled}
                            @change=${(e: Event) => {
                              const checked = (e.target as HTMLInputElement).checked;
                              this.isTerminalEnabled = checked;
                              if (!checked) {
                                this.isTerminalOpen = false;
                              } else {
                                this.isTerminalTabActive = true;
                                localStorage.setItem('project_lumin_terminal_tab_active', 'true');
                                this.initTerminalWebSocket();
                              }
                              localStorage.setItem('project_lumin_terminal_enabled', String(this.isTerminalEnabled));
                              this.triggerWindowResize();
                              this.requestUpdate();
                            }} />
                        </div>
                        ${this.isTerminalEnabled
                          ? html`
                              <div class="form-field" style="margin-left: 12px; border-left: 2px solid var(--glow-color-faded, rgba(0, 170, 255, 0.5)); padding-left: 12px;">
                                <label for="terminal-position-select">Agent Terminal Position</label>
                                <span class="setting-desc">Choose which side of the screen the Agent Terminal appears.</span>
                                <select
                                  id="terminal-position-select"
                                  style="background: #111; color: #fff; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); padding: 8px; border-radius: 4px; width: 100%; margin-top: 4px;"
                                  .value=${this.terminalPosition}
                                  @change=${(e: Event) => {
                                    this.terminalPosition = (e.target as HTMLSelectElement).value as any;
                                    localStorage.setItem('project_lumin_terminal_position', this.terminalPosition);
                                    this.triggerWindowResize();
                                    this.requestUpdate();
                                  }}>
                                  <option value="right">Right Side</option>
                                  <option value="left">Left Side</option>
                                  <option value="top">Top Side</option>
                                  <option value="bottom">Bottom Side</option>
                                </select>
                              </div>
                              <div class="form-field" style="margin-left: 12px; border-left: 2px solid var(--glow-color-faded, rgba(0, 170, 255, 0.5)); padding-left: 12px; margin-top: 16px;">
                                <label for="terminal-opacity-slider">Agent Terminal Transparency</label>
                                <span class="setting-desc">Adjust the background transparency level of the Agent Chat Interface.</span>
                                <div class="slider-container" style="margin-top: 8px;">
                                  <input
                                    id="terminal-opacity-slider"
                                    type="range"
                                    min="0.10"
                                    max="1.00"
                                    step="0.05"
                                    .value=${String(this.terminalOpacity)}
                                    @input=${(e: Event) => {
                                      this.terminalOpacity = parseFloat((e.target as HTMLInputElement).value);
                                      localStorage.setItem('project_lumin_terminal_opacity', String(this.terminalOpacity));
                                      this.requestUpdate();
                                    }} />
                                  <span>${Math.round((1 - this.terminalOpacity) * 100)}%</span>
                                </div>
                              </div>
                              <div class="form-field form-field-toggle" style="margin-left: 12px; border-left: 2px solid var(--glow-color-faded, rgba(0, 170, 255, 0.5)); padding-left: 12px; margin-top: 16px;">
                                <div style="display:flex; flex-direction:column; gap: 4px;">
                                  <label for="terminal-auto-open-hover-toggle">Auto-open Agent Terminal on hover</label>
                                  <span class="setting-desc">When enabled, hovering over the Agent Terminal tab will automatically slide it open. (Default = OFF)</span>
                                </div>
                                <input
                                  id="terminal-auto-open-hover-toggle"
                                  type="checkbox"
                                  role="switch"
                                  .checked=${this.isTerminalAutoOpenOnHover}
                                  @change=${(e: Event) => {
                                    this.isTerminalAutoOpenOnHover = (e.target as HTMLInputElement).checked;
                                    localStorage.setItem('project_lumin_terminal_auto_open_hover', String(this.isTerminalAutoOpenOnHover));
                                    this.requestUpdate();
                                  }} />
                              </div>
                            `
                          : ''}
                      </div>

                      <div class="form-section" style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <h4 style="margin: 0 0 12px 0;">Chat Profiles & Display Names</h4>
                        <p class="setting-desc" style="margin-bottom: 16px;">Customize display names and profile icons for User and LUMIN System messages.</p>
                        <div class="form-grid">
                          <div class="form-field">
                            <label for="user-display-name">User Display Name</label>
                            <span class="setting-desc">Name shown on your chat messages (default "You").</span>
                            <input
                              id="user-display-name"
                              type="text"
                              .value=${this.userName}
                              @input=${(e: Event) => {
                                this.userName = (e.target as HTMLInputElement).value || 'You';
                                localStorage.setItem('project_lumin_user_name', this.userName);
                                this.requestUpdate();
                              }}
                              placeholder="You" />
                          </div>

                          <div class="form-field">
                            <label for="system-display-name">System Display Name</label>
                            <span class="setting-desc">Name shown on LUMIN AI messages (default "LUMIN").</span>
                            <input
                              id="system-display-name"
                              type="text"
                              .value=${this.systemName}
                              @input=${(e: Event) => {
                                this.systemName = (e.target as HTMLInputElement).value || 'LUMIN';
                                localStorage.setItem('project_lumin_system_name', this.systemName);
                                this.requestUpdate();
                              }}
                              placeholder="LUMIN" />
                          </div>

                          <div class="form-field">
                            <label for="user-avatar-input">User Profile Picture / Icon</label>
                            <span class="setting-desc">Letter/emoji (e.g. "U", "👤") or upload a picture.</span>
                            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                              ${this.renderAvatarIcon('user')}
                              <input
                                id="user-avatar-input"
                                type="text"
                                style="flex: 1;"
                                .value=${this.userAvatar.startsWith('data:image/') ? '[Uploaded Picture]' : this.userAvatar}
                                @input=${(e: Event) => {
                                  const val = (e.target as HTMLInputElement).value;
                                  if (val) {
                                    this.userAvatar = val;
                                    localStorage.setItem('project_lumin_user_avatar', val);
                                    this.requestUpdate();
                                  }
                                }}
                                placeholder="U" />
                              <label
                                style="background: var(--bg-hover, rgba(255,255,255,0.1)); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; color: var(--text-primary);"
                                title="Upload Custom Picture"
                              >
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  style="display: none;"
                                  @change=${this.handleUserAvatarUpload}
                                />
                              </label>
                              ${this.userAvatar !== 'U' ? html`
                                <button
                                  type="button"
                                  style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;"
                                  @click=${() => {
                                    this.userAvatar = 'U';
                                    localStorage.setItem('project_lumin_user_avatar', 'U');
                                    this.requestUpdate();
                                  }}
                                  title="Reset to Default U"
                                >
                                  Reset
                                </button>
                              ` : ''}
                            </div>
                          </div>

                          <div class="form-field">
                            <label for="system-avatar-input">System Profile Picture / Icon</label>
                            <span class="setting-desc">Letter/emoji (e.g. "S", "🤖") or upload a picture.</span>
                            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                              ${this.renderAvatarIcon('ai')}
                              <input
                                id="system-avatar-input"
                                type="text"
                                style="flex: 1;"
                                .value=${this.systemAvatar.startsWith('data:image/') ? '[Uploaded Picture]' : this.systemAvatar}
                                @input=${(e: Event) => {
                                  const val = (e.target as HTMLInputElement).value;
                                  if (val) {
                                    this.systemAvatar = val;
                                    localStorage.setItem('project_lumin_system_avatar', val);
                                    this.requestUpdate();
                                  }
                                }}
                                placeholder="S" />
                              <label
                                style="background: var(--bg-hover, rgba(255,255,255,0.1)); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; color: var(--text-primary);"
                                title="Upload Custom Picture"
                              >
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  style="display: none;"
                                  @change=${this.handleSystemAvatarUpload}
                                />
                              </label>
                              ${this.systemAvatar !== 'S' ? html`
                                <button
                                  type="button"
                                  style="background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary); padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;"
                                  @click=${() => {
                                    this.systemAvatar = 'S';
                                    localStorage.setItem('project_lumin_system_avatar', 'S');
                                    this.requestUpdate();
                                  }}
                                  title="Reset to Default S"
                                >
                                  Reset
                                </button>
                              ` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
              `
            : ''}
            ${this.activeSettingsTab === 'MCP'
            ? html`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <div>
                    <h3 style="margin: 0 0 4px 0; padding: 0; border: none;">Model Context Protocol (MCP)</h3>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Dual-Role Node: Acts as both <strong>MCP Server</strong> (exposing LUMIN tools) and <strong>MCP Client</strong> (connecting to external AI tools & services).</span>
                  </div>
                  <span style="background: ${this.isMcpEnabled ? 'rgba(0, 170, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.isMcpEnabled ? 'rgba(0, 170, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; color: ${this.isMcpEnabled ? '#00aaff' : 'var(--text-secondary)'}; font-size: 0.75rem; font-family: monospace; font-weight: bold; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: ${this.isMcpEnabled ? '#00aaff' : 'gray'}; border-radius: 50%;"></span>
                    ${this.isMcpEnabled ? 'MCP DUAL-ROLE ACTIVE' : 'MCP DISABLED'}
                  </span>
                </div>

                <div class="form-section" style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 12px 0;">MCP Master Layer</h4>
                  <div class="form-grid">
                    <div class="form-field form-field-toggle">
                      <div style="display:flex; flex-direction:column; gap: 4px;">
                        <label for="enable-mcp-toggle">Enable Dual MCP Engine (Server + Client)</label>
                        <span class="setting-desc">Enables local JSON-RPC server and authorizes LUMIN to connect to external MCP servers (Runway, ElevenLabs, Google Services, custom APIs).</span>
                      </div>
                      <input
                        id="enable-mcp-toggle"
                        type="checkbox"
                        role="switch"
                        .checked=${this.isMcpEnabled}
                        @change=${(e: Event) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          this.isMcpEnabled = checked;
                          if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
                            this.wsTerminal.send(JSON.stringify({ type: 'input', data: checked ? 'enable mcp' : 'disable mcp' }));
                          }
                          this.requestUpdate();
                        }} />
                    </div>
                  </div>
                </div>

                <!-- EXTERNAL MCP CONNECTIONS (CLIENT ROLE) -->
                <div class="form-section" style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
                    🔌 External MCP Connections (Client Role)
                  </h4>
                  <p class="setting-desc" style="margin-bottom: 16px;">
                    Connect LUMIN to third-party MCP servers to expand its intelligence with external media generators, specialized databases, and cloud services.
                  </p>

                  <!-- Add External MCP Connection Form -->
                  <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; margin-bottom: 16px;">
                    <span style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 8px;">Add New External MCP Server</span>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <input
                        id="mcp-server-name-input"
                        type="text"
                        placeholder="Server Name (e.g. Runway Video, Custom DB)"
                        style="flex: 1; min-width: 180px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem;" />
                      <input
                        id="mcp-server-url-input"
                        type="text"
                        placeholder="Endpoint URL (e.g. http://localhost:8080/mcp)"
                        style="flex: 2; min-width: 220px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem;" />
                      <button
                        type="button"
                        style="background: var(--glow-color, #00aaff); color: #000; border: none; font-weight: bold; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; white-space: nowrap;"
                        @click=${() => {
                          const nameInput = this.shadowRoot?.querySelector('#mcp-server-name-input') as HTMLInputElement;
                          const urlInput = this.shadowRoot?.querySelector('#mcp-server-url-input') as HTMLInputElement;
                          const sName = nameInput?.value?.trim();
                          const sUrl = urlInput?.value?.trim();
                          if (sName && sUrl && this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
                            this.wsTerminal.send(JSON.stringify({ type: 'input', data: `connect mcp to ${sName} ${sUrl}` }));
                            if (nameInput) nameInput.value = '';
                            if (urlInput) urlInput.value = '';
                          }
                        }}>
                        + Connect MCP
                      </button>
                    </div>
                  </div>

                  <!-- Active Connections Grid -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 170, 255, 0.3); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <strong style="color: #00aaff; font-size: 0.9rem;">🎬 Runway Gen-3 Video MCP</strong>
                          <span style="font-size: 0.7rem; background: rgba(0, 200, 100, 0.2); color: #00e676; padding: 2px 6px; border-radius: 4px;">Connected</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">Generates cinematic 4K video clips, motion graphics, and video extensions.</p>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <span>Tools: generate_video, extend_video</span>
                        <button style="background: none; border: none; color: #ff5252; cursor: pointer; text-decoration: underline;" @click=${() => {
                          if (this.wsTerminal) this.wsTerminal.send(JSON.stringify({ type: 'input', data: 'disconnect mcp runway_video' }));
                        }}>Disconnect</button>
                      </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 170, 255, 0.3); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <strong style="color: #00aaff; font-size: 0.9rem;">🎙️ ElevenLabs Voice & Audio MCP</strong>
                          <span style="font-size: 0.7rem; background: rgba(0, 200, 100, 0.2); color: #00e676; padding: 2px 6px; border-radius: 4px;">Connected</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">Ultra-realistic speech synthesis, voice cloning, and audio sound effects.</p>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <span>Tools: synthesize_speech, generate_sfx</span>
                        <button style="background: none; border: none; color: #ff5252; cursor: pointer; text-decoration: underline;" @click=${() => {
                          if (this.wsTerminal) this.wsTerminal.send(JSON.stringify({ type: 'input', data: 'disconnect mcp elevenlabs_audio' }));
                        }}>Disconnect</button>
                      </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 170, 255, 0.3); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <strong style="color: #00aaff; font-size: 0.9rem;">📂 Google Workspace MCP</strong>
                          <span style="font-size: 0.7rem; background: rgba(0, 200, 100, 0.2); color: #00e676; padding: 2px 6px; border-radius: 4px;">Connected</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">Search Google Docs, Sheets, Drive files, and Gmail messages.</p>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <span>Tools: search_drive, create_sheet_row</span>
                        <button style="background: none; border: none; color: #ff5252; cursor: pointer; text-decoration: underline;" @click=${() => {
                          if (this.wsTerminal) this.wsTerminal.send(JSON.stringify({ type: 'input', data: 'disconnect mcp google_workspace' }));
                        }}>Disconnect</button>
                      </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 170, 255, 0.3); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <strong style="color: #00aaff; font-size: 0.9rem;">🗄️ SQLite Database MCP</strong>
                          <span style="font-size: 0.7rem; background: rgba(0, 200, 100, 0.2); color: #00e676; padding: 2px 6px; border-radius: 4px;">Connected</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 8px 0;">Relational query execution, schema inspection, and database management.</p>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <span>Tools: execute_query, describe_tables</span>
                        <button style="background: none; border: none; color: #ff5252; cursor: pointer; text-decoration: underline;" @click=${() => {
                          if (this.wsTerminal) this.wsTerminal.send(JSON.stringify({ type: 'input', data: 'disconnect mcp sqlite_database' }));
                        }}>Disconnect</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-section" style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 12px 0;">🎙️ Voice & Natural Language Control Examples</h4>
                  <p class="setting-desc" style="margin-bottom: 12px;">Say or type any of these commands to control LUMIN's dual MCP engine on the fly:</p>
                  <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                    <li><strong style="color: var(--text-primary);">Generate Video:</strong> "Use MCP to generate a video about cats on Runway"</li>
                    <li><strong style="color: var(--text-primary);">Synthesize Voice:</strong> "Use MCP on ElevenLabs to synthesize speech for this script"</li>
                    <li><strong style="color: var(--text-primary);">Search Cloud Workspace:</strong> "Use MCP to search my Google Drive for Q3 notes"</li>
                    <li><strong style="color: var(--text-primary);">Connect Service:</strong> "Connect MCP to http://localhost:8080/mcp" or "Connect MCP to Runway"</li>
                    <li><strong style="color: var(--text-primary);">List Services:</strong> "List MCP servers" or "MCP status"</li>
                  </ul>
                </div>

                <div class="form-section">
                  <h4 style="margin: 0 0 12px 0;">🛡️ Security & Protocol Specifications</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
                      <strong style="color: var(--glow-color); display: block; margin-bottom: 4px;">📡 Protocol Standard</strong>
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">Standard JSON-RPC 2.0 transport over HTTP/SSE, stdio subprocess, and web sockets.</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
                      <strong style="color: var(--glow-color); display: block; margin-bottom: 4px;">🔒 Safe & Opt-In</strong>
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">External connections are completely optional and run with strict argument size caps (5MB input / 2MB output).</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
                      <strong style="color: var(--glow-color); display: block; margin-bottom: 4px;">⚡ Dual Engine</strong>
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">Seamlessly exposes local workspace tools to external hosts while executing external tools inside LUMIN.</span>
                    </div>
                  </div>
                </div>
              `
            : ''}
            ${this.activeSettingsTab === 'POST_PROCESSING'
            ? html`
                <h3>Post-Processing Settings</h3>
                <div class="form-section">
                  <div class="form-grid">
                        <div class="form-field form-field-toggle">
                          <div style="display:flex; flex-direction:column; gap: 8px;">
                            <label for="morphing-toggle">Shape Morphing</label>
                            <span class="setting-desc">Distorts the 3D shapes to audio frequencies.</span>
                          </div>
                          <input
                            id="morphing-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.morphingEnabled}
                            @change=${(e: Event) =>
                              (this.morphingEnabled = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        ${this.morphingEnabled
                          ? html` <div class="form-field">
                              <label for="morphing-intensity">Morphing Intensity</label>
                              <div class="slider-container">
                                <input
                                  id="morphing-intensity"
                                  type="range"
                                  min="0.1"
                                  max="3.0"
                                  step="0.1"
                                  .value=${String(this.morphingIntensity)}
                                  @input=${(e: Event) =>
                                    (this.morphingIntensity = parseFloat(
                                      (e.target as HTMLInputElement).value,
                                    ))} />
                                <span>${this.morphingIntensity.toFixed(1)}x</span>
                              </div>
                            </div>`
                          : ''}
                        <div class="form-field form-field-toggle">
                          <div style="display:flex; flex-direction:column; gap: 8px;">
                            <label for="afterimage-toggle">Motion Blur</label>
                            <span class="setting-desc">Adds a cinematic smear of trailing motion.</span>
                          </div>
                          <input
                            id="afterimage-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.afterimageEnabled}
                            @change=${(e: Event) =>
                              (this.afterimageEnabled = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        ${this.afterimageEnabled
                          ? html` <div class="form-field">
                              <label for="afterimage-strength">Blur Strength</label>
                              <div class="slider-container">
                                <input
                                  id="afterimage-strength"
                                  type="range"
                                  min="0.5"
                                  max="0.98"
                                  step="0.01"
                                  .value=${String(this.afterimageStrength)}
                                  @input=${(e: Event) =>
                                    (this.afterimageStrength = parseFloat(
                                      (e.target as HTMLInputElement).value,
                                    ))} />
                                <span
                                  >${this.afterimageStrength.toFixed(2)}</span
                                >
                              </div>
                            </div>`
                          : ''}
                        <div class="form-field form-field-toggle">
                          <div style="display:flex; flex-direction:column; gap: 8px;">
                            <label for="chromatic-toggle"
                              >Chromatic Aberration</label
                            >
                            <span class="setting-desc">Separates RGB color channels for a glitchy, retro look.</span>
                          </div>
                          <input
                            id="chromatic-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.chromaticAberrationEnabled}
                            @change=${(e: Event) =>
                              (this.chromaticAberrationEnabled = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        ${this.chromaticAberrationEnabled
                          ? html` <div class="form-field">
                              <label for="chromatic-intensity"
                                >Aberration Intensity</label
                              >
                              <div class="slider-container">
                                <input
                                  id="chromatic-intensity"
                                  type="range"
                                  min="0.001"
                                  max="0.05"
                                  step="0.001"
                                  .value=${String(this.chromaticAberrationIntensity)}
                                  @input=${(e: Event) =>
                                    (this.chromaticAberrationIntensity = parseFloat(
                                      (e.target as HTMLInputElement).value,
                                    ))} />
                                <span
                                  >${this.chromaticAberrationIntensity.toFixed(
                                    3,
                                  )}</span
                                >
                              </div>
                            </div>`
                          : ''}
                        <div class="form-field form-field-toggle">
                          <div style="display:flex; flex-direction:column; gap: 8px;">
                            <label for="film-grain-toggle"
                              >Film Grain</label
                            >
                            <span class="setting-desc">Adds noise to the visualizer for an analog feel.</span>
                          </div>
                          <input
                            id="film-grain-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.filmGrainEnabled}
                            @change=${(e: Event) =>
                              (this.filmGrainEnabled = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        ${this.filmGrainEnabled
                          ? html` <div class="form-field">
                              <label for="film-grain-intensity"
                                >Grain Intensity</label
                              >
                              <div class="slider-container">
                                <input
                                  id="film-grain-intensity"
                                  type="range"
                                  min="0.05"
                                  max="1.0"
                                  step="0.05"
                                  .value=${String(this.filmGrainIntensity)}
                                  @input=${(e: Event) =>
                                    (this.filmGrainIntensity = parseFloat(
                                      (e.target as HTMLInputElement).value,
                                    ))} />
                                <span
                                  >${this.filmGrainIntensity.toFixed(
                                    2,
                                  )}</span
                                >
                              </div>
                            </div>`
                          : ''}
                      </div>
                    </div>
              `
            : ''}
            ${this.activeSettingsTab === 'GLOW_EFFECTS'
            ? html`
                <h3>Glow Effect Settings</h3>
                <div class="form-section">
                  <div class="form-grid">
                        <div class="form-field">
                          <label for="bloom-intensity">Intensity</label>
                          <span class="setting-desc">Focuses the brightness of the glowing elements. Higher values make the glow bolder.</span>
                          <div class="slider-container">
                            <input
                              id="bloom-intensity"
                              type="range"
                              min="0"
                              max="5"
                              step="0.1"
                              .value=${String(this.bloomIntensity)}
                              @input=${(e: Event) =>
                                (this.bloomIntensity = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.bloomIntensity.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="bloom-radius">Radius</label>
                          <span class="setting-desc">Adjusts how wide the glow expands outward from the shapes.</span>
                          <div class="slider-container">
                            <input
                              id="bloom-radius"
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              .value=${String(this.bloomRadius)}
                              @input=${(e: Event) =>
                                (this.bloomRadius = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.bloomRadius.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="bloom-threshold">Threshold</label>
                          <span class="setting-desc">Sets the cutoff point for what glows. Lower means more things will glow.</span>
                          <div class="slider-container">
                            <input
                              id="bloom-threshold"
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              .value=${String(this.bloomThreshold)}
                              @input=${(e: Event) =>
                                (this.bloomThreshold = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.bloomThreshold.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="glow-pulse-strength">Pulse Strength</label>
                          <span class="setting-desc">Determines how strongly the glow fades and flares with the beat.</span>
                          <div class="slider-container">
                            <input
                              id="glow-pulse-strength"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              .value=${String(this.glowPulseStrength)}
                              @input=${(e: Event) =>
                                (this.glowPulseStrength = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.glowPulseStrength.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
              `
            : ''}
            ${this.activeSettingsTab === 'GEOMETRY'
            ? html`
                <h3>Geometry Settings</h3>
                <div class="form-section">
                  <div class="form-grid">
                        <div class="form-field">
                          <label for="particle-shape">Particle Track Shape</label>
                          <select
                            id="particle-shape"
                            .value=${this.particleShape}
                            @change=${(e: Event) =>
                              (this.particleShape = (e.target as HTMLSelectElement).value as any)}>
                            <option value="saturn">Saturn Rings</option>
                            <option value="sphere">Sphere</option>
                            <option value="triangle">Triangle</option>
                            <option value="flowerOfLife">Flower of Life</option>
                            <option value="vesicaPiscis">Vesica Piscis</option>
                            <option value="spiral">Spiral</option>
                            <option value="lissajous">Lissajous</option>
                            <option value="trefoil">Trefoil Knot</option>
                            <option value="cinquefoil">Cinquefoil Knot</option>
                            <option value="heart">Heart</option>
                            <option value="butterfly">Butterfly</option>
                            <option value="infinity">Infinity</option>
                            <option value="galaxy">Galaxy</option>
                            <option value="star">Star</option>
                            <option value="rose">Rose</option>
                            <option value="hypocycloid">Hypocycloid</option>
                          </select>
                        </div>
                        <div class="form-field">
                          <label for="visualizer-shape">Main Visualizer Shape</label>
                          <select
                            id="visualizer-shape"
                            .value=${this.visualizerShape}
                            @change=${(e: Event) =>
                              (this.visualizerShape = (e.target as HTMLSelectElement).value as any)}>
                            <option value="sphere">Sphere</option>
                            <option value="cube">Square/Cube</option>
                            <option value="pyramid">Triangle/Pyramid</option>
                          </select>
                        </div>
                        <div class="form-field form-field-toggle">
                          <label for="rotation-locked">Lock View Rotation</label>
                          <input
                            id="rotation-locked"
                            type="checkbox"
                            role="switch"
                            .checked=${this.rotationLocked}
                            @change=${(e: Event) =>
                              (this.rotationLocked = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        <div class="form-field">
                          <label for="rotation-speed">Rotation Speed</label>
                          <span class="setting-desc">Controls how fast the camera spins around the main shape.</span>
                          <div class="slider-container">
                            <input
                              id="rotation-speed"
                              type="range"
                              min="0"
                              max="5"
                              step="0.1"
                              .value=${String(this.rotationSpeed)}
                              @input=${(e: Event) =>
                                (this.rotationSpeed = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.rotationSpeed.toFixed(1)}x</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="metalness">Moment of Inertia (Metalness)</label>
                          <span class="setting-desc">Adjusts the physical look to be more metallic or polished.</span>
                          <div class="slider-container">
                            <input
                              id="metalness"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              .value=${String(this.metalness)}
                              @input=${(e: Event) =>
                                (this.metalness = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.metalness.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="roughness">Roughness</label>
                          <span class="setting-desc">Adjusts how scattered or sharp the light reflections are on the surface.</span>
                          <div class="slider-container">
                            <input
                              id="roughness"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              .value=${String(this.roughness)}
                              @input=${(e: Event) =>
                                (this.roughness = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.roughness.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
              `
            : ''}
            ${this.activeSettingsTab === 'ENVIRONMENT'
            ? html`
                <h3>Environment Settings</h3>
                <div class="form-section">
                  <div class="form-grid">
                        <div class="form-field form-field-toggle">
                          <label for="auto-pan-toggle">Auto-Pan Camera</label>
                          <input
                            id="auto-pan-toggle"
                            type="checkbox"
                            role="switch"
                            .checked=${this.autoPanEnabled}
                            @change=${(e: Event) =>
                              (this.autoPanEnabled = (
                                e.target as HTMLInputElement
                              ).checked)} />
                        </div>
                        <div class="form-field">
                          <label for="auto-pan-speed">Auto-Pan Speed</label>
                          <div class="slider-container">
                            <input
                              id="auto-pan-speed"
                              type="range"
                              min="0"
                              max="5"
                              step="0.1"
                              .value=${String(this.autoPanSpeed)}
                              @input=${(e: Event) =>
                                (this.autoPanSpeed = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.autoPanSpeed.toFixed(1)}x</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="ambient-light-intensity">Ambient Light</label>
                          <div class="slider-container">
                            <input
                              id="ambient-light-intensity"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              .value=${String(this.ambientLightIntensity)}
                              @input=${(e: Event) =>
                                (this.ambientLightIntensity = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.ambientLightIntensity.toFixed(2)}</span>
                          </div>
                        </div>
                        <div class="form-field">
                          <label for="directional-light-intensity">Directional Light</label>
                          <div class="slider-container">
                            <input
                              id="directional-light-intensity"
                              type="range"
                              min="0"
                              max="3"
                              step="0.1"
                              .value=${String(this.directionalLightIntensity)}
                              @input=${(e: Event) =>
                                (this.directionalLightIntensity = parseFloat(
                                  (e.target as HTMLInputElement).value,
                                ))} />
                            <span>${this.directionalLightIntensity.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                  <p style="margin-top: 24px; margin-bottom: 0; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); line-height: 1.5; font-size: 0.9em;">
                    Adjust the physical environment around the visualizer. Auto-pan rotates the entire camera smoothly over time. Ambient lighting brightens the shadows softly, while directional lighting acts like a strong spotlight, making metallic or rough materials on the geometry more visible.
                  </p>
                    </div>
              `
            : ''}
          ${this.activeSettingsTab === 'THEMES'
            ? html`
                <h3>Color Themes</h3>
                <div class="theme-selector">
                  ${Object.entries(THEMES).map(
                    ([key, theme]) => html`
                      <button
                        type="button"
                        class="theme-option ${this.activeTheme === key
                          ? 'active'
                          : ''}"
                        @click=${() => {
                          this.activeTheme = key as keyof typeof THEMES;
                        }}>
                        <div
                          class="theme-preview"
                          style="background: ${theme[
                            '--glow-color'
                          ]};"></div>
                        <span class="theme-name">${theme.name}</span>
                      </button>
                    `,
                  )}
                  <div class="custom-theme-picker" style="margin-top: 16px;">
                    <div class="form-field form-field-toggle">
                      <label for="custom-theme-toggle" style="font-weight: 600;">Custom Theme</label>
                      <input
                        id="custom-theme-toggle"
                        type="checkbox"
                        role="switch"
                        .checked=${this.activeTheme === 'custom'}
                        @change=${(e: Event) =>
                          (this.activeTheme = (e.target as HTMLInputElement).checked ? 'custom' : 'cyberware')} />
                    </div>
                    ${this.activeTheme === 'custom' ? html`
                      <div class="form-field form-field-toggle" style="margin-top: 16px;">
                        <label for="separate-colors-toggle">Separate Particle Color</label>
                        <input
                          id="separate-colors-toggle"
                          type="checkbox"
                          role="switch"
                          .checked=${this.separateCustomColors}
                          @change=${(e: Event) =>
                            (this.separateCustomColors = (e.target as HTMLInputElement).checked)} />
                      </div>

                      ${this.separateCustomColors ? html`
                        <div class="form-grid" style="margin-top: 16px;">
                          <div class="form-field">
                            <label>Main Visualizer Color</label>
                            <input type="color" .value=${this.customMainColor} style="width: 100%; height: 48px; border: none; padding: 0; border-radius: 8px; cursor: pointer; background: transparent;" @input=${(e: Event) => {
                              this.customMainColor = (e.target as HTMLInputElement).value;
                            }} />
                          </div>
                          <div class="form-field">
                            <label>Particle Color</label>
                            <input type="color" .value=${this.customParticleColor} style="width: 100%; height: 48px; border: none; padding: 0; border-radius: 8px; cursor: pointer; background: transparent;" @input=${(e: Event) => {
                              this.customParticleColor = (e.target as HTMLInputElement).value;
                            }} />
                          </div>
                        </div>
                      ` : html`
                        <div class="custom-theme-colors" style="display: flex; gap: 8px; width: 100%; margin-top: 16px;">
                          ${this.customThemeColors.map((color, idx) => html`
                            <input type="color" .value=${color} style="flex: 1; min-width: 0; height: 48px; border: none; padding: 0; border-radius: 8px; cursor: pointer; background: transparent;" @input=${(e: Event) => {
                              const newColors = [...this.customThemeColors];
                              newColors[idx] = (e.target as HTMLInputElement).value;
                              this.customThemeColors = newColors;
                            }} />
                          `)}
                        </div>
                      `}
                      <div class="form-field" style="margin-top: 16px;">
                        <label for="theme-transition-speed">Color Transition Speed</label>
                        <div class="slider-container">
                          <input
                            id="theme-transition-speed"
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            .value=${String(this.themeTransitionSpeed)}
                            @input=${(e: Event) =>
                              (this.themeTransitionSpeed = parseFloat(
                                (e.target as HTMLInputElement).value,
                              ))} />
                          <span>${this.themeTransitionSpeed.toFixed(1)}x</span>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `
            : ''}
            ${this.activeSettingsTab === 'VOICE_COMMANDS'
            ? html`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                  <h3 style="margin: 0; padding: 0; border: none;">Voice Commands</h3>
                  <button type="button" @click=${this.downloadVoiceCommandsTxt} style="background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download .txt
                  </button>
                </div>
                
                <div class="form-section" style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 12px 0;">Voice Activation Hotwords</h4>
                  <div class="form-grid">
                    <div class="form-field">
                      <label for="activate-word">Activate Word</label>
                      <span class="setting-desc">Spoken phrase that wakes up the assistant (e.g. "hey lumin").</span>
                      <input
                        id="activate-word"
                        type="text"
                        .value=${this.activateWord}
                        @input=${(e: Event) =>
                          (this.activateWord = (
                            e.target as HTMLInputElement
                          ).value)} />
                    </div>
                    <div class="form-field">
                      <label for="sleep-word">Sleep Command Word</label>
                      <span class="setting-desc">Spoken phrase to put the assistant to sleep (e.g. "go to sleep").</span>
                      <input
                        id="sleep-word"
                        type="text"
                        .value=${this.sleepCommandWord}
                        @input=${(e: Event) =>
                          (this.sleepCommandWord = (
                            e.target as HTMLInputElement
                          ).value)} />
                    </div>
                    <div class="form-field form-field-toggle" style="grid-column: 1 / -1; margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="auto-launch-wake-toggle">Auto-launch agent after wake word</label>
                        <span class="setting-desc">When ON, saying a wake word ("hey lumin", "wake up") automatically launches the agent. When OFF (default), wake word only activates listening / 3D visualizer.</span>
                      </div>
                      <input
                        id="auto-launch-wake-toggle"
                        type="checkbox"
                        role="switch"
                        .checked=${this.isAutoLaunchOnWakeWord}
                        @change=${(e: Event) => this.handleAutoLaunchWakeToggle((e.target as HTMLInputElement).checked)} />
                    </div>
                    <div class="form-field form-field-toggle" style="grid-column: 1 / -1; margin-top: 8px;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="auto-stop-sleep-toggle">Auto-stop agent on sleep words</label>
                        <span class="setting-desc">When ON, saying wake word + sleep phrases ("goodbye agent", "talk to you later agent", "end session", "I'm done") automatically stops the agent. When OFF (default), sleep phrases do not stop the agent.</span>
                      </div>
                      <input
                        id="auto-stop-sleep-toggle"
                        type="checkbox"
                        role="switch"
                        .checked=${this.isAutoStopOnSleepWord}
                        @change=${(e: Event) => this.handleAutoStopSleepToggle((e.target as HTMLInputElement).checked)} />
                    </div>
                    <div class="form-field form-field-toggle" style="grid-column: 1 / -1; margin-top: 8px;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label for="auto-play-tts-toggle">Auto-Play Spoken Response Audio (Silent Agent Toggle)</label>
                        <span class="setting-desc">When <strong>OFF (default / Silent Mode)</strong>, the agent stays silent and only responds with text so it will never interrupt you while asking questions or working. You can listen to any message by clicking the speaker icon on its chat bubble. When <strong>ON</strong>, the agent automatically speaks its responses using TTS.</span>
                      </div>
                      <input
                        id="auto-play-tts-toggle"
                        type="checkbox"
                        role="switch"
                        .checked=${this.autoPlayTTS}
                        @change=${(e: Event) => this.handleAutoPlayTTSToggle((e.target as HTMLInputElement).checked)} />
                    </div>
                    <div class="form-field" style="grid-column: 1 / -1; margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px;">
                      <label for="tts-mode-select">Agent TTS Speech Output Mode</label>
                      <span class="setting-desc">Control spoken audio during desktop automation task execution.</span>
                      <select
                        id="tts-mode-select"
                        .value=${this.ttsMode}
                        @change=${(e: Event) => {
                          this.ttsMode = (e.target as HTMLSelectElement).value as any;
                          localStorage.setItem('project_lumin_tts_mode', this.ttsMode);
                          if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
                            this.wsTerminal.send(JSON.stringify({
                              type: 'input',
                              data: `tts mode ${this.ttsMode}`
                            }));
                          }
                        }}>
                        <option value="full">Full Spoken Responses (Read full output text)</option>
                        <option value="short">Short Confirmations (e.g., "Opened Google Drive.", "Note written.")</option>
                        <option value="off">TTS Off (Mute spoken output audio)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <h4 style="margin: 0 0 12px 0;">Available Commands & Examples</h4>
                  <p class="setting-desc" style="margin-bottom: 16px;">Speak naturally to control the visualizer! To stop accidental changes from YouTube/background audio, start commands with action words like <strong>make</strong>, <strong>turn</strong>, <strong>set</strong>, <strong>change</strong>, <strong>switch</strong>, or use <strong>"visualizer"</strong>.</p>
                  <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; color: var(--text-secondary);">
                    <li><strong style="color: var(--text-primary);">Themes:</strong> "make the background pink", "switch to cyberware", "turn the color green"</li>
                    <li><strong style="color: var(--text-primary);">Visualizer Shape:</strong> "make the shape a square", "visualizer shape to pyramid", "i want a sphere"</li>
                    <li><strong style="color: var(--text-primary);">Particle Shape:</strong> "make particles look like saturn", "shape particles like infinity", "set to a flower"</li>
                    <li><strong style="color: var(--text-primary);">Visibility:</strong> "turn off particles", "hide visualizer", "bring them back"</li>
                    <li><strong style="color: var(--text-primary);">Post-processing:</strong> "turn on glitch", "turn on morphing", "add chromatic aberration"</li>
                  </ul>
                </div>
              `
            : ''}
          </div>
        </div>
      </div>
    `;
  }

  private exportConfig() {
    const config = {
      masterEffectsEnabled: this.masterEffectsEnabled,
      isReverbEnabled: this.isReverbEnabled,
      isDelayEnabled: this.isDelayEnabled,
      isFlangerEnabled: this.isFlangerEnabled,
      particleSize: this.particleSize,
      particleSpeed: this.particleSpeed,
      particleShape: this.particleShape,
      visualizerShape: this.visualizerShape,
      visualizerSize: this.visualizerSize,
      visualizerSpeed: this.visualizerSpeed,
      bloomIntensity: this.bloomIntensity,
      bloomRadius: this.bloomRadius,
      bloomThreshold: this.bloomThreshold,
      activeTheme: this.activeTheme,
      customThemeColors: this.customThemeColors,
      separateCustomColors: this.separateCustomColors,
      customMainColor: this.customMainColor,
      customParticleColor: this.customParticleColor,
      showParticles: this.showParticles,
      showMainVisualizer: this.showMainVisualizer,
      globalScale: this.globalScale,
      enableMicrophone: this.enableMicrophone,
      enableDesktopAudio: this.enableDesktopAudio,
      activateWord: this.activateWord,
      sleepCommandWord: this.sleepCommandWord,
      offlineMode: this.offlineMode,
      afterimageEnabled: this.afterimageEnabled,
      afterimageStrength: this.afterimageStrength,
      chromaticAberrationEnabled: this.chromaticAberrationEnabled,
      chromaticAberrationIntensity: this.chromaticAberrationIntensity,
      morphingEnabled: this.morphingEnabled,
      morphingIntensity: this.morphingIntensity,
      filmGrainEnabled: this.filmGrainEnabled,
      filmGrainIntensity: this.filmGrainIntensity,
      glowPulseStrength: this.glowPulseStrength,
      themeTransitionSpeed: this.themeTransitionSpeed,
      metalness: this.metalness,
      roughness: this.roughness,
      rotationSpeed: this.rotationSpeed,
      rotationLocked: this.rotationLocked,
      autoPanEnabled: this.autoPanEnabled,
      autoPanSpeed: this.autoPanSpeed,
      directionalLightIntensity: this.directionalLightIntensity,
      ambientLightIntensity: this.ambientLightIntensity,
      cameraRotX: this.cameraRotX,
      cameraRotY: this.cameraRotY,
      cameraZoomMult: this.cameraZoomMult,
      cameraLocked: this.cameraLocked,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lumin-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private importConfig(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string);
        if (config) {
          if (config.masterEffectsEnabled !== undefined) this.masterEffectsEnabled = config.masterEffectsEnabled;
          if (config.isReverbEnabled !== undefined) this.isReverbEnabled = config.isReverbEnabled;
          if (config.isDelayEnabled !== undefined) this.isDelayEnabled = config.isDelayEnabled;
          if (config.isFlangerEnabled !== undefined) this.isFlangerEnabled = config.isFlangerEnabled;
          if (config.particleSize !== undefined) this.particleSize = config.particleSize;
          if (config.particleSpeed !== undefined) this.particleSpeed = config.particleSpeed;
          if (config.particleShape !== undefined) this.particleShape = config.particleShape;
          if (config.visualizerShape !== undefined) this.visualizerShape = config.visualizerShape;
          if (config.visualizerSize !== undefined) this.visualizerSize = config.visualizerSize;
          if (config.visualizerSpeed !== undefined) this.visualizerSpeed = config.visualizerSpeed;
          if (config.bloomIntensity !== undefined) this.bloomIntensity = config.bloomIntensity;
          if (config.bloomRadius !== undefined) this.bloomRadius = config.bloomRadius;
          if (config.bloomThreshold !== undefined) this.bloomThreshold = config.bloomThreshold;
          if (config.activeTheme !== undefined) this.activeTheme = config.activeTheme;
          if (config.customThemeColors !== undefined) this.customThemeColors = config.customThemeColors;
          if (config.separateCustomColors !== undefined) this.separateCustomColors = config.separateCustomColors;
          if (config.customMainColor !== undefined) this.customMainColor = config.customMainColor;
          if (config.customParticleColor !== undefined) this.customParticleColor = config.customParticleColor;
          if (config.showParticles !== undefined) this.showParticles = config.showParticles;
          if (config.showMainVisualizer !== undefined) this.showMainVisualizer = config.showMainVisualizer;
          if (config.globalScale !== undefined) this.globalScale = config.globalScale;
          if (config.enableMicrophone !== undefined) this.enableMicrophone = config.enableMicrophone;
          if (config.enableDesktopAudio !== undefined) this.enableDesktopAudio = config.enableDesktopAudio;
          if (config.activateWord !== undefined) this.activateWord = config.activateWord;
          if (config.sleepCommandWord !== undefined) this.sleepCommandWord = config.sleepCommandWord;
          if (config.offlineMode !== undefined) this.offlineMode = config.offlineMode;
          if (config.afterimageEnabled !== undefined) this.afterimageEnabled = config.afterimageEnabled;
          if (config.afterimageStrength !== undefined) this.afterimageStrength = config.afterimageStrength;
          if (config.chromaticAberrationEnabled !== undefined) this.chromaticAberrationEnabled = config.chromaticAberrationEnabled;
          if (config.chromaticAberrationIntensity !== undefined) this.chromaticAberrationIntensity = config.chromaticAberrationIntensity;
          if (config.morphingEnabled !== undefined) this.morphingEnabled = config.morphingEnabled;
          if (config.morphingIntensity !== undefined) this.morphingIntensity = config.morphingIntensity;
          if (config.filmGrainEnabled !== undefined) this.filmGrainEnabled = config.filmGrainEnabled;
          if (config.filmGrainIntensity !== undefined) this.filmGrainIntensity = config.filmGrainIntensity;
          if (config.glowPulseStrength !== undefined) this.glowPulseStrength = config.glowPulseStrength;
          if (config.themeTransitionSpeed !== undefined) this.themeTransitionSpeed = config.themeTransitionSpeed;
          if (config.metalness !== undefined) this.metalness = config.metalness;
          if (config.roughness !== undefined) this.roughness = config.roughness;
          if (config.rotationSpeed !== undefined) this.rotationSpeed = config.rotationSpeed;
          if (config.rotationLocked !== undefined) this.rotationLocked = config.rotationLocked;
          if (config.autoPanEnabled !== undefined) this.autoPanEnabled = config.autoPanEnabled;
          if (config.autoPanSpeed !== undefined) this.autoPanSpeed = config.autoPanSpeed;
          if (config.directionalLightIntensity !== undefined) this.directionalLightIntensity = config.directionalLightIntensity;
          if (config.ambientLightIntensity !== undefined) this.ambientLightIntensity = config.ambientLightIntensity;
          
          if (config.cameraRotX !== undefined) this.cameraRotX = config.cameraRotX;
          if (config.cameraRotY !== undefined) this.cameraRotY = config.cameraRotY;
          if (config.cameraZoomMult !== undefined) this.cameraZoomMult = config.cameraZoomMult;
          if (config.cameraLocked !== undefined) this.cameraLocked = config.cameraLocked;
        }
      } catch (err) {
        console.error("Failed to parse config file", err);
        alert('Invalid config file.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  private resetConfig() {
    this.masterEffectsEnabled = true;
    this.isReverbEnabled = false;
    this.isDelayEnabled = false;
    this.isFlangerEnabled = false;
    this.particleSize = 0.05;
    this.particleSpeed = 1.0;
    this.particleShape = 'saturn';
    this.visualizerShape = 'sphere';
    this.visualizerSize = 2.0;
    this.visualizerSpeed = 1.0;
    this.bloomIntensity = 0.5;
    this.bloomRadius = 0.35;
    this.bloomThreshold = 0.25;
    this.activeTheme = 'cyberware';
    this.customThemeColors = ['#00aaff', '#ff2a2a', '#00ff7f', '#ffae00', '#cc55ff', '#ffd700', '#00fca1', '#ff00c8'];
    this.separateCustomColors = false;
    this.customMainColor = '#00aaff';
    this.customParticleColor = '#ff2a2a';
    this.showParticles = true;
    this.showMainVisualizer = true;
    this.globalScale = 1.0;
    this.afterimageEnabled = false;
    this.afterimageStrength = 0.85;
    this.chromaticAberrationEnabled = false;
    this.chromaticAberrationIntensity = 0.005;
    this.morphingEnabled = false;
    this.morphingIntensity = 1.0;
    this.filmGrainEnabled = false;
    this.filmGrainIntensity = 0.35;
    this.glowPulseStrength = 0.0;
    this.themeTransitionSpeed = 1.0;
    this.metalness = 0.1;
    this.roughness = 0.7;
    this.rotationSpeed = 1.0;
    this.rotationLocked = true;
    this.autoPanEnabled = true;
    this.autoPanSpeed = 1.0;
    this.directionalLightIntensity = 1.2;
    this.ambientLightIntensity = 0.15;
    this.enableMicrophone = false;
    this.enableDesktopAudio = false;
    this.activateWord = 'wake up';
    this.sleepCommandWord = 'go to sleep';
    this.offlineMode = false;
    this.ollamaModel = 'llama3';
    this.piperVoice = 'en-US-JennyNeural';
    this.llmCommandTemplate = 'ollama run {model} "{prompt}"';
    this.cameraRotX = 0;
    this.cameraRotY = 0;
    this.cameraZoomMult = 1.0;
    this.cameraLocked = false;
  }

  private downloadVoiceCommandsTxt() {
    const commandsText = `Project - LUMIN - Live Audio Visualizer - Voice Commands Guide

Speak naturally to control the visualizer! To stop accidental changes from background audio, you can start commands with action words like "make", "turn", "set", "change", "switch", or use "visualizer", "particles", etc.

--- THEMES & COLORS ---
Examples: "make the background pink", "switch to cyberware", "theme 1", "theme 2"...
Available Colors/Themes:
1. Cyberware
2. Crimson / Red
3. Emerald / Matrix / Green
4. Solar / Orange
5. Arcane / Purple
6. Glacial / Ice
7. Golden / Gold
8. Hot Pink / Pink
9. Aquamarine / Aqua / Blue
10. Tungsten / Grey / Gray / White

--- VISUALIZER SHAPES ---
Examples: "make the shape a square", "visualizer shape 1", "visualizer shape 2"... "next visualizer shape"
Available Shapes:
1. Sphere / Ball / Globe
2. Cube / Square / Box
3. Pyramid / Triangle

--- PARTICLE SHAPES ---
Examples: "make particles look like saturn", "particle shape 1", "particle shape 2"... "next particle shape"
Available Shapes:
1. Saturn / Rings
2. Sphere / Ball
3. Triangle
4. Flower / Flower of Life
5. Vesica Piscis / Eye
6. Spiral / Fractal
7. Lissajous
8. Trefoil / Knot
9. Cinquefoil
10. Heart
11. Butterfly
12. Infinity / Figure 8
13. Galaxy / Space
14. Star
15. Rose
16. Hypocycloid
17. Atom / Nucleus
18. Torus / Donut
19. Helix / DNA

--- VISIBILITY (SHOW & HIDE) ---
Examples: "turn off particles", "hide visualizer", "bring them back"
Commands:
- Show/Hide Visualizer ("hide the center shape", "show main visualizer")
- Show/Hide Particles ("turn off dots", "bring back particles")
- Show All ("bring them back", "turn everything back on")

--- POST-PROCESSING EFFECTS ---
Examples: "turn on glitch", "disable film grain", "add chromatic aberration", "turn on morphing"
Available Effects:
- Afterimage / Trails / Echo (on/off)
- Chromatic Aberration / Glitch / RGB Split (on/off)
- Morphing / Wobble / Distortion (on/off)
- Film Grain / Noise (on/off)
- Master Effects / All Filters (on/off)
`;

    const blob = new Blob([commandsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voice-commands.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private async forceStopServer() {
    if (confirm("Are you sure you want to stop the server and terminate all agent processes?")) {
      try {
        await fetch('/api/shutdown?force=true', { method: 'POST' });
      } catch (e) {}
      if (this.wsTerminal) {
        try { this.wsTerminal.close(); } catch (e) {}
      }
      this.updateStatus('Server Terminated');
      alert("Server and agent process tree killed. Port released.");
    }
  }

  private renderSettingsModal() {
    return html`
      <div
        class="settings-overlay ${this.isSettingsOpen ? 'open' : ''}"
        @click=${this.cancelSettings}>
        <div class="settings-modal" @click=${(e: Event) => e.stopPropagation()}>
          <form @submit=${this.saveSettings} id="settingsForm" style="display: flex; flex-direction: column; width: 100%; height: 100%;">
            <div class="settings-modal-body">
              ${this.renderSettingsNav()} ${this.renderSettingsContent()}
            </div>
            <div class="settings-modal-footer">
               <div class="config-actions">
                 <button type="button" class="config-btn" title="Reset defaults" @click=${this.resetConfig} style="color: #ffaa00;">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                     <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                     <polyline points="3 3 3 8 8 8"></polyline>
                   </svg>
                   Reset
                 </button>
                 <input type="file" id="config-import-input" accept=".json" style="display: none;" @change=${this.importConfig} />
                 <button type="button" class="config-btn" title="Import preset" @click=${() => this.shadowRoot?.getElementById('config-import-input')?.click()}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                     <polyline points="17 8 12 3 7 8"></polyline>
                     <line x1="12" y1="3" x2="12" y2="15"></line>
                   </svg>
                   Import
                 </button>
                 <button type="button" class="config-btn" title="Export preset" @click=${this.exportConfig}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                     <polyline points="7 10 12 15 17 10"></polyline>
                     <line x1="12" y1="15" x2="12" y2="3"></line>
                   </svg>
                   Export
                 </button>
               </div>
               <div class="settings-actions">
                 <button type="button" class="cancel-btn" @click=${this.forceStopServer} style="color: #ff5555; border-color: rgba(255,85,85,0.4); margin-right: auto;">Kill Server</button>
                 <button type="button" class="cancel-btn" @click=${this.cancelSettings}>Cancel</button>
                 <button type="submit" class="save-btn">Save Changes</button>
               </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private renderCitations() {
    if (this.searchCitations.length === 0) {
      return null;
    }

    const uniqueCitations = [
      ...new Map(
        this.searchCitations.map((item) => [item.web.uri, item]),
      ).values(),
    ];

    return html`
      <div class="citations">
        <div class="citations-header">Sources</div>
        ${uniqueCitations.map((citation) => {
          let displayText = citation.web.title;
          if (!displayText) {
            try {
              displayText = new URL(citation.web.uri).hostname.replace(
                'www.',
                '',
              );
            } catch (e) {
              displayText = citation.web.uri;
            }
          }
          return html`
            <a
              href=${citation.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              title=${citation.web.title || citation.web.uri}>
              ${displayText}
            </a>
          `;
        })}
      </div>
    `;
  }

  private renderMessageText(text: string) {
    if (!text) return '';

    const renderMarkdown = (mdText: string) => {
      const rawHtml = marked.parse(mdText) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
      return html`<div class="markdown-body">${unsafeHTML(cleanHtml)}</div>`;
    };

    // Safely remove closed thought/think blocks
    let cleanText = text.replace(/<(?:thought|think)>[\s\S]*?<\/(?:thought|think)>/gi, '').trim();
    // Remove standalone <thought> or </thought> tags without wiping out text after unclosed tags
    cleanText = cleanText.replace(/<\/?(?:thought|think)>/gi, '').trim();

    return renderMarkdown(cleanText);
  }

  private renderChatPanel() {
    const combined = [...this.transcriptionHistory];
    if (this.inputTranscription) {
      combined.push({speaker: 'user', text: this.inputTranscription});
    }
    if (this.outputTranscription) {
      combined.push({speaker: 'ai', text: this.outputTranscription, voiceName: this.piperVoice});
    }

    return html`
      <div 
        class="chat-panel visible"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
        style="position: relative;"
      >
        ${this.isDraggingFile ? html`
          <div style="position: absolute; inset: 0; background: rgba(0, 170, 255, 0.15); backdrop-filter: blur(4px); border: 2px dashed var(--glow-color); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; pointer-events: none; border-radius: 8px; animation: pulse-glow 2s infinite;">
            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 0 24 24" width="48px" fill="var(--glow-color)">
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55z"/>
            </svg>
            <span style="color: var(--glow-color); font-weight: bold; font-size: 1rem; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;">
              Drop to Attach File
            </span>
          </div>
        ` : ''}

        <div class="chat-accessibility-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.05); gap: 12px; flex-shrink: 0; font-size: 0.75rem; color: rgba(255, 255, 255, 0.6); font-family: monospace;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Font Size:</span>
            <input 
              class="chat-font-slider"
              type="range" 
              min="0" 
              max="2" 
              step="1" 
              .value=${this.chatFontSize === 'smaller' ? '0' : this.chatFontSize === 'larger' ? '2' : '1'}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this.chatFontSize = val === '0' ? 'smaller' : val === '2' ? 'larger' : 'default';
                localStorage.setItem('project_lumin_chat_font_size', this.chatFontSize);
                this.requestUpdate();
              }}
              style="width: 70px; cursor: pointer;"
            />
            <span style="color: var(--glow-color); font-weight: bold; width: 45px; text-transform: uppercase;">
              ${this.chatFontSize}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;">
              <input 
                type="checkbox" 
                .checked=${this.chatFontBold} 
                @change=${(e: Event) => {
                  this.chatFontBold = (e.target as HTMLInputElement).checked;
                  localStorage.setItem('project_lumin_chat_font_bold', String(this.chatFontBold));
                  this.requestUpdate();
                }}
                style="accent-color: var(--glow-color); cursor: pointer;"
              />
              Bold Chat
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;" title=${this.autoPlayTTS ? 'Auto-Speak ON: Agent reads responses aloud' : 'Silent Mode: Agent responds with text only. Click speaker icon on messages to listen.'}>
              <input 
                type="checkbox" 
                .checked=${this.autoPlayTTS} 
                @change=${(e: Event) => {
                  this.handleAutoPlayTTSToggle((e.target as HTMLInputElement).checked);
                }}
                style="accent-color: var(--glow-color); cursor: pointer;"
              />
              ${this.autoPlayTTS ? 'Auto-Speak' : 'Silent Mode'}
            </label>
            <button
              type="button"
              @click=${this.forceStopServer}
              title="Force Kill Server & Agent Process Tree"
              style="background: rgba(255, 68, 68, 0.15); border: 1px solid rgba(255, 68, 68, 0.4); color: #ff6666; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
              Kill Server
            </button>
          </div>
        </div>

        <div 
          class="chat-history" 
          ${ref(this.chatHistoryRef)}
          style="--chat-font-size: ${this.chatFontSize === 'smaller' ? '0.85rem' : this.chatFontSize === 'larger' ? '1.1rem' : '0.95rem'}; font-size: var(--chat-font-size); font-weight: ${this.chatFontBold ? '600' : 'normal'};"
        >
          ${combined.map(
            (entry) => html`
              <div class="transcription-entry ${entry.speaker}">
                <div class="transcription-speaker" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    ${this.renderAvatarIcon(entry.speaker)}
                    <span style="font-weight: 600;">${entry.speaker === 'user' ? (this.userName || 'You') : (this.systemName || 'LUMIN')}</span>
                    ${entry.text && !entry.isLoading ? html`
                      <button
                        class="msg-copy-btn"
                        @click=${() => {
                          navigator.clipboard.writeText(entry.text!);
                        }}
                        title="Copy Message Text"
                        style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;"
                        @mouseenter=${(e: Event) => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
                        @mouseleave=${(e: Event) => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" height="13px" viewBox="0 0 24 24" width="13px" fill="currentColor">
                          <rect fill="none" height="24" width="24"/>
                          <path d="M16,20H5V6H3v14c0,1.1,0.9,2,2,2h11V20z M20,16V4c0-1.1-0.9-2-2-2H9C7.9,2,7,2.9,7,4v12c0,1.1,0.9,2,2,2h9 C19.1,18,20,17.1,20,16z M18,16H9V4h9V16z"/>
                        </svg>
                      </button>
                    ` : ''}
                  </span>
                  ${entry.speaker === 'ai'
                    ? entry.isLoading
                      ? html`<span class="response-timer" title="Response generation time">${this.responseTimer}s</span>`
                      : (entry.responseTime !== undefined
                          ? html`<span class="response-timer" title="Response generation time">${entry.responseTime}s</span>`
                          : '')
                    : ''}
                  ${entry.speaker === 'ai' && !entry.isLoading && entry.text
                    ? html`
                        ${this.playingTTSIndex === combined.indexOf(entry)
                          ? html`
                              <div class="tts-controls">
                                <div class="tts-controls-row">
                                  <button
                                    class="tts-control-btn ${this.ttsPlaybackState === 'playing' ? 'playing' : ''}"
                                    @click=${() => this.ttsPlaybackState === 'playing' ? this.pauseTTS() : this.resumeTTS()}
                                    title=${this.ttsPlaybackState === 'playing' ? 'Pause' : 'Resume'}
                                  >
                                    ${this.ttsPlaybackState === 'playing'
                                      ? html`<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
                                      : html`<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M8 5v14l11-7z"/></svg>`}
                                  </button>
                                  <button
                                    class="tts-control-btn"
                                    @click=${() => this.skipTTS(-5)}
                                    title="Rewind 5s"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                                  </button>
                                  <button
                                    class="tts-control-btn"
                                    @click=${() => this.skipTTS(5)}
                                    title="Forward 5s"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                                  </button>
                                  <button
                                    class="tts-control-btn"
                                    @click=${() => this.restartTTS()}
                                    title="Restart"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                                  </button>
                                  <button
                                    class="tts-control-btn"
                                    @click=${() => this.stopTTS(true)}
                                    title="Stop"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z"/></svg>
                                  </button>
                                </div>
                                <div class="tts-progress-row">
                                  <input
                                    type="range"
                                    class="tts-slider"
                                    .min=${0}
                                    .max=${this.ttsDuration || 100}
                                    .value=${this.ttsCurrentTime || 0}
                                    step="0.05"
                                    @input=${(e: any) => {
                                      this.isSeeking = true;
                                      this.ttsCurrentTime = parseFloat(e.target.value);
                                    }}
                                    @change=${(e: any) => {
                                      this.isSeeking = false;
                                      this.seekTTS(parseFloat(e.target.value));
                                    }}
                                  />
                                  <span class="tts-time-display">
                                    ${this.formatDuration(this.ttsCurrentTime)} / ${this.formatDuration(this.ttsDuration)}
                                  </span>
                                </div>
                              </div>
                            `
                          : html`
                              <button
                                class="tts-replay-btn"
                                @click=${() => this.playTTS(entry.text!, combined.indexOf(entry), entry.voiceName)}
                                title="Play Aloud"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 0 24 24" width="16px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                              </button>
                            `}
                      `
                    : ''}
                </div>
                <div class="message-bubble">
                  ${entry.isLoading
                    ? html`
                        <div class="loading-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      `
                    : ''}
                  ${entry.text
                    ? html`<div class="transcription-text">
                        ${this.renderMessageText(entry.text)}
                      </div>`
                    : ''}
                  ${entry.imageUrl
                    ? html`<img
                        src=${entry.imageUrl}
                        alt="Multimodal content" />`
                    : ''}
                  ${entry.videoUrl
                    ? html`<video src=${entry.videoUrl} controls></video>`
                    : ''}
                  ${entry.fileUrl
                    ? html`
                        <div class="file-attachment-card">
                          <div class="file-attachment-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                          </div>
                          <div class="transcription-text" style="font-size: 0.8rem;">
                            ${entry.fileName || 'Submitted content'}
                          </div>
                        </div>
                      `
                    : ''}
                </div>
                ${entry.citations && entry.citations.length > 0
                  ? html`
                      <div class="message-citations">
                        <div class="message-citations-header">Sources</div>
                        ${entry.citations.map(
                          (c) => html`
                            <a
                              href=${c.web?.uri || c.maps?.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              >${c.web?.title ||
                              c.maps?.title ||
                              c.web?.uri ||
                              c.maps?.uri}</a
                            >
                          `,
                        )}
                      </div>
                    `
                  : ''}
              </div>
            `,
          )}
        </div>
        <div class="chat-input-area">
          ${this.attachedFiles.length > 0
            ? html`
                <div class="attachment-preview-list" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                  ${this.attachedFiles.map(
                    (att, idx) => html`
                      <div class="attachment-preview" style="position: relative; display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; font-size: 0.75rem;">
                        ${att.type === 'image'
                          ? html`<img
                              src=${att.data?.startsWith('blob:') ? att.data : `data:${att.mimeType};base64,${att.data}`}
                              alt="Preview"
                              style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px;" />`
                          : att.type === 'video'
                          ? html`<video
                              src=${att.data?.startsWith('blob:') ? att.data : `data:${att.mimeType};base64,${att.data}`}
                              style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px;"
                              muted></video>`
                          : html`<div class="file-preview-placeholder" style="display: flex; align-items: center; gap: 4px;">
                              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                            </div>`}
                        <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${att.name}</span>
                        <button
                          class="remove-attachment-btn"
                          style="background: transparent; border: none; color: #ff3b30; cursor: pointer; font-size: 1rem; padding: 0 2px; margin-left: 4px;"
                          @click=${() => this.removeAttachment(idx)}>
                          &times;
                        </button>
                      </div>
                    `,
                  )}
                </div>
              `
            : ''}
          ${this.isContinuousActive
            ? html`
                <div class="continuous-mode-indicator" style="display: flex; align-items: center; justify-content: space-between; background: rgba(52, 199, 89, 0.1); border: 1px solid rgba(52, 199, 89, 0.3); padding: 6px 12px; margin-bottom: 8px; border-radius: 8px; font-size: 0.85rem; color: #34c759;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="pulse-dot" style="display: inline-block; width: 8px; height: 8px; background: #34c759; border-radius: 50%; box-shadow: 0 0 6px #34c759;"></span>
                    <span><strong>Continuous Mode Active</strong> - speak naturally</span>
                  </div>
                  <button 
                    @click=${this.exitContinuousMode}
                    style="background: #34c759; color: black; border: none; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; cursor: pointer; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center;"
                    onmouseover="this.style.opacity='0.8'"
                    onmouseout="this.style.opacity='1'"
                  >
                    End
                  </button>
                </div>
              `
            : ''}
          <div class="input-wrapper">
            <button
              title="Attach content"
              @click=${() => this.fileInputRef.value?.click()}
              ?disabled=${this.isGeneratingResponse}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path
                  d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
              </svg>
            </button>
            <textarea
              rows="1"
              placeholder="Ask about visuals, audio, or submitted content..."
              .value=${this.chatInputText}
              @input=${(e: Event) =>
                (this.chatInputText = (
                  e.target as HTMLTextAreaElement
                ).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  this.handleSendMessage();
                }
              }}
              ?disabled=${this.isGeneratingResponse}></textarea>
            <button
              class="mic-btn ${this.isRecording || (this.isContinuousActive && this.micPausedByTTS) ? 'recording' : ''} ${this.isContinuousActive ? 'continuous' : ''}"
              title="${this.isContinuousActive ? 'Continuous Mode Active - click to stop' : (this.isRecording || (this.isContinuousActive && this.micPausedByTTS) ? 'Stop Voice Recording' : 'Start Voice Input (Single tap: single turn, Double tap: continuous conversation)')}"
              @click=${this.handleMicClick}
              ?disabled=${this.isGeneratingResponse && !this.isContinuousActive}
              style="outline: none;"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1.2-9c0-.66.54-1.2 1.2-1.2s1.2.54 1.2 1.2v6c0 .66-.54 1.2-1.2 1.2s-1.2-.54-1.2-1.2V5zm6.5 6c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
              </svg>
            </button>
            <button
              class="send-btn"
              title="Send message"
              @click=${this.handleSendMessage}
              ?disabled=${(!this.chatInputText.trim() && !this.attachedFile && !this.isScreenSharingEnabled) ||
              this.isGeneratingResponse}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="currentColor">
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path
                  d="M4.01 6.03l7.51 3.22-7.52-1 .01-2.22m7.5 8.72L4 17.97v-2.22l7.51-1M2.01 3L2 10l15 2-15 2 .01 7L23 12 2.01 3z" />
              </svg>
            </button>
          </div>
          
          <!-- Live console / agent connection status indicator positioned underneath user chat input area -->
          <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 6px; padding: 0 4px;">
            <div class="terminal-status-indicator" style="display: flex; align-items: center; gap: 6px; font-family: monospace; font-size: 0.72rem; font-weight: bold; user-select: none;">
              <span class="terminal-status-dot ${this.isAgentRunning ? 'active' : this.isStartingAgent ? 'starting' : this.isStoppingAgent ? 'stopping' : ''}" style="width: 7px; height: 7px; display: inline-block; border-radius: 50%;"></span>
              <span style="color: ${this.isAgentRunning ? '#27c93f' : this.isStartingAgent ? '#ffaa00' : this.isStoppingAgent ? '#ff2a2a' : '#888'}; text-transform: uppercase; letter-spacing: 0.5px;">
                ${this.isAgentRunning ? 'LINK ACTIVE' : this.isStartingAgent ? 'STARTING...' : this.isStoppingAgent ? 'STOPPING...' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const isVisualizerActive = this.isRecording || this.micPausedByTTS || this.ttsPlaybackState === 'playing' || this.isScreenSharingEnabled;
    const statusClass = this.isSwitchingVoice
      ? 'switching'
      : this.isRecording
      ? 'recording'
      : (this.micPausedByTTS || this.ttsPlaybackState === 'playing')
      ? 'speaking'
      : this.isScreenSharingEnabled
      ? 'sharing-screen'
      : 'listening';
    return html`
      <div 
        class="app-layout-container ${this.isDraggingResizer || this.isDraggingTerminalPaneResizer ? 'dragging-active' : ''}"
        style="flex-direction: ${this.terminalPosition === 'right' ? 'row' : this.terminalPosition === 'left' ? 'row-reverse' : this.terminalPosition === 'bottom' ? 'column' : 'column-reverse'};"
      >
        <div class="main-canvas-area">
          
          <div
            class="live-audio-container ${isVisualizerActive
              ? 'visualizer-active'
              : ''} ${this.isIdle ? 'idle' : ''} ${this.isFullscreen ? 'fullscreen' : ''}">
            ${this.renderSettingsModal()} ${this.renderCitations()}
            <input
              type="file"
              multiple
              ${ref(this.fileInputRef)}
              style="display: none;"
              @change=${this.handleAttachmentChange}
              accept="*/*" />

            <canvas class="camera-canvas" ${ref(this.canvasRef)} style="display: none;"></canvas>

            <div class="hud">
              <div class="hud-actions">
                <div class="actions-container">
                  <div
                    class="actions-menu ${this.areActionsExpanded
                      ? 'expanded'
                      : ''}">
                    <button
                      class="hud-button ${this.isRecording || (this.isContinuousActive && this.micPausedByTTS)
                        ? 'active'
                        : ''} ${this.isContinuousActive ? 'continuous' : ''}"
                      title="${this.isContinuousActive ? 'Continuous Mode Active - click to stop' : (this.isRecording || (this.isContinuousActive && this.micPausedByTTS) ? 'Stop Voice Recording' : 'Start Voice Input (Single tap: single turn, Double tap: continuous conversation)')}"
                      @click=${this.handleMicClick}
                      ?disabled=${this.isReconnecting}>
                      ${this.isRecording || (this.isContinuousActive && this.micPausedByTTS)
                        ? html`<svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 0 24 24"
                            width="24px"
                            fill="currentColor">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path d="M6 6h12v12H6V6z" />
                          </svg>`
                        : html`<svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24px"
                            viewBox="0 0 24 24"
                            width="24px"
                            fill="currentColor">
                            <path d="M0 0h24v24H0V0z" fill="none" />
                            <path
                              d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
                          </svg>`}
                    </button>
                    ${this.isTerminalEnabled
                      ? html`
                          <button
                            class="hud-button ${this.isTerminalTabActive ? 'active' : ''}"
                            title="Toggle Agent Terminal"
                            @click=${() => this.toggleAgentTerminalFeature()}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 24px; height: 24px;">
                              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zm-12-3h8v2H8v-2zm-2-4l3-3-3-3 1.4-1.4 4.4 4.4-4.4 4.4L6 11z"/>
                            </svg>
                          </button>
                        `
                      : ''}
                    <button
                      class="hud-button"
                      title="Toggle Fullscreen"
                      @click=${this.toggleFullscreen}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 0 24 24"
                        width="24px"
                        fill="currentColor">
                        <path d="M0 0h24v24H0z" fill="none"/>
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                    </button>
                    <button
                      class="hud-button ${soundFX.getEnabled() ? 'active' : ''}"
                      title="${soundFX.getEnabled() ? 'UI Sound Effects: Enabled (Click to mute)' : 'UI Sound Effects: Muted (Click to enable)'}"
                      @click=${() => {
                        soundFX.toggleEnabled();
                        this.requestUpdate();
                      }}>
                      ${soundFX.getEnabled()
                        ? html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                            <path d="M0 0h24v24H0V0z" fill="none"/>
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                          </svg>`
                        : html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                            <path d="M0 0h24v24H0V0z" fill="none"/>
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                          </svg>`}
                    </button>
                    <button
                      class="hud-button"
                      title="Settings"
                      @click=${this.openSettings}
                      ?disabled=${this.isRecording ||
                      this.micPausedByTTS ||
                      this.isReconnecting}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 0 24 24"
                        width="24px"
                        fill="currentColor">
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path
                          d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                      </svg>
                    </button>
                  </div>
                  <button
                    class="actions-toggle-button ${this.areActionsExpanded
                      ? 'expanded'
                      : ''}"
                    title="${this.areActionsExpanded
                      ? 'Close Actions'
                      : 'Open Actions'}"
                    @click=${() =>
                      (this.areActionsExpanded = !this.areActionsExpanded)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 0 24 24"
                      width="24px"
                      fill="currentColor">
                      <path d="M0 0h24v24H0V0z" fill="none" />
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <gdm-live-audio-visuals-3d
              .isActive=${isVisualizerActive}
              .isSpeaking=${(this.ttsPlaybackState === 'playing' && (!!this.currentTTSSource || this.sources.size > 0)) || (window.speechSynthesis && window.speechSynthesis.speaking)}
              .inputNode=${this.inputNode}
              .outputNode=${this.outputNode}
              .particleSize=${this.particleSize}
              .particleSpeed=${this.particleSpeed}
              .particleShape=${this.particleShape}
              .visualizerShape=${this.visualizerShape}
              .visualizerSize=${this.visualizerSize}
              .visualizerSpeed=${this.visualizerSpeed}
              .showParticles=${this.showParticles}
              .showMainVisualizer=${this.showMainVisualizer}
              .globalScale=${this.globalScale}
              .bloomIntensity=${this.bloomIntensity}
              .bloomRadius=${this.bloomRadius}
              .bloomThreshold=${this.bloomThreshold}
              .themeGlowColors=${this.activeTheme === 'custom' ? (this.separateCustomColors ? [this.customMainColor] : this.customThemeColors) : [THEMES[this.activeTheme]['--glow-color']]}
              .themeParticleColors=${this.activeTheme === 'custom' && this.separateCustomColors ? [this.customParticleColor] : []}
              .backdropTextureUrl=${null}
              .afterimageEnabled=${this.afterimageEnabled}
              .afterimageStrength=${this.afterimageStrength}
              .chromaticAberrationEnabled=${this.chromaticAberrationEnabled}
              .morphingEnabled=${this.morphingEnabled}
              .morphingIntensity=${this.morphingIntensity}
              .chromaticAberrationIntensity=${
                this.chromaticAberrationIntensity
              }
              .filmGrainEnabled=${this.filmGrainEnabled}
              .filmGrainIntensity=${this.filmGrainIntensity}
              .glowPulseStrength=${this.glowPulseStrength}
              .themeTransitionSpeed=${this.themeTransitionSpeed}
              .metalness=${this.metalness}
              .roughness=${this.roughness}
              .rotationSpeed=${this.rotationSpeed}
              .rotationLocked=${this.rotationLocked}
              .autoPanEnabled=${this.autoPanEnabled}
              .autoPanSpeed=${this.autoPanSpeed}
              .directionalLightIntensity=${this.directionalLightIntensity}
              .ambientLightIntensity=${this.ambientLightIntensity}
              .cameraRotX=${this.cameraRotX}
              .cameraRotY=${this.cameraRotY}
              .cameraZoomMult=${this.cameraZoomMult}
              .cameraLocked=${this.cameraLocked}
              @camera-update=${(e: CustomEvent) => {
                this.cameraRotX = e.detail.rotX;
                this.cameraRotY = e.detail.rotY;
                this.cameraZoomMult = e.detail.zoom;
                this.cameraLocked = e.detail.locked;
              }}
              @silence-timeout=${this.stopEverythingAndGoToIdle}></gdm-live-audio-visuals-3d>
          </div>
        </div>

        <div 
          class="agent-sidebar pos-${this.terminalPosition} ${this.isTerminalOpen ? '' : 'collapsed'} ${this.isDraggingResizer ? 'dragging' : ''}"
          style="background: rgba(10, 10, 14, ${this.terminalOpacity}); ${
            window.innerWidth < 768 
              ? `width: 100vw; height: 100dvh;`
              : (this.terminalPosition === 'right' || this.terminalPosition === 'left' 
                  ? `width: ${this.terminalWidth}px;` 
                  : `height: ${this.terminalHeight}px;`)
          }"
        >
          <!-- Drag Handle for Resizing -->
          ${window.innerWidth >= 768 ? html`
          <div 
            class="sidebar-resizer ${this.isDraggingResizer ? 'dragging' : ''}" 
            @mousedown=${this.handleResizerMouseDown} 
            @touchstart=${this.handleResizerMouseDown}
          ></div>
          ` : ''}

          <!-- Non-collapsible wrapper to prevent layout reflow during slide open/close transitions -->
          <div style="${
            window.innerWidth < 768
              ? `width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative;`
              : (this.terminalPosition === 'right' || this.terminalPosition === 'left'
                  ? `width: ${this.terminalWidth}px; min-width: ${this.terminalWidth}px; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative;`
                  : `height: ${this.terminalHeight}px; min-height: ${this.terminalHeight}px; width: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative;`)
          }">
            <div class="sidebar-header">
              <div class="sidebar-title" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style="color: var(--glow-color); flex-shrink: 0;">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zm-12-3h8v2H8v-2zm-2-4l3-3-3-3 1.4-1.4 4.4 4.4-4.4 4.4L6 11z"/>
                </svg>
                <span style="flex-shrink: 0;">LUMIN Workspace</span>
                <span class="model-status-badge" style="background: rgba(39, 201, 63, 0.1); border: 1px solid rgba(39, 201, 63, 0.25); color: #27c93f; font-size: 0.7rem; font-family: monospace; font-weight: bold; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; white-space: nowrap;">
                  <span style="display: inline-block; width: 6px; height: 6px; background: #27c93f; border-radius: 50%;"></span>
                  Using ${this.activePlatform} • ${this.activeModelName}
                </span>
                ${this.isMcpEnabled ? html`
                  <span class="mcp-status-badge" style="background: rgba(0, 170, 255, 0.15); border: 1px solid rgba(0, 170, 255, 0.3); color: #00aaff; font-size: 0.7rem; font-family: monospace; font-weight: bold; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase; white-space: nowrap;" title="Model Context Protocol Server Active">
                    <span style="display: inline-block; width: 6px; height: 6px; background: #00aaff; border-radius: 50%;"></span>
                    MCP Active
                  </span>
                ` : ''}
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px;">
                <select 
                  style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.75rem; border-radius: 4px; padding: 2px 6px; cursor: pointer; outline: none;"
                  .value=${this.terminalPosition}
                  @change=${(e: Event) => {
                    this.terminalPosition = (e.target as HTMLSelectElement).value as any;
                    localStorage.setItem('project_lumin_terminal_position', this.terminalPosition);
                    this.triggerWindowResize();
                    this.requestUpdate();
                  }}
                  title="Reposition Workspace"
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>

                <button class="sidebar-close-btn" @click=${() => this.toggleTerminal(false)} title="Close Workspace">
                  <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Upper Pane: Modern Conversational Chat Interface -->
            ${this.renderChatPanel()}

            <!-- Horizontal Resizer Splitter -->
            <div 
              class="terminal-pane-resizer ${this.isDraggingTerminalPaneResizer ? 'dragging' : ''}" 
              @mousedown=${this.handleTerminalPaneResizerMouseDown} 
              @touchstart=${this.handleTerminalPaneResizerMouseDown}
            ></div>

            <!-- Lower Pane: Integrated Developer Terminal -->
            <div 
              class="terminal-pane-container ${this.isTerminalPaneCollapsed ? 'collapsed' : ''} ${this.isDraggingTerminalPaneResizer ? 'dragging' : ''}"
              style="${this.isTerminalPaneCollapsed ? '' : `height: ${this.terminalPaneHeight}px;`}"
            >
              <div class="terminal-window ${this.isTerminalVoiceCaptureActive ? 'voice-active' : ''}" style="background: rgba(12, 12, 12, ${this.terminalOpacity});">
                <div class="terminal-header" style="background: rgba(30, 30, 30, ${this.terminalOpacity}); border-bottom: 1px solid rgba(45, 45, 45, ${this.terminalOpacity}); display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; gap: 12px; flex-wrap: wrap;">
                  <div class="terminal-header-dots" style="display: flex; gap: 6px; align-items: center;">
                    <span class="terminal-dot red" title="Close Terminal" @click=${() => this.toggleTerminal(false)}></span>
                    <span class="terminal-dot yellow" title="${this.isTerminalPaneCollapsed ? 'Expand Terminal' : 'Minimize Terminal'}" @click=${() => {
                      this.isTerminalPaneCollapsed = !this.isTerminalPaneCollapsed;
                      localStorage.setItem('project_lumin_terminal_pane_collapsed', String(this.isTerminalPaneCollapsed));
                      this.requestUpdate();
                    }}></span>
                    <span class="terminal-dot green" title="Expand Terminal" @click=${() => {
                      this.isTerminalPaneCollapsed = false;
                      localStorage.setItem('project_lumin_terminal_pane_collapsed', 'false');
                      if (this.terminalPaneHeight < 220) {
                        this.terminalPaneHeight = 220;
                        localStorage.setItem('project_lumin_terminal_pane_height', '220');
                      }
                      this.requestUpdate();
                    }}></span>
                  </div>
                  
                  ${!this.isTerminalPaneCollapsed ? html`
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <!-- Quick Launch / Stop Agent Button -->
                      ${this.isAgentRunning 
                        ? html`
                          <button 
                            @click=${this.stopAgent}
                            ?disabled=${this.isStoppingAgent}
                            style="background: rgba(255, 42, 42, 0.15); border: 1px solid rgba(255, 42, 42, 0.3); color: #ff5555; cursor: pointer; font-size: 0.7rem; font-family: monospace; font-weight: bold; height: 24px; padding: 0 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 4px; outline: none; transition: all 0.2s; box-shadow: 0 0 6px rgba(255, 42, 42, 0.1);"
                            title="Stop Agent Process"
                          >
                            <span style="display: inline-block; width: 6px; height: 6px; background: #ff2a2a; border-radius: 50%;"></span>
                            STOP AGENT
                          </button>
                        `
                        : html`
                          <button 
                            @click=${this.startAgent}
                            ?disabled=${this.isStartingAgent}
                            style="background: rgba(39, 201, 63, 0.15); border: 1px solid rgba(39, 201, 63, 0.3); color: #27c93f; cursor: pointer; font-size: 0.7rem; font-family: monospace; font-weight: bold; height: 24px; padding: 0 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 4px; outline: none; transition: all 0.2s; box-shadow: 0 0 6px rgba(39, 201, 63, 0.2);"
                            title="Launch Agent Process"
                          >
                            <span style="display: inline-block; width: 6px; height: 6px; background: #ffaa00; border-radius: 50%; display: ${this.isStartingAgent ? 'inline-block' : 'none'};" class="terminal-status-dot starting"></span>
                            ${this.isStartingAgent ? 'LAUNCHING...' : 'LAUNCH AGENT'}
                          </button>
                        `
                      }

                      <!-- Clear Logs -->
                      <button 
                        @click=${this.clearTerminalLogs} 
                        style="background: none; border: 1px solid rgba(255,255,255,0.1); color: #888; cursor: pointer; font-size: 0.7rem; font-family: monospace; font-weight: bold; height: 24px; padding: 0 8px; border-radius: 4px; display: flex; align-items: center; justify-content: center; outline: none; transition: all 0.2s;" 
                        title="Clear Console Logs"
                        @mouseenter=${(e: Event) => (e.target as HTMLElement).style.color = '#ff5555'}
                        @mouseleave=${(e: Event) => (e.target as HTMLElement).style.color = '#888'}
                      >
                        CLEAR
                      </button>

                      <!-- Scroll to Bottom -->
                      <button 
                        @click=${this.handleScrollTerminalToBottomClick} 
                        style="background: none; border: 1px solid rgba(255,255,255,0.1); color: #888; cursor: pointer; font-size: 0.7rem; font-family: monospace; font-weight: bold; height: 24px; padding: 0 8px; border-radius: 4px; display: flex; align-items: center; justify-content: center; outline: none; transition: all 0.2s;" 
                        title="Scroll to Bottom"
                        @mouseenter=${(e: Event) => (e.target as HTMLElement).style.color = 'var(--glow-color)'}
                        @mouseleave=${(e: Event) => (e.target as HTMLElement).style.color = '#888'}
                      >
                        SCROLL
                      </button>

                      <!-- Collapse / Expand -->
                      <button 
                        @click=${() => {
                          this.isTerminalPaneCollapsed = !this.isTerminalPaneCollapsed;
                          localStorage.setItem('project_lumin_terminal_pane_collapsed', String(this.isTerminalPaneCollapsed));
                          this.requestUpdate();
                        }} 
                        style="background: ${this.isTerminalPaneCollapsed ? 'rgba(255,170,0,0.15)' : 'none'}; border: 1px solid ${this.isTerminalPaneCollapsed ? 'rgba(255,170,0,0.3)' : 'rgba(255,255,255,0.1)'}; color: ${this.isTerminalPaneCollapsed ? '#ffaa00' : '#888'}; cursor: pointer; font-size: 0.7rem; font-family: monospace; font-weight: bold; height: 24px; padding: 0 8px; border-radius: 4px; display: flex; align-items: center; justify-content: center; outline: none;" 
                        title="${this.isTerminalPaneCollapsed ? 'Expand Terminal Pane' : 'Collapse Terminal Pane'}"
                      >
                        ${this.isTerminalPaneCollapsed ? 'EXPAND' : 'MINIMIZE'}
                      </button>

                      <!-- Text Size Controls -->
                      <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); height: 24px;">
                        <span style="font-size: 0.7rem; color: #888; font-weight: bold; user-select: none;">TEXT:</span>
                        <button @click=${() => this.adjustTerminalFontSize(-1)} style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 0.8rem; font-weight: bold; padding: 0 6px; outline: none;" title="Decrease Text Size">A-</button>
                        <span style="font-size: 0.75rem; color: #fff; font-weight: bold; min-width: 32px; text-align: center; user-select: none;">${this.terminalFontSize}px</span>
                        <button @click=${() => this.adjustTerminalFontSize(1)} style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 0.8rem; font-weight: bold; padding: 0 6px; outline: none;" title="Increase Text Size">A+</button>
                      </div>
                      
                      <!-- Bold Toggle Button -->
                      <button @click=${() => this.toggleTerminalBold()} style="background: ${this.terminalIsBold ? 'rgba(255,255,255,0.15)' : 'none'}; border: 1px solid ${this.terminalIsBold ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}; color: ${this.terminalIsBold ? '#fff' : '#aaa'}; cursor: pointer; font-size: 0.7rem; font-weight: bold; height: 24px; padding: 0 8px; border-radius: 4px; display: flex; align-items: center; justify-content: center; outline: none;" title="Toggle Bold Text">
                        <span style="font-weight: 900;">B</span>
                      </button>
                    </div>
                  ` : ''}
                </div>

                <div class="terminal-screen" ${ref(this.terminalScreenRef)} style="font-size: ${this.terminalFontSize}px; font-weight: ${this.terminalIsBold ? 'bold' : 'normal'};">
                  ${this.renderTerminalLogsHTML()}
                </div>

                <div class="terminal-input-row ${this.isTerminalVoiceCaptureActive ? 'voice-active' : ''}" style="background: rgba(15, 15, 15, ${this.terminalOpacity}); border-top: 1px solid rgba(30, 30, 30, ${this.terminalOpacity});">
                  <span class="terminal-prompt">&gt;&gt;</span>
                  <input
                    type="text"
                    class="terminal-input"
                    .value=${this.terminalInput}
                    @input=${(e: Event) => this.terminalInput = (e.target as HTMLInputElement).value}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        if (this.terminalInput.trim()) {
                          this.sendTerminalInput();
                        } else {
                          this.handleTerminalEmptyEnter();
                        }
                      } else if (e.key === 'Backspace' && !this.terminalInput) {
                        e.stopPropagation();
                      }
                    }}
                    @blur=${(e: FocusEvent) => {
                      if (!this.isTerminalOpen && document.activeElement === e.target) {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder=${this.isTerminalVoiceCaptureActive ? 'Listening... speak now and hit Enter' : 'Type message or press Enter to speak...'}
                    ?disabled=${!this.isAgentRunning}
                  />
                  <button 
                    class="terminal-voice-btn ${this.isTerminalVoiceCaptureActive ? 'active' : ''}"
                    ?disabled=${!this.isAgentRunning}
                    @click=${this.handleTerminalEmptyEnter}
                    title="${this.isTerminalVoiceCaptureActive ? 'Stop Voice Recording' : 'Start Voice Recording'}"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="terminal-controls">
                <div class="terminal-status-indicator">
                  <span class="terminal-status-dot ${this.isAgentRunning ? 'active' : this.isStartingAgent ? 'starting' : this.isStoppingAgent ? 'stopping' : ''}"></span>
                  <span style="color: ${this.isAgentRunning ? '#27c93f' : this.isStartingAgent ? '#ffaa00' : this.isStoppingAgent ? '#ff2a2a' : '#888'}; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${this.isAgentRunning ? 'LINK ACTIVE' : this.isStartingAgent ? 'STARTING...' : this.isStoppingAgent ? 'STOPPING...' : 'DISCONNECTED'}
                  </span>
                </div>
                ${this.isAgentRunning 
                  ? html`
                    <button
                      class="terminal-btn stop"
                      @click=${this.stopAgent}
                      ?disabled=${this.isStoppingAgent}
                      title="Shut down the running agent process safely">
                      ${this.isStoppingAgent ? 'Stopping...' : 'Stop Agent'}
                    </button>
                  `
                  : html`
                    <button
                      class="terminal-btn"
                      @click=${this.startAgent}
                      ?disabled=${this.isStartingAgent}
                      title="Launch start_agent.bat process">
                      ${this.isStartingAgent ? 'Launching...' : 'Launch Agent'}
                    </button>
                  `
                }
              </div>
            </div>
          </div>
        </div>

        ${this.isTerminalEnabled && this.isTerminalTabActive
          ? html`
              <div
                class="terminal-float-tab pos-${this.terminalPosition} ${this.isTerminalOpen ? 'shifted' : ''} ${this.isDraggingResizer || this.isDraggingTab ? 'dragging' : ''}"
                style="${this.isTerminalOpen 
                  ? (this.terminalPosition === 'right' 
                      ? `right: ${this.terminalWidth}px;` 
                      : this.terminalPosition === 'left' 
                        ? `left: ${this.terminalWidth}px;` 
                        : this.terminalPosition === 'top' 
                          ? `top: ${this.terminalHeight}px;` 
                          : `bottom: ${this.terminalHeight}px;`)
                  : ''}"
                @mousedown=${this.handleTabMouseDown}
                @touchstart=${this.handleTabTouchStart}
                @mouseenter=${() => {
                  if (this.isTerminalAutoOpenOnHover) {
                    this.toggleTerminal(true);
                  }
                }}
                title="${this.isTerminalOpen ? 'Collapse' : 'Expand'} Agent Terminal (Drag to dock to any edge)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zm-12-3h8v2H8v-2zm-2-4l3-3-3-3 1.4-1.4 4.4 4.4-4.4 4.4L6 11z"/>
                </svg>
                <span class="terminal-float-tab-text">Agent Terminal</span>
              </div>
            `
          : ''}
      </div>
    `;
  }
}
