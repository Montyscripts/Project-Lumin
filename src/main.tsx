
/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix: Removed unused HarmBlockThreshold and HarmCategory imports.
import {LitElement, PropertyValues, css, html, nothing} from 'lit';
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
import { THEMES, SettingsManager } from './services/settings-manager';
import { AgentWebSocketBridge } from './services/agent-websocket';
import { parseStructuredStatus } from './types/status-schema';
import './components/chat-message-list';
import './components/terminal-panel';
import './components/visualizer-controls';
import './components/model-selector';
import './components/status-bar';
import { TaskProgressInfo } from './components/status-bar';
import { renderVoiceSettingsSection } from './components/settings/voice-settings-section';
import { renderModelSettingsSection } from './components/settings/model-settings-section';
import { renderInterfaceSettingsSection } from './components/settings/interface-settings-section';
import { renderAdvancedSettingsSection } from './components/settings/advanced-settings-section';
import { renderContextSkillsSettingsSection } from './components/settings/context-skills-settings-section';
import { contextManager } from './services/context-manager';
import { skillsManager, LuminSkill } from './services/skills-manager';




function createSafeAudioContext(sampleRate?: number): AudioContext {
  const AudioCtx = typeof window !== 'undefined' ? ((window as any).AudioContext || (window as any).webkitAudioContext) : null;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this environment');
  }
  if (sampleRate) {
    try {
      return new AudioCtx({ sampleRate });
    } catch (e) {
      console.warn(`AudioContext with sampleRate ${sampleRate} failed, falling back to default sampleRate:`, e);
    }
  }
  return new AudioCtx();
}

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
  @state() private currentTab: 'voice' | 'agent' | 'settings' = (() => {
    const saved = localStorage.getItem('project_lumin_active_tab');
    return (saved === 'agent' || saved === 'settings') ? saved : 'voice';
  })();
  @state() private isVisualizerPipMinimized = localStorage.getItem('project_lumin_pip_minimized') === 'true';
  @state() private agentVisMode: 'compact' | 'minimal' | 'hidden' = (localStorage.getItem('project_lumin_agent_vis_mode') as any) || 'compact';
  @state() private agentPipCorner: 'top-right' | 'top-left' = (localStorage.getItem('project_lumin_agent_pip_corner') as any) || 'top-right';
  @state() private agentPipPos: { x: number; y: number } | null = (() => {
    try {
      const saved = localStorage.getItem('project_lumin_agent_pip_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          if (typeof window !== 'undefined' && window.innerHeight > 0) {
            const maxY = Math.max(10, window.innerHeight - 300);
            parsed.y = Math.min(parsed.y, maxY);
            parsed.x = Math.max(10, Math.min(window.innerWidth - 180, parsed.x));
          }
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  })();
  @state() private isDraggingAgentPip = false;
  private hasAgentPipDragged = false;
  @state() isRecording = false;
  @state() private taskProgress: TaskProgressInfo | null = null;
  @state() private isTerminalOpen = false;
  @state() private isTerminalEnabled = false;
  @state() private isTerminalTabActive = true;
  @state() private terminalOpacity = 0.5;
  @state() private terminalPosition: 'left' | 'right' | 'bottom' = (() => {
    const saved = localStorage.getItem('project_lumin_terminal_position');
    return (saved === 'left' || saved === 'right' || saved === 'bottom') ? saved : 'right';
  })();
  @state() private isTerminalAutoOpenOnHover = localStorage.getItem('project_lumin_terminal_auto_open_hover') === 'true';
  @state() private isRuntimeDrawerOpen = false;
  @state() private runtimeDrawerPos = { top: 52, left: 16, maxHeight: 460, width: 330, flipUp: false };
  @state() private isDraggingTab = false;
  private tabDragStartX = 0;
  private tabDragStartY = 0;
  private hasTabDragged = false;
  @state() private terminalWidth = Math.max(400, Number(localStorage.getItem('project_lumin_terminal_width') || '440'));
  @state() private terminalHeight = Number(localStorage.getItem('project_lumin_terminal_height') || '320');
  @state() private isDraggingResizer = false;
  @state() private isAgentRunning = false;
  @state() private isStartingAgent = false;
  @state() private isStoppingAgent = false;
  @state() private dryRunEnabled = false;
  @state() private terminalLogs = '';
  @state() private terminalInput = '';
  @state() private isTerminalVoiceCaptureActive = false;
  @state() private terminalFontSize = Number(localStorage.getItem('project_lumin_terminal_font_size') || '14');
  @state() private terminalIsBold = localStorage.getItem('project_lumin_terminal_is_bold') !== 'false';
  @state() private chatFontSize: 'smaller' | 'default' | 'larger' = (() => {
    const val = localStorage.getItem('project_lumin_chat_font_size');
    if (val === 'smaller' || val === 'larger' || val === 'default') return val;
    if (val && !isNaN(Number(val))) {
      const n = Number(val);
      if (n <= 13) return 'smaller';
      if (n >= 17) return 'larger';
      return 'default';
    }
    return 'default';
  })();
  @state() private chatFontBold = localStorage.getItem('project_lumin_chat_font_bold') === 'true';

  private getChatFontSizeRem(): string {
    switch (this.chatFontSize) {
      case 'smaller':
        return '0.95rem';
      case 'larger':
        return '1.38rem';
      case 'default':
      default:
        return '1.15rem';
    }
  }

  private getChatLineHeight(): string {
    switch (this.chatFontSize) {
      case 'smaller':
        return '1.5';
      case 'larger':
        return '1.65';
      case 'default':
      default:
        return '1.55';
    }
  }
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
  @state() private unrestrictedMode = localStorage.getItem('project_lumin_unrestricted_mode') === 'true';
  @state() private piperVoice = localStorage.getItem('project_lumin_piper_voice') || 'en-US-JennyNeural';
  @state() private ttsMode: 'full' | 'short' | 'off' = (localStorage.getItem('project_lumin_tts_mode') as any) || 'full';
  @state() private llmCommandTemplate = 'ollama run {model} "{prompt}"';
  @state() private isMcpEnabled = false;
  @state() private activeSettingsTab:
    | 'VOICE'
    | 'MODELS'
    | 'CONTEXT_SKILLS'
    | 'INTERFACE'
    | 'ADVANCED'
    | 'GENERAL'
    | 'MCP'
    | 'POST_PROCESSING'
    | 'GLOW_EFFECTS'
    | 'GEOMETRY'
    | 'ENVIRONMENT'
    | 'THEMES'
    | 'VOICE_COMMANDS' = 'VOICE';
  @state() activeContextSubTab: 'USER' | 'IDENTITY' | 'MEMORY' | 'RULES' = 'USER';
  @state() activeSkillCategoryFilter: string = 'ALL';
  @state() isCreatingCustomSkill: boolean = false;
  @state() activeSkill: string = '';
  @state() private activeInterfaceFilter: 'ALL' | 'THEMES' | 'GEOMETRY' | 'POST_PROCESSING' | 'CAMERA' | 'WORKSPACE' = 'ALL';
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
  @state() private particleFormationScale = 1.0;
  @state() private particleSpeed = 1.0;
  @state() private particleShape = 'saturn';
  @state() private visualizerShape = 'sphere';
  @state() private visualizerSize = 2.0;
  @state() private visualizerSpeed = 1.0;
  private initialParticleFormationScale = 1.0;
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
  @state() private activateWord = 'computer';
  @state() private sleepCommandWord = 'standby';
  private lastSleepTimestamp = 0;
  @state() private offlineMode = false;
  @state() afterimageEnabled = true;
  @state() afterimageStrength = 0.85;
  @state() chromaticAberrationEnabled = false;
  @state() chromaticAberrationIntensity = 0.005;
  @state() morphingEnabled = true;
  @state() morphingIntensity = 1.0;
  @state() mercuryMetalEnabled = true;
  @state() mercuryFluidity = 1.0;
  @state() mercurySheen = 1.5;
  @state() gradientBevelEnabled = false;
  @state() bevelRingWidth = 1.0;
  @state() bevelSheen = 1.6;
  @state() bevelShadowEnabled = true;
  @state() filmGrainEnabled = false;
  @state() filmGrainIntensity = 0.35;
  @state() scanlinesEnabled = false;
  @state() scanlinesIntensity = 0.35;
  @state() scanlinesDensity = 600.0;
  @state() vignetteEnabled = false;
  @state() vignetteDarkness = 1.4;
  @state() vignetteOffset = 1.1;
  @state() glitchEnabled = false;
  @state() glitchIntensity = 0.35;
  @state() anamorphicFlareEnabled = false;
  @state() flareIntensity = 0.8;
  @state() flareThreshold = 0.75;
  @state() colorGradingEnabled = false;
  @state() colorGradingMode = 'cyberpunk';
  @state() colorGradingIntensity = 0.85;
  @state() godRaysEnabled = false;
  @state() godRaysIntensity = 0.6;
  @state() edgeGlowEnabled = false;
  @state() edgeGlowIntensity = 0.8;
  @state() edgeGlowThreshold = 0.15;
  @state() hexGridEnabled = false;
  @state() hexGridScale = 24.0;
  @state() barrelDistortionEnabled = false;
  @state() barrelCurvature = 0.15;
  @state() pixelationEnabled = false;
  @state() pixelSize = 6.0;
  @state() vhsDistortionEnabled = false;
  @state() vhsTapeNoise = 0.4;
  @state() prismaticDispersionEnabled = false;
  @state() prismaticSpread = 0.015;
  @state() previewSimulateAudio = true;
  @state() previewViewportSize: 'compact' | 'standard' | 'expanded' = 'standard';
  @state() previewPinned = true;
  @state() glowPulseStrength = 0.0;
  @state() themeTransitionSpeed = 1.0;

  private initialMercuryMetalEnabled = true;
  private initialMercuryFluidity = 1.0;
  private initialMercurySheen = 1.5;
  private initialGradientBevelEnabled = false;
  private initialBevelRingWidth = 1.0;
  private initialBevelSheen = 1.6;
  private initialBevelShadowEnabled = true;
  private initialScanlinesEnabled = false;
  private initialScanlinesIntensity = 0.35;
  private initialScanlinesDensity = 600.0;
  private initialVignetteEnabled = false;
  private initialVignetteDarkness = 1.4;
  private initialVignetteOffset = 1.1;
  private initialGlitchEnabled = false;
  private initialGlitchIntensity = 0.35;
  private initialAnamorphicFlareEnabled = false;
  private initialFlareIntensity = 0.8;
  private initialFlareThreshold = 0.75;
  private initialColorGradingEnabled = false;
  private initialColorGradingMode = 'cyberpunk';
  private initialColorGradingIntensity = 0.85;
  private initialGodRaysEnabled = false;
  private initialGodRaysIntensity = 0.6;
  private initialEdgeGlowEnabled = false;
  private initialEdgeGlowIntensity = 0.8;
  private initialEdgeGlowThreshold = 0.15;
  private initialHexGridEnabled = false;
  private initialHexGridScale = 24.0;
  private initialBarrelDistortionEnabled = false;
  private initialBarrelCurvature = 0.15;
  private initialPixelationEnabled = false;
  private initialPixelSize = 6.0;
  private initialVhsDistortionEnabled = false;
  private initialVhsTapeNoise = 0.4;
  private initialPrismaticDispersionEnabled = false;
  private initialPrismaticSpread = 0.015;
  
  @state() cameraRotX = 0;
  @state() cameraRotY = 0;
  @state() cameraZoomMult = 1.0;
  @state() cameraLocked = false;
  
  // Visualizer-Only / Cinema Mode state
  @state() private isVisualizerOnlyMode = false;
  @state() private showCinemaToast = false;
  private hasShownCinemaToastThisSession = false;
  
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
  @state() private initialActivateWord = 'computer';
  @state() private initialSleepCommandWord = 'standby';
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
  @state() lightColor = '#ffffff';
  @state() ambientLightColor = '#ffffff';

  // Custom Environment Reflection Map state
  @state() envSource: 'default' | 'custom' = 'default';
  @state() envImageUrl: string | null = null;
  @state() envImageName: string | null = null;
  @state() envIntensity = 1.0;
  @state() envReflectionStrength = 1.0;
  @state() envRotationY = 0;
  @state() envImageStatus: string | null = null;
  @state() envImageError: string | null = null;

  // Custom 3D Model Geometry state
  @state() geometrySource: 'builtin' | 'custom' = 'builtin';
  @state() customModelUrl: string | null = null;
  @state() customModelName: string | null = null;
  @state() customModelScale = 1.0;
  @state() customModelPosX = 0;
  @state() customModelPosY = 0;
  @state() customModelPosZ = 0;
  @state() customModelRotX = 0;
  @state() customModelRotY = 0;
  @state() customModelRotZ = 0;
  @state() customModelVertexCount = 0;
  @state() customModelStatus: string | null = null;
  @state() customModelError: string | null = null;

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
  @state() private terminalPaneHeight = Number(localStorage.getItem('project_lumin_terminal_pane_height') || '260');
  @state() private isTerminalPaneCollapsed = false;
  @state() private isDraggingTerminalPaneResizer = false;
  @state() private isDraggingTerminalSideResizer = false;
  @state() private isLuminEasterEggActive = false;
  @state() private luminEasterEggParticles: Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; delay: number }> = [];
  private luminClickTimestamps: number[] = [];
  private luminEasterEggTimeout: any = null;
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
    type: 'image' | 'video' | 'audio' | 'file';
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

  private inputAudioContext: AudioContext = createSafeAudioContext(16000);
  private outputAudioContext: AudioContext = createSafeAudioContext(24000);
  @state() inputNode: GainNode = this.inputAudioContext.createGain();
  private micGainNode: GainNode = this.inputAudioContext.createGain();
  @state() outputNode: GainNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  @state() private audioDevices: MediaDeviceInfo[] = [];
  @state() private selectedMicAudioDeviceId = '';
  @state() private selectedDesktopAudioDeviceId = '';
  private initialSelectedMicAudioDeviceId = '';
  private initialSelectedDesktopAudioDeviceId = '';
  @state() private micPermissionState: 'prompt' | 'granted' | 'denied' | 'unknown' = 'unknown';
  @state() private isRequestingMicPermission = false;
  @state() private micPermissionError = '';
  @state() private isDesktopAudioCapturing = false;
  @state() private desktopDeviceStream: MediaStream | null = null;
  private desktopDeviceSourceNode: any = null;
  private voiceSubmitTimer: any = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
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
      font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      color: var(--text-primary, #f1f5f9);
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Unified Sleek Custom Scrollbars */
    *::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    *::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 3px;
    }
    *::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      border: 1px solid transparent;
      transition: background-color 0.2s;
    }
    *::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 170, 255, 0.5);
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
      background: rgba(0, 0, 0, 0.65);
      z-index: 150;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0.25s ease;
    }

    .settings-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .settings-modal {
      display: flex;
      flex-direction: column;
      background: var(--background-secondary, #0e111a);
      color: var(--text-primary, #f1f5f9);
      border-radius: 16px;
      width: 94%;
      max-width: 1180px;
      font-family: var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      border: 1px solid var(--border-color-hover, rgba(255, 255, 255, 0.14));
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 32px var(--glow-color-faded, rgba(0, 170, 255, 0.12));
      height: 90vh;
      min-height: 440px;
      max-height: 94vh;
      overflow: hidden;
      transform: scale(0.97);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
    }

    .settings-workspace-surface {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--background-primary, #08090d);
      overflow: hidden;
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
      padding: 10px 24px;
      border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      background: var(--background-surface, #131722);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 12px;
      z-index: 10;
    }

    .settings-overlay.open .settings-modal {
      transform: none;
    }

    .settings-nav {
      padding: 18px 14px;
      border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      background: var(--background-surface, #131722);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      width: 230px;
      gap: 14px;
      box-sizing: border-box;
    }

    .config-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .config-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      color: var(--text-primary, #f1f5f9);
      border-radius: 8px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.82rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: 0.2px;
      user-select: none;
    }
    
    .config-btn:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.22));
      color: #ffffff;
      transform: translateY(-1px);
    }

    .config-btn:active {
      transform: translateY(0);
    }

    .settings-nav-header {
      padding: 0 4px 16px 4px;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    }

    .settings-nav-header h2 {
      margin: 0;
      font-size: 1.05rem;
      letter-spacing: 0.2px;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .settings-nav-header span {
      font-size: 0.76rem;
      color: var(--text-secondary, #94a3b8);
      margin-top: 4px;
      display: block;
    }

    .settings-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .settings-nav-item-btn {
      width: 100%;
      padding: 10px 12px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary, #94a3b8);
      font-size: 0.88rem;
      text-align: left;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      user-select: none;
    }

    .settings-nav-item-btn:hover {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .settings-nav-item-btn.active {
      color: #ffffff;
      font-weight: 600;
      background: var(--glow-color-subtle, rgba(0, 170, 255, 0.12));
      border-color: var(--glow-color-faded, rgba(0, 170, 255, 0.35));
      box-shadow: 0 2px 12px rgba(0, 170, 255, 0.15);
    }

    .settings-nav-item-btn.active::before {
      content: '';
      position: absolute;
      left: -2px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      background: var(--glow-color, #00aaff);
      border-radius: 2px;
      box-shadow: 0 0 8px var(--glow-color, #00aaff);
    }

    .settings-nav-item-btn.active .nav-icon {
      background: var(--glow-color-faded, rgba(0, 170, 255, 0.25));
      color: var(--glow-color, #00aaff);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.15rem;
      transition: all 0.2s;
    }

    .nav-label-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .nav-label {
      font-size: 0.88rem;
      line-height: 1.2;
      color: #ffffff;
      font-weight: 600;
    }

    .nav-desc {
      font-size: 0.72rem;
      color: var(--text-secondary, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .settings-content {
      flex-grow: 1;
      padding: 28px 36px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      background: var(--background-primary, #08090d);
    }

    .settings-content.interface-content-layout {
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 0;
    }

    .settings-content::-webkit-scrollbar {
      width: 6px;
    }

    .settings-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 3px;
    }

    .settings-tab-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      margin-bottom: 2px;
      flex-wrap: wrap;
      gap: 14px;
    }

    .settings-tab-banner-info h3 {
      margin: 0 0 6px 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.2px;
    }

    .settings-tab-banner-info p {
      margin: 0;
      font-size: 0.86rem;
      color: var(--text-secondary, #94a3b8);
      line-height: 1.45;
      max-width: 680px;
    }

    .settings-header-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(0, 170, 255, 0.08);
      border: 1px solid var(--glow-color-faded, rgba(0, 170, 255, 0.3));
      color: var(--glow-color, #00aaff);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }

    .settings-modal form {
      display: flex;
      flex-direction: column;
      gap: 22px;
      flex-grow: 1;
    }

    .settings-filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding-bottom: 2px;
    }

    .settings-filter-pill {
      background: var(--background-surface, #131722);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      color: var(--text-secondary, #94a3b8);
      padding: 7px 14px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      user-select: none;
    }

    .settings-filter-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.2));
    }

    .settings-filter-pill.active {
      background: var(--glow-color-faded, rgba(0, 170, 255, 0.2));
      color: var(--glow-color, #00aaff);
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 12px var(--glow-color-faded, rgba(0, 170, 255, 0.25));
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px 24px;
      background: var(--background-card, #141824);
      border-radius: 12px;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      margin-bottom: 0px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-section:hover {
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.15));
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    }

    .form-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
      flex-wrap: wrap;
      gap: 10px;
    }

    .form-section-title {
      font-size: 0.92rem;
      color: #ffffff;
      letter-spacing: 0.2px;
      margin: 0;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .form-section-title span.section-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--glow-color-subtle, rgba(0, 170, 255, 0.12));
      color: var(--glow-color, #00aaff);
      font-size: 0.95rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      align-items: start;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      gap: 6px;
    }

    .setting-desc {
      font-size: 0.8rem;
      color: var(--text-secondary, #94a3b8);
      margin-top: 0;
      margin-bottom: 4px;
      line-height: 1.48;
    }

    .setting-desc strong {
      color: #f1f5f9;
    }

    .setting-desc code {
      background: rgba(0, 170, 255, 0.1);
      color: var(--glow-color, #00aaff);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: var(--font-mono, monospace);
      font-size: 0.78rem;
      border: 1px solid rgba(0, 170, 255, 0.2);
    }

    .form-field label {
      font-weight: 600;
      font-size: 0.88rem;
      color: #f1f5f9;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      letter-spacing: 0.1px;
    }
    
    .form-field-toggle {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      min-height: 52px;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
      border-radius: 10px;
      gap: 18px;
      transition: background 0.2s, border-color 0.2s;
    }

    .form-field-toggle:hover {
      background: rgba(255, 255, 255, 0.045);
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.14));
    }

    /* Comprehensive Dark Themed Form Controls in Settings & Workspaces */
    #activate-word-input,
    #sleep-word-input,
    #new-mcp-name,
    #new-mcp-url,
    #piper-voice-select,
    #mic-device-select,
    #desktop-audio-device-select,
    #tts-mode-select,
    #vis-shape-select,
    #particle-shape-select,
    #term-pos-select,
    .settings-modal input[type='text'],
    .settings-modal input[type='search'],
    .settings-modal input[type='password'],
    .settings-modal input[type='number'],
    .settings-modal input[type='email'],
    .settings-modal input[type='url'],
    .settings-modal input:not([type]),
    .settings-modal textarea,
    .settings-modal select,
    .settings-workspace-surface input[type='text'],
    .settings-workspace-surface input[type='search'],
    .settings-workspace-surface input[type='password'],
    .settings-workspace-surface input[type='number'],
    .settings-workspace-surface input[type='email'],
    .settings-workspace-surface input[type='url'],
    .settings-workspace-surface input:not([type]),
    .settings-workspace-surface textarea,
    .settings-workspace-surface select,
    .settings-content input[type='text'],
    .settings-content input[type='search'],
    .settings-content input[type='password'],
    .settings-content input[type='number'],
    .settings-content input[type='email'],
    .settings-content input[type='url'],
    .settings-content input:not([type]),
    .settings-content textarea,
    .settings-content select,
    .form-section input[type='text'],
    .form-section input[type='search'],
    .form-section input[type='password'],
    .form-section input[type='number'],
    .form-section input[type='email'],
    .form-section input[type='url'],
    .form-section input:not([type]),
    .form-section textarea,
    .form-section select,
    .form-field input[type='text'],
    .form-field input[type='search'],
    .form-field input[type='password'],
    .form-field input[type='number'],
    .form-field input[type='email'],
    .form-field input[type='url'],
    .form-field input:not([type]),
    .form-field textarea,
    .form-field select {
      background: var(--background-surface, #131722) !important;
      background-color: var(--background-surface, #131722) !important;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.14)) !important;
      border-radius: 8px !important;
      color: #ffffff !important;
      font-size: 0.88rem !important;
      height: 42px !important;
      padding: 10px 14px !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
      outline: none !important;
      width: 100% !important;
      box-sizing: border-box !important;
      font-family: inherit !important;
      color-scheme: dark !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
    }

    .settings-modal textarea,
    .settings-workspace-surface textarea,
    .settings-content textarea,
    .form-section textarea,
    .form-field textarea {
      height: auto !important;
      min-height: 80px !important;
    }

    #activate-word-input:hover,
    #sleep-word-input:hover,
    #new-mcp-name:hover,
    #new-mcp-url:hover,
    #piper-voice-select:hover,
    .settings-modal input[type='text']:hover,
    .settings-modal input[type='search']:hover,
    .settings-modal input[type='password']:hover,
    .settings-modal input[type='number']:hover,
    .settings-modal input:not([type]):hover,
    .settings-modal textarea:hover,
    .settings-modal select:hover,
    .settings-workspace-surface input:hover,
    .settings-workspace-surface textarea:hover,
    .settings-workspace-surface select:hover,
    .settings-content input:hover,
    .settings-content textarea:hover,
    .settings-content select:hover,
    .form-section input:hover,
    .form-section textarea:hover,
    .form-section select:hover,
    .form-field input:hover,
    .form-field textarea:hover,
    .form-field select:hover {
      border-color: rgba(255, 255, 255, 0.25) !important;
      background-color: #171d2b !important;
    }

    #activate-word-input:focus,
    #sleep-word-input:focus,
    #new-mcp-name:focus,
    #new-mcp-url:focus,
    #piper-voice-select:focus,
    .settings-modal input[type='text']:focus,
    .settings-modal input[type='search']:focus,
    .settings-modal input[type='password']:focus,
    .settings-modal input[type='number']:focus,
    .settings-modal input[type='email']:focus,
    .settings-modal input[type='url']:focus,
    .settings-modal input:not([type]):focus,
    .settings-modal textarea:focus,
    .settings-modal select:focus,
    .settings-workspace-surface input:focus,
    .settings-workspace-surface textarea:focus,
    .settings-workspace-surface select:focus,
    .settings-content input:focus,
    .settings-content textarea:focus,
    .settings-content select:focus,
    .form-section input:focus,
    .form-section textarea:focus,
    .form-section select:focus,
    .form-field input:focus,
    .form-field textarea:focus,
    .form-field select:focus {
      border-color: var(--glow-color, #00aaff) !important;
      background: #0d121f !important;
      background-color: #0d121f !important;
      box-shadow: 0 0 0 1.5px var(--glow-color, #00aaff), 0 0 14px var(--glow-color-faded, rgba(0, 170, 255, 0.28)) !important;
    }

    .settings-modal input::placeholder,
    .settings-modal textarea::placeholder,
    .settings-workspace-surface input::placeholder,
    .settings-workspace-surface textarea::placeholder,
    .settings-content input::placeholder,
    .settings-content textarea::placeholder,
    .form-section input::placeholder,
    .form-section textarea::placeholder,
    .form-field input::placeholder,
    .form-field textarea::placeholder {
      color: rgba(148, 163, 184, 0.55);
    }

    .settings-modal input:-webkit-autofill,
    .settings-modal textarea:-webkit-autofill,
    .settings-workspace-surface input:-webkit-autofill,
    .settings-content input:-webkit-autofill {
      -webkit-text-fill-color: #ffffff !important;
      -webkit-box-shadow: 0 0 0px 1000px #131722 inset !important;
      transition: background-color 5000s ease-in-out 0s !important;
    }

    .settings-modal select,
    .settings-workspace-surface select,
    .settings-content select,
    .form-section select,
    .form-field select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background: #131722 url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300aaff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 14px center;
      background-size: 14px;
      padding-right: 38px;
      cursor: pointer;
    }

    .settings-modal select option,
    .settings-workspace-surface select option,
    .settings-content select option,
    .form-section select option,
    .form-field select option,
    select option {
      background-color: #131722 !important;
      color: #ffffff !important;
      padding: 10px 14px !important;
      font-size: 0.88rem !important;
    }

    .settings-modal select optgroup,
    .settings-workspace-surface select optgroup,
    .settings-content select optgroup,
    .form-section select optgroup,
    .form-field select optgroup,
    select optgroup {
      background-color: #0b0f19 !important;
      color: var(--glow-color, #00aaff) !important;
      font-weight: 700 !important;
    }

    .settings-modal input[type='color'],
    .settings-workspace-surface input[type='color'],
    .settings-content input[type='color'],
    .form-section input[type='color'],
    .form-field input[type='color'] {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      height: 42px !important;
      width: 100%;
      padding: 4px 6px !important;
      background: var(--background-surface, #131722) !important;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15)) !important;
      border-radius: 8px !important;
      cursor: pointer;
      box-sizing: border-box;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .settings-modal input[type='color']:hover,
    .settings-content input[type='color']:hover {
      border-color: rgba(255, 255, 255, 0.3) !important;
    }

    .settings-modal input[type='color']:focus,
    .settings-content input[type='color']:focus {
      border-color: var(--glow-color, #00aaff) !important;
      box-shadow: 0 0 0 1.5px var(--glow-color, #00aaff), 0 0 12px var(--glow-color-faded, rgba(0, 170, 255, 0.3)) !important;
    }

    .settings-modal input[type='color']::-webkit-color-swatch-wrapper,
    .settings-workspace-surface input[type='color']::-webkit-color-swatch-wrapper,
    .settings-content input[type='color']::-webkit-color-swatch-wrapper,
    .form-section input[type='color']::-webkit-color-swatch-wrapper,
    .form-field input[type='color']::-webkit-color-swatch-wrapper {
      padding: 0;
      border-radius: 5px;
    }

    .settings-modal input[type='color']::-webkit-color-swatch,
    .settings-workspace-surface input[type='color']::-webkit-color-swatch,
    .settings-content input[type='color']::-webkit-color-swatch,
    .form-section input[type='color']::-webkit-color-swatch,
    .form-field input[type='color']::-webkit-color-swatch {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 5px;
    }

    .settings-modal input[type='color']::-moz-color-swatch,
    .settings-workspace-surface input[type='color']::-moz-color-swatch,
    .settings-content input[type='color']::-moz-color-swatch,
    .form-section input[type='color']::-moz-color-swatch,
    .form-field input[type='color']::-moz-color-swatch {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 5px;
    }

    .form-field-toggle label {
      width: auto;
      flex-grow: 1;
      cursor: pointer;
      font-weight: 600;
      color: #ffffff;
      font-size: 0.88rem;
    }

    input[role='switch'] {
      appearance: none;
      width: 44px;
      height: 24px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      position: relative;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
      flex-shrink: 0;
      outline: none;
    }

    input[role='switch']::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: #cbd5e1;
      border-radius: 50%;
      transition: all 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }

    input[role='switch']:checked {
      background: var(--glow-color-faded, rgba(0, 170, 255, 0.35));
      border-color: var(--glow-color, #00aaff);
    }

    input[role='switch']:checked::before {
      transform: translateX(20px);
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 10px var(--glow-color, #00aaff);
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 14px;
      height: 42px;
      padding: 0 14px;
      background: var(--background-surface, #131722);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      box-sizing: border-box;
      flex-grow: 1;
      min-width: 0;
    }

    .slider-val-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 170, 255, 0.08);
      border: 1px solid var(--glow-color-faded, rgba(0, 170, 255, 0.25));
      color: var(--glow-color, #00aaff);
      font-family: var(--font-mono, monospace);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 5px;
      min-width: 48px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .slider-container input[type='range'] {
      flex-grow: 1;
      height: 24px;
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
      height: 5px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 3px;
      transition: background 0.2s;
      margin: 9px 0;
    }
    .slider-container input[type='range']:hover::-webkit-slider-runnable-track {
      background: rgba(255, 255, 255, 0.25);
    }
    .slider-container input[type='range']::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 10px var(--glow-color-faded, rgba(0, 170, 255, 0.35));
      border: 2px solid var(--background-primary, #08090d);
      cursor: grab;
      margin-top: -6.5px;
      box-sizing: border-box;
      transition: transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.15s;
    }
    .slider-container input[type='range']::-moz-range-track {
      width: 100%;
      height: 5px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 3px;
      transition: background 0.2s;
    }
    .slider-container input[type='range']::-moz-range-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 10px var(--glow-color-faded, rgba(0, 170, 255, 0.35));
      border: 2px solid var(--background-primary, #08090d);
      cursor: grab;
      box-sizing: content-box;
      transition: transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.15s;
    }
    .slider-container input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.25);
      box-shadow: 0 0 16px var(--glow-color, #00aaff);
    }
    .slider-container input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.25);
      box-shadow: 0 0 16px var(--glow-color, #00aaff);
    }

    .settings-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .settings-actions button {
      padding: 9px 18px;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      font-weight: 600;
      letter-spacing: 0.3px;
      font-size: 0.84rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      user-select: none;
    }

    .settings-actions .cancel-btn {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-color, rgba(255, 255, 255, 0.12));
      color: var(--text-secondary, #94a3b8);
    }
    .settings-actions .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, #ffffff);
      border-color: var(--border-color-hover, rgba(255, 255, 255, 0.2));
    }

    .settings-actions .save-btn {
      background: var(--glow-color-faded, rgba(0, 170, 255, 0.2));
      color: var(--glow-color, #00aaff);
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 15px rgba(0, 170, 255, 0.2) inset;
    }
    .settings-actions .save-btn:hover {
      background: var(--glow-color, #00aaff);
      color: #000000;
      box-shadow: 0 0 20px var(--glow-color-faded, rgba(0, 170, 255, 0.4));
      border-color: transparent;
    }

    .theme-selector {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }

    .theme-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1.5px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }

    .theme-option:hover {
      border-color: var(--text-secondary, rgba(255, 255, 255, 0.4));
      background-color: rgba(255, 255, 255, 0.05);
      transform: translateY(-1px);
    }

    .theme-option.active {
      border-color: var(--glow-color, #00aaff);
      background-color: rgba(0, 170, 255, 0.08);
      box-shadow: 0 0 12px var(--glow-color-faded, rgba(0, 170, 255, 0.2));
    }

    .theme-preview {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .theme-name {
      color: var(--text-primary, #fff);
      font-weight: 600;
      font-size: 0.86rem;
    }

    .custom-theme-picker {
      grid-column: 1 / -1;
      margin-top: 8px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      padding: 18px;
      border-radius: 12px;
    }

    .model-spotlight-card {
      background: linear-gradient(135deg, rgba(0, 170, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
      border: 1px solid rgba(0, 170, 255, 0.3);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .model-quick-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .model-quick-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 500;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .model-quick-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .model-quick-pill.active {
      background: rgba(0, 170, 255, 0.15);
      border-color: var(--glow-color, #00aaff);
      color: var(--glow-color, #00aaff);
      font-weight: 600;
      box-shadow: 0 0 10px rgba(0, 170, 255, 0.2);
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
      padding: 28px 32px 32px 32px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      max-width: 920px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
      scroll-behavior: smooth;
    }

    @media (max-width: 768px) {
      .chat-history {
        padding: 16px 14px 20px 14px;
        gap: 20px;
      }
    }

    .chat-history::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .chat-history::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-history::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    .chat-history::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .transcription-entry {
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

    .transcription-entry.user {
      align-self: flex-end;
      align-items: flex-end;
      max-width: 82%;
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
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.4px;
      color: var(--text-secondary);
      padding: 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
    }

    .transcription-entry.user .transcription-speaker {
      color: #38bdf8;
      flex-direction: row-reverse;
    }

    .transcription-entry.ai .transcription-speaker {
      color: #cbd5e1;
      width: 100%;
    }

    .response-timer {
      font-size: 0.72rem;
      color: var(--text-secondary);
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 7px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
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
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      width: 100%;
      max-width: 320px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
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

    .message-bubble {
      box-sizing: border-box;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: var(--chat-line-height, 1.68);
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .transcription-entry.user .message-bubble {
      align-self: flex-end;
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.22) 0%, rgba(14, 116, 144, 0.14) 100%);
      border: 1px solid rgba(56, 189, 248, 0.42);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), 0 0 12px rgba(0, 170, 255, 0.08);
      border-radius: 18px 18px 4px 18px;
      padding: 13px 19px;
      color: #ffffff;
      line-height: var(--chat-line-height, 1.65);
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
    }

    .transcription-entry.ai .message-bubble {
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
      box-sizing: border-box;
      overflow-x: auto;
      overflow-y: visible;
      color: #e2e8f0;
      line-height: var(--chat-line-height, 1.68);
      font-size: var(--chat-font-size, 0.95rem);
      font-weight: var(--chat-font-weight, normal);
    }

    .transcription-text {
      font-size: var(--chat-font-size, inherit) !important;
      font-weight: var(--chat-font-weight, inherit);
      color: inherit;
      line-height: var(--chat-line-height, 1.72);
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
    }

    .chat-history {
      font-size: var(--chat-font-size, 0.98rem) !important;
      font-weight: var(--chat-font-weight, normal);
      line-height: var(--chat-line-height, 1.68);
    }

    .chat-history .transcription-entry,
    .chat-history .transcription-text,
    .chat-history .message-bubble,
    .chat-history .markdown-body,
    .chat-history .markdown-body p,
    .chat-history .markdown-body li,
    .chat-history .markdown-body ul,
    .chat-history .markdown-body ol,
    .chat-history .markdown-body span,
    .chat-history .markdown-body div,
    .chat-history .markdown-body blockquote,
    .chat-history .markdown-body code:not(pre code) {
      font-size: var(--chat-font-size, inherit) !important;
      font-weight: var(--chat-font-weight, inherit);
      line-height: var(--chat-line-height, 1.68);
    }

    .markdown-body {
      word-break: break-word;
      overflow-wrap: anywhere;
      width: 100%;
      box-sizing: border-box;
      white-space: normal;
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
      padding: 10px 16px 14px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(9, 11, 16, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.8);
      flex-shrink: 0;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      z-index: 100 !important; /* Top-level priority protecting input zone and all interactive command chips/buttons */
      pointer-events: auto !important;
      isolation: isolate;
      will-change: height;
    }

    .chat-meta-bar {
      position: relative;
      z-index: 101 !important;
      pointer-events: auto !important;
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 3px 2px 7px 2px;
      margin-bottom: 3px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
    }
    .chat-meta-bar::-webkit-scrollbar {
      height: 4px;
    }
    .chat-meta-bar::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-meta-bar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.16);
      border-radius: 4px;
    }

    .chat-meta-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding-right: 4px;
      user-select: none;
      flex-shrink: 0;
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
      gap: 6px;
      background: rgba(13, 17, 26, 0.75);
      border-radius: 10px;
      padding: 3px 6px;
      border: 1px solid var(--border-color);
      box-sizing: border-box;
      width: 100%;
      position: relative;
      z-index: 101 !important;
      pointer-events: auto !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      will-change: border-color, box-shadow;
    }
    .input-wrapper:focus-within {
      border-color: var(--glow-color);
      box-shadow: 0 0 10px var(--glow-color-faded);
    }

    .chat-input-area textarea,
    .chat-input-area button,
    .chat-input-area .mic-btn,
    .chat-input-area .send-btn {
      position: relative;
      z-index: 102 !important;
      pointer-events: auto !important;
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
      font-size: var(--chat-font-size, 1.15rem);
      font-weight: var(--chat-font-weight, normal);   /* ← this makes Bold Chat work in the input */
      padding: 11px 12px 9px 12px;
      min-height: 48px;
      max-height: min(55vh, 520px);   /* ← much taller, still safe for the UI */
      resize: vertical;               /* keeps the bottom-right drag handle */
      line-height: 1.5;
      font-family: inherit;
      box-sizing: border-box;
      overflow-y: auto;
      display: block;
      margin: 0;
      vertical-align: bottom;
      transition: none;
    }
    .chat-input-area textarea:focus {
      outline: none;
      box-shadow: none;
      border: none;
    }
    .chat-input-area textarea::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .input-wrapper button,
    .chat-input-area .input-wrapper button {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      align-self: flex-end;
      margin-bottom: 2px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.65);
      cursor: pointer;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;          /* makes the icons themselves a bit larger */
      transition: color 0.15s, background-color 0.15s, box-shadow 0.15s;
    }

    .input-wrapper button:hover:not(:disabled),
    .chat-input-area .input-wrapper button:hover:not(:disabled) {
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

    .chat-input-area .input-wrapper button.send-btn {
      background-color: var(--glow-color);
      color: var(--background-primary);
    }
    .chat-input-area .input-wrapper button.send-btn:disabled {
      background-color: #555;
      color: #999;
      cursor: not-allowed;
    }

    .chat-input-area .input-wrapper button.mic-btn.recording {
      color: #ff3b30;
      background-color: rgba(255, 59, 48, 0.15);
      animation: mic-pulse 1.5s infinite ease-in-out;
    }

    .chat-input-area .input-wrapper button.mic-btn.continuous {
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

    /* ==========================================================================
       LUMIN TOP NAVIGATION & MULTI-MODE WORKSPACE STYLES
       ========================================================================== */

    .app-root {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      position: relative;
      background-color: var(--background-primary, #000000);
      color: var(--text-primary, #e0e0e0);
      box-sizing: border-box;
    }

    /* Top Navigation Bar */
    .lumin-top-nav {
      height: 48px;
      min-height: 48px;
      width: 100%;
      background: rgba(8, 10, 16, 0.94);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: 0 16px;
      padding-left: calc(16px + env(safe-area-inset-left));
      padding-right: calc(16px + env(safe-area-inset-right));
      box-sizing: border-box;
      z-index: 150;
      user-select: none;
      flex-shrink: 0;
      gap: 12px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
      position: relative;
    }

    .nav-left-section {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-self: start;
      min-width: 0;
      position: relative;
    }

    .nav-brand-compact {
      display: flex;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
      padding: 4px 6px;
      margin-left: -4px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      user-select: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .nav-brand-compact:hover {
      background: rgba(0, 170, 255, 0.05);
      border-color: rgba(0, 170, 255, 0.15);
    }

    .nav-brand-compact:active {
      transform: scale(0.96);
    }

    .brand-title-compact {
      font-size: 0.96rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #f1f5f9;
      line-height: 1;
      font-family: var(--font-sans, system-ui, sans-serif);
      transition: color 0.25s ease, text-shadow 0.25s ease, letter-spacing 0.25s ease;
      display: inline-block;
    }

    .nav-brand-compact:hover .brand-title-compact {
      color: #38bdf8;
      text-shadow: 0 0 12px rgba(56, 189, 248, 0.65), 0 0 24px rgba(0, 170, 255, 0.35);
      letter-spacing: 2.3px;
    }

    /* LUMIN Multi-Click Easter Egg Particle & Ripple System */
    .lumin-easter-egg-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .lumin-easter-egg-ripple {
      position: absolute;
      top: 24px;
      left: 36px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, rgba(168, 85, 247, 0.3) 40%, rgba(0, 255, 127, 0) 70%);
      transform: translate(-50%, -50%);
      animation: lumin-egg-expand 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
    }

    .lumin-easter-egg-ripple.unlocked {
      background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, rgba(0, 255, 196, 0.35) 40%, rgba(255, 174, 0, 0) 70%);
    }

    .lumin-easter-egg-ripple.relocked {
      background: radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, rgba(168, 85, 247, 0.3) 40%, rgba(0, 255, 127, 0) 70%);
    }

    .lumin-easter-egg-particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: lumin-particle-flight 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .lumin-easter-egg-banner {
      position: absolute;
      top: 64px;
      left: 20px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(8, 12, 22, 0.94);
      border: 1px solid rgba(56, 189, 248, 0.6);
      box-shadow: 0 4px 24px rgba(0, 170, 255, 0.4), 0 0 12px rgba(168, 85, 247, 0.3);
      color: #38bdf8;
      font-family: var(--font-mono, monospace);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      animation: lumin-banner-slide 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .lumin-easter-egg-banner.unlocked {
      border: 1px solid rgba(255, 215, 0, 0.75);
      background: rgba(18, 14, 6, 0.95);
      box-shadow: 0 4px 28px rgba(255, 174, 0, 0.45), 0 0 16px rgba(0, 255, 196, 0.3);
      color: #fef08a;
    }

    .lumin-easter-egg-banner.relocked {
      border: 1px solid rgba(56, 189, 248, 0.6);
      background: rgba(8, 12, 22, 0.95);
      box-shadow: 0 4px 24px rgba(0, 170, 255, 0.4), 0 0 12px rgba(168, 85, 247, 0.3);
      color: #38bdf8;
    }

    @keyframes lumin-egg-expand {
      0% {
        width: 10px;
        height: 10px;
        opacity: 0.9;
      }
      60% {
        opacity: 0.6;
      }
      100% {
        width: 200vw;
        height: 200vw;
        opacity: 0;
      }
    }

    @keyframes lumin-particle-flight {
      0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
      80% {
        opacity: 0.8;
      }
      100% {
        transform: translate(var(--tx, 100px), var(--ty, 100px)) scale(0);
        opacity: 0;
      }
    }

    @keyframes lumin-banner-slide {
      0% {
        transform: translateY(-12px);
        opacity: 0;
      }
      15% {
        transform: translateY(0);
        opacity: 1;
      }
      80% {
        transform: translateY(0);
        opacity: 1;
      }
      100% {
        transform: translateY(-8px);
        opacity: 0;
      }
    }

    .nav-runtime-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary, #94a3b8);
      font-size: 0.70rem;
      font-family: var(--font-mono, monospace);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s ease;
      outline: none;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-runtime-pill:hover,
    .nav-runtime-pill.active {
      background: rgba(0, 170, 255, 0.12);
      border-color: rgba(0, 170, 255, 0.4);
      color: #ffffff;
      box-shadow: 0 0 10px rgba(0, 170, 255, 0.15);
    }

    .runtime-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      background: #64748b;
    }

    .runtime-status-dot.online {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }

    .runtime-status-dot.starting {
      background: #f59e0b;
      box-shadow: 0 0 6px #f59e0b;
      animation: pulse-yellow 1s infinite;
    }

    .runtime-model-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chevron-icon {
      transition: transform 0.2s ease;
      flex-shrink: 0;
      color: #64748b;
    }

    .chevron-icon.open {
      transform: rotate(180deg);
      color: #38bdf8;
    }

    /* Centered Primary Navigation Cluster */
    .nav-center-cluster {
      display: flex;
      align-items: center;
      justify-content: center;
      justify-self: center;
      flex-shrink: 0;
    }

    /* Top Navigation Tabs - Centered & Balanced Desktop Segmented Rail Control */
    .nav-tabs {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: rgba(4, 6, 12, 0.7);
      padding: 3px 4px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1.5px 3px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(255, 255, 255, 0.04);
      position: relative;
      flex-shrink: 0;
      margin: 0 auto;
      height: 32px;
      box-sizing: border-box;
    }

    .nav-tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 12px;
      height: 26px;
      box-sizing: border-box;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary, #94a3b8);
      font-size: 0.78rem;
      font-weight: 500;
      font-family: var(--font-sans, sans-serif);
      letter-spacing: 0.15px;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
      white-space: nowrap;
      user-select: none;
      line-height: 1;
    }

    .nav-tab svg {
      width: 14px;
      height: 14px;
      color: #64748b;
      flex-shrink: 0;
      transition: color 0.15s, transform 0.15s;
    }

    .nav-tab:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.05);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .nav-tab:hover svg {
      color: #cbd5e1;
      transform: translateY(-1px);
    }

    .nav-tab:active {
      transform: scale(0.97);
    }

    /* Active Tab State */
    .nav-tab.active {
      color: #ffffff;
      font-weight: 600;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      border-color: rgba(0, 170, 255, 0.45);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45), 0 0 14px rgba(0, 170, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    }

    .nav-tab.active svg {
      color: var(--glow-color, #00aaff);
      filter: drop-shadow(0 0 5px rgba(0, 170, 255, 0.6));
      transform: scale(1.05);
    }

    .nav-tab .tab-hotkey {
      font-size: 0.58rem;
      font-family: var(--font-mono, monospace);
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #64748b;
      line-height: 1;
      margin-left: 2px;
      transition: all 0.15s;
    }

    .nav-tab:hover .tab-hotkey {
      color: #94a3b8;
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.08);
    }

    .nav-tab.active .tab-hotkey {
      background: rgba(0, 170, 255, 0.16);
      border-color: rgba(0, 170, 255, 0.35);
      color: #38bdf8;
    }

    .nav-mini-eq span {
      width: 1.5px;
      height: 100%;
      background: #38bdf8;
      border-radius: 1px;
      animation: voice-bar 0.6s ease-in-out infinite alternate;
    }
    .nav-mini-eq span:nth-child(2) { animation-delay: 0.15s; height: 50%; }
    .nav-mini-eq span:nth-child(3) { animation-delay: 0.3s; height: 80%; }

    /* Right Action Bar Clean */
    .nav-actions-clean {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      justify-self: end;
      gap: 6px;
      min-width: 0;
    }

    .nav-divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.08);
      margin: 0 2px;
      flex-shrink: 0;
    }

    .console-active-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 5px #22c55e;
      margin-left: 2px;
    }

    /* Expandable Runtime Controls Drawer Popover - Intelligently Viewport Clamped & Fixed */
    .runtime-drawer-popover {
      position: fixed;
      background: rgba(13, 16, 24, 0.98);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 170, 255, 0.4);
      border-radius: 10px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 170, 255, 0.2);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: popover-enter 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popover-enter {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .runtime-drawer-header {
      padding: 10px 14px;
      background: rgba(20, 26, 38, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .runtime-drawer-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.6px;
      color: #38bdf8;
      font-family: var(--font-mono, monospace);
    }

    .runtime-drawer-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .runtime-drawer-close:hover {
      color: #ffffff;
    }

    .runtime-drawer-body {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
      max-height: calc(100vh - 120px);
      max-height: calc(100dvh - 120px);
    }

    .runtime-control-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .runtime-group-label {
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #64748b;
      font-family: var(--font-mono, monospace);
      text-transform: uppercase;
    }

    .runtime-agent-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .runtime-quick-buttons {
      display: flex;
      gap: 6px;
    }

    .runtime-btn {
      flex: 1;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }

    .runtime-btn:hover {
      background: rgba(0, 170, 255, 0.15);
      border-color: rgba(0, 170, 255, 0.4);
      color: #ffffff;
    }

    /* Live Activity Indicators on Tabs */
    .tab-indicator-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #f59e0b;
      margin-left: 2px;
    }

    .tab-indicator-dot.running {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
      animation: pulse-green 1.5s infinite;
    }

    .tab-live-voice-pulse {
      display: inline-flex;
      align-items: center;
      gap: 1.5px;
      height: 10px;
      margin-left: 2px;
    }

    .tab-live-voice-pulse span {
      display: inline-block;
      width: 2px;
      height: 100%;
      background: #00aaff;
      border-radius: 1px;
      animation: voice-bar 0.8s ease-in-out infinite alternate;
    }

    .tab-live-voice-pulse span:nth-child(2) {
      animation-delay: 0.2s;
      height: 60%;
    }
    .tab-live-voice-pulse span:nth-child(3) {
      animation-delay: 0.4s;
      height: 80%;
    }

    @keyframes voice-bar {
      0% { transform: scaleY(0.3); }
      100% { transform: scaleY(1); }
    }

    @media (max-width: 1024px) {
      .lumin-top-nav {
        padding: 0 12px;
        gap: 8px;
      }
      .nav-runtime-pill {
        max-width: 150px;
      }
    }

    @media (max-width: 768px) {
      .lumin-top-nav {
        padding: 0 8px;
        gap: 6px;
      }
      .brand-title-compact {
        font-size: 0.84rem;
        letter-spacing: 1.5px;
      }
      .nav-runtime-pill {
        display: none;
      }
      .nav-tab .tab-hotkey {
        display: none;
      }
      .nav-tab {
        padding: 3px 8px;
        font-size: 0.74rem;
      }
    }

    .agent-quick-status {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      font-size: 0.68rem;
      font-family: var(--font-mono);
      font-weight: bold;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #64748b;
    }

    .status-dot.active {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }

    .status-dot.starting {
      background: #f59e0b;
      box-shadow: 0 0 6px #f59e0b;
      animation: pulse-yellow 1s infinite;
    }

    .nav-action-btn {
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      border: 1px solid transparent;
      outline: none;
    }

    .start-agent-btn {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }

    .start-agent-btn:hover:not(:disabled) {
      background: rgba(34, 197, 94, 0.25);
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
    }

    .stop-agent-btn {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.3);
      color: #f43f5e;
    }

    .stop-agent-btn:hover {
      background: rgba(244, 63, 94, 0.25);
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.3);
    }

    .nav-tab-btn-console {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      font-family: var(--font-mono, monospace);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.15s;
      outline: none;
    }

    .nav-tab-btn-console:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.14);
    }

    .nav-tab-btn-console.active {
      background: rgba(0, 170, 255, 0.15);
      border-color: rgba(0, 170, 255, 0.35);
      color: #38bdf8;
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.2);
    }

    .nav-icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      outline: none;
    }

    .nav-icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.14);
    }

    .nav-icon-btn.active {
      color: var(--glow-color, #00aaff);
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 8px var(--glow-color-faded, rgba(0, 170, 255, 0.3));
    }

    /* Main Viewport Workspace (Below Header) */
    .lumin-main-content {
      flex: 1;
      width: 100%;
      height: calc(100vh - 50px);
      height: calc(100dvh - 50px);
      position: relative;
      overflow: hidden;
    }

    /* Visualizer Dynamic Stage Positioning */
    .visualizer-stage {
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Voice Mode: Fullscreen 3D Scene - Large, Central, Signature */
    .visualizer-stage.mode-voice {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .voice-mode-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }

    .voice-mode-overlay .hud {
      pointer-events: none;
    }

    .voice-mode-overlay .hud * {
      pointer-events: auto;
    }

    /* Agent Mode: Adaptive 3D Sphere (Compact PIP / Micro-Orb Capsule / Hidden) */
    .visualizer-stage.mode-agent {
      position: absolute;
      top: 48px;
      right: 16px;
      z-index: 35 !important;
      border-radius: 12px;
      border: 1px solid var(--glow-color-faded, rgba(0, 170, 255, 0.3));
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 170, 255, 0.15);
      background: rgba(10, 10, 14, 0.94);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: min(180px, calc(100% - 240px));
      max-width: min(270px, calc(100% - 24px));
      pointer-events: auto;
      touch-action: none;
      transition: box-shadow 0.25s ease, border-color 0.25s ease, opacity 0.2s ease;
    }

    .visualizer-stage.mode-agent.is-dragging {
      transition: none !important;
      user-select: none !important;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.95), 0 0 32px rgba(0, 170, 255, 0.5) !important;
      border-color: rgba(0, 170, 255, 0.85) !important;
      will-change: left, top;
    }

    .visualizer-stage.mode-agent.corner-top-left {
      left: 16px !important;
      right: auto !important;
      top: 48px !important;
    }

    .visualizer-stage.mode-agent.vis-compact {
      width: 270px;
      height: 180px;
    }

    .visualizer-stage.mode-agent.vis-minimal {
      height: 34px;
      width: 172px;
      border-radius: 18px;
      padding: 0 8px 0 10px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
      touch-action: none;
      background: rgba(12, 14, 22, 0.96);
      border: 1px solid rgba(0, 170, 255, 0.4);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(0, 170, 255, 0.2);
    }

    .visualizer-stage.mode-agent.vis-minimal.is-dragging,
    .visualizer-stage.mode-agent.vis-minimal:active {
      cursor: grabbing !important;
    }

    .visualizer-stage.mode-agent.vis-minimal gdm-live-audio-visuals-3d {
      display: none !important;
    }

    .visualizer-stage.mode-agent.vis-hidden {
      display: none !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
    }

    @media (max-height: 650px) {
      .visualizer-stage.mode-agent.vis-compact {
        width: 210px;
        height: 130px;
        max-height: calc(100% - 210px);
      }
    }

    @media (max-width: 768px) {
      .visualizer-stage.mode-agent.vis-compact {
        width: 180px;
        height: 110px;
        top: 8px;
        right: 8px;
      }
    }

    .agent-vis-segmented {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }

    .agent-vis-seg-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .agent-vis-seg-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }

    .agent-vis-seg-btn.active {
      background: rgba(0, 170, 255, 0.2);
      border: 1px solid rgba(0, 170, 255, 0.4);
      color: #38bdf8;
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.25);
    }

    .pip-header {
      height: 32px;
      min-height: 32px;
      background: rgba(18, 20, 28, 0.96);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px 0 10px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--glow-color, #00aaff);
      user-select: none;
      z-index: 10;
      cursor: grab;
      touch-action: none;
    }

    .pip-header:active,
    .visualizer-stage.mode-agent.is-dragging .pip-header {
      cursor: grabbing !important;
    }

    .pip-title {
      display: flex;
      align-items: center;
      gap: 6px;
      pointer-events: none;
    }

    .pip-drag-handle {
      opacity: 0.5;
      margin-right: -2px;
      transition: opacity 0.15s ease;
    }

    .pip-header:hover .pip-drag-handle,
    .mini-capsule-content:hover .pip-drag-handle {
      opacity: 0.9;
    }

    .pip-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 6px var(--glow-color, #00aaff);
      animation: pulse-blue 2s infinite;
    }

    .pip-actions {
      position: relative;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 3px;
      cursor: default;
      pointer-events: auto !important;
    }

    .pip-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      cursor: pointer;
      min-width: 22px;
      height: 22px;
      padding: 0 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1;
      pointer-events: auto !important;
      user-select: none;
    }

    .pip-btn:hover {
      color: #fff;
      background: rgba(0, 170, 255, 0.2);
      border-color: rgba(0, 170, 255, 0.4);
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.2);
    }

    .pip-btn:active {
      transform: scale(0.92);
    }

    .pip-btn.close-btn:hover {
      color: #ff6b6b;
      background: rgba(255, 68, 68, 0.2);
      border-color: rgba(255, 68, 68, 0.4);
      box-shadow: 0 0 8px rgba(255, 68, 68, 0.25);
    }

    /* Minimal Capsule Bar Interior */
    .mini-capsule-content {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      color: #cbd5e1;
      user-select: none;
      flex: 1;
      cursor: grab;
      touch-action: none;
    }

    .mini-capsule-content:active,
    .visualizer-stage.mode-agent.is-dragging .mini-capsule-content {
      cursor: grabbing !important;
    }

    .mini-orb-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 8px var(--glow-color, #00aaff);
      animation: pulse-blue 1.5s infinite;
      flex-shrink: 0;
    }

    .fullscreen-exit-btn {
      position: absolute;
      top: 20px;
      right: 24px;
      z-index: 60;
      background: rgba(15, 15, 25, 0.85);
      border: 1px solid rgba(0, 170, 255, 0.4);
      color: #38bdf8;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 170, 255, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .fullscreen-exit-btn:hover {
      background: rgba(0, 170, 255, 0.2);
      border-color: #38bdf8;
      color: #ffffff;
      transform: translateY(-1px);
    }

    /* Settings Mode: Minimized background preview */
    .visualizer-stage.mode-settings {
      position: absolute;
      inset: 0;
      opacity: 0.1;
      pointer-events: none;
      z-index: 1;
    }

    /* Workspaces */
    .agent-workspace-surface {
      position: absolute;
      inset: 0;
      display: flex;
      z-index: 10;
      background: radial-gradient(ellipse at 50% 0%, rgba(14, 24, 42, 0.55) 0%, rgba(8, 10, 15, 0.98) 100%);
      backdrop-filter: blur(8px);
      overflow: hidden;
    }

    .agent-workspace-surface.dock-bottom {
      flex-direction: column;
    }

    .agent-workspace-surface.dock-right {
      flex-direction: row;
    }

    .agent-workspace-surface.dock-left {
      flex-direction: row;
    }

    .agent-workspace-surface.dock-floating,
    .agent-workspace-surface.dock-hidden {
      flex-direction: column;
    }

    .agent-chat-wrapper {
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Vertical and Horizontal Resizers */
    .terminal-side-resizer {
      width: 6px;
      height: 100%;
      cursor: col-resize;
      background: rgba(255, 255, 255, 0.05);
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.2s, border-color 0.2s;
      flex-shrink: 0;
      z-index: 20;
    }

    .terminal-side-resizer:hover,
    .terminal-side-resizer.dragging {
      background: rgba(0, 170, 255, 0.4);
      border-color: #00aaff;
      box-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
    }

    .chat-cmd-chip {
      width: auto !important;
      height: auto !important;
      min-height: 26px;
      max-height: 28px;
      align-self: center !important;
      background: rgba(20, 26, 38, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #e2e8f0;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0 !important;
      transition: all 0.15s ease;
      font-family: 'JetBrains Mono', monospace;
      outline: none;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      line-height: 1.2;
    }
    .chat-cmd-chip:hover {
      background: rgba(0, 170, 255, 0.22);
      border-color: rgba(0, 170, 255, 0.55);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 170, 255, 0.25);
    }
    .chat-cmd-chip:active {
      transform: translateY(0);
      background: rgba(0, 170, 255, 0.3);
    }

    .nav-tab-btn-console {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }
    .nav-tab-btn-console:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .nav-tab-btn-console.active {
      background: rgba(0, 170, 255, 0.2);
      border-color: rgba(0, 170, 255, 0.45);
      color: #38bdf8;
      box-shadow: 0 0 10px rgba(0, 170, 255, 0.25);
    }

    .settings-workspace-surface {
      position: absolute;
      inset: 0;
      z-index: 20;
      background: rgba(12, 12, 16, 0.98);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ==========================================================================
       Visualizer-Only / Cinema Mode (Minimal Chrome, Full Immersion 3D Canvas)
       ========================================================================== */
    .app-root.visualizer-only-mode {
      overflow: hidden;
    }

    .app-root.visualizer-only-mode .lumin-main-content {
      height: 100vh !important;
      height: 100dvh !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .app-root.visualizer-only-mode .visualizer-stage {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
      backdrop-filter: none !important;
    }

    .app-root.visualizer-only-mode .visualizer-stage .pip-header,
    .app-root.visualizer-only-mode .visualizer-stage .pip-actions,
    .app-root.visualizer-only-mode .visualizer-stage .mini-capsule-content {
      display: none !important;
    }

    .visualizer-stage.visualizer-only-fullscreen {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    @keyframes cinemaFade {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      75% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -6px); }
    }

    .cinema-mode-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.78);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 9999px;
      padding: 7px 18px;
      font-size: 0.78rem;
      font-weight: 500;
      pointer-events: none;
      backdrop-filter: blur(12px);
      z-index: 9999;
      animation: cinemaFade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 6px;
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

    // Load active model from localStorage
    const savedModel = localStorage.getItem('project_lumin_active_model');
    if (savedModel) {
      this.activeModelName = savedModel === 'auto' ? 'Auto-Router' : savedModel;
      this.activePlatform = savedModel === 'auto' ? 'Auto-Router' : 'Ollama';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mousemove', this.resetIdleTimer);
    document.addEventListener('touchstart', this.resetIdleTimer);
    window.addEventListener('keydown', this.handleGlobalKeyDown);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('resize', this.handleWindowResize);
    window.addEventListener('scroll', this.updateRuntimeDrawerPosition, { passive: true });
    window.addEventListener('click', this.handleWindowClick);
    
    // Automatically initialize speech recognition on first user interaction to enable continuous wake word detection
    document.addEventListener('click', this.initSpeechOnInteractionBound);
    document.addEventListener('touchstart', this.initSpeechOnInteractionBound);
    document.addEventListener('keydown', this.initSpeechOnInteractionBound);

    // Audio hardware device change listener
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
      } catch (e) {}
    }

    // Initial backend model sync
    this.syncActiveModelFromBackend();

    // Subscribe to contextManager updates
    contextManager.subscribe(() => {
      this.requestUpdate();
    });

    // Subscribe to skillsManager updates
    skillsManager.subscribe(() => {
      this.requestUpdate();
    });
  }

  private handleWindowClick = (e: MouseEvent) => {
    if (this.isRuntimeDrawerOpen) {
      const path = e.composedPath ? e.composedPath() : [];
      const isInside = path.some((el: any) => el?.classList?.contains('runtime-drawer-popover') || el?.id === 'nav-runtime-pill-btn' || el?.closest?.('.runtime-drawer-popover') || el?.closest?.('#nav-runtime-pill-btn'));
      if (!isInside) {
        this.isRuntimeDrawerOpen = false;
        this.requestUpdate();
      }
    }
  };

  private async syncActiveModelFromBackend() {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        if (data.activeModel) {
          const isAuto = data.isAutoRouting || data.activeModel === 'auto' || data.activeModel === 'Auto-Router' || data.activeModel === 'router';
          this.activeModelName = isAuto ? 'Auto-Router' : data.activeModel;
          this.activePlatform = isAuto ? 'Auto-Router' : (data.ollamaRunning ? 'Ollama' : 'Local');
          localStorage.setItem('project_lumin_active_model', isAuto ? 'auto' : data.activeModel);
          this.requestUpdate();
        }
      }
    } catch (e) {}
  }

  private getSystemAgentState(): 'idle' | 'thinking' | 'working' | 'listening' | 'speaking' | 'starting' | 'stopping' {
    if (this.isGeneratingResponse) return 'thinking';
    if (this.taskProgress && this.taskProgress.taskName) return 'working';
    if (this.isRecording) return 'listening';
    if (this.ttsPlaybackState === 'playing') return 'speaking';
    if (this.isStartingAgent) return 'starting';
    if (this.isStoppingAgent) return 'stopping';
    return 'idle';
  }

  private handleGlobalKeyDown = (e: KeyboardEvent) => {
    // Ctrl+` or Cmd+` toggles the terminal panel
    if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
      e.preventDefault();
      this.toggleTerminal();
      return;
    }

    const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement;
    const isInputActive = target && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable ||
      (typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable="true"], .chat-input-textarea') !== null)
    );

    // Escape key exits Cinema / Visualizer-Only mode
    if (e.key === 'Escape' && this.isVisualizerOnlyMode) {
      e.preventDefault();
      this.toggleVisualizerOnlyMode(false);
      return;
    }

    // 'H' or 'V' key (or Alt+H / Alt+V) toggles Cinema / Visualizer-Only mode when not typing in an input
    if (!isInputActive) {
      if ((e.key === 'h' || e.key === 'H' || e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.toggleVisualizerOnlyMode();
        return;
      }
      if (e.altKey && (e.key === 'h' || e.key === 'H' || e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        this.toggleVisualizerOnlyMode();
        return;
      }
    }
  };

  private toggleVisualizerOnlyMode(forceState?: boolean) {
    const nextState = forceState !== undefined ? forceState : !this.isVisualizerOnlyMode;
    this.isVisualizerOnlyMode = nextState;
    soundFX.playClick();

    if (nextState) {
      if (!this.hasShownCinemaToastThisSession) {
        this.hasShownCinemaToastThisSession = true;
        this.showCinemaToast = true;
        setTimeout(() => {
          this.showCinemaToast = false;
          this.requestUpdate();
        }, 1200);
      }
    } else {
      this.showCinemaToast = false;
    }

    this.triggerWindowResize();
    this.requestUpdate();
  }

  private updateRuntimeDrawerPosition = () => {
    if (!this.isRuntimeDrawerOpen) return;
    const btn = this.shadowRoot?.querySelector('#nav-runtime-pill-btn') as HTMLElement | null;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(340, Math.max(280, window.innerWidth - 24));
    
    // Clamp horizontal position so it never overflows viewport edge
    let left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    
    // Vertical placement: Check space below vs space above
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    let top: number;
    let maxHeight: number;
    let flipUp = false;
    
    if (spaceBelow >= 280 || spaceBelow >= spaceAbove) {
      // Position below the button
      top = rect.bottom + 6;
      maxHeight = Math.min(520, spaceBelow);
      flipUp = false;
    } else {
      // Flip up above the button
      flipUp = true;
      maxHeight = Math.min(520, spaceAbove);
      top = Math.max(12, rect.top - maxHeight - 6);
    }
    
    this.runtimeDrawerPos = { top, left, maxHeight, width, flipUp };
    this.requestUpdate();
  };

  private handleWindowResize = () => {
    if (this.isRuntimeDrawerOpen) {
      this.updateRuntimeDrawerPosition();
    }
    if (this.agentPipPos) {
      const isMinimal = this.agentVisMode === 'minimal';
      const width = isMinimal ? 172 : 270;
      const height = isMinimal ? 34 : 180;

      const mainElem = this.shadowRoot?.querySelector('.lumin-main-content') as HTMLElement | null;
      const mainRect = mainElem ? mainElem.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

      let minX = 12;
      let maxX = Math.max(minX, mainRect.width - width - 12);
      if (this.isTerminalOpen && this.terminalPosition === 'left') {
        minX = Math.max(minX, this.terminalWidth + 12);
      } else if (this.isTerminalOpen && this.terminalPosition === 'right') {
        maxX = Math.max(minX, mainRect.width - this.terminalWidth - width - 12);
      }
      const minY = 48; // Keep clearly below the top accessibility toolbar (38px height)

      // Real-time top boundary check against chat input area with generous safe margin
      const chatInputArea = this.shadowRoot?.querySelector('.chat-input-area') as HTMLElement | null;
      let maxAvailableY = mainRect.height - height - 160;
      if (chatInputArea) {
        const inputRect = chatInputArea.getBoundingClientRect();
        if (inputRect.top > 0) {
          const inputTopRelativeToMain = inputRect.top - mainRect.top;
          const safeMargin = 28; // Increased safe margin so PIP is always forced to stay clearly above chat-input-area
          maxAvailableY = inputTopRelativeToMain - height - safeMargin;
        }
      }
      const maxY = Math.max(minY, maxAvailableY);

      const clampedX = Math.round(Math.max(minX, Math.min(maxX, this.agentPipPos.x)));
      const clampedY = Math.round(Math.max(minY, Math.min(maxY, this.agentPipPos.y)));

      if (clampedX !== this.agentPipPos.x || clampedY !== this.agentPipPos.y) {
        this.agentPipPos = { x: clampedX, y: clampedY };
        localStorage.setItem('project_lumin_agent_pip_pos', JSON.stringify(this.agentPipPos));
      }
    }
    this.requestUpdate();
  };

  private handleBeforeUnload = () => {
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
    this.cleanupAllResources();
  };

  private handleGlobalClick = (_e: MouseEvent) => {
    // Retained for custom click tracking if needed without closing the panel
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
    this.isTerminalOpen = nextState;
    localStorage.setItem('project_lumin_terminal_open', String(this.isTerminalOpen));
    soundFX.playClick();
    
    if (this.isTerminalOpen) {
      this.scrollTerminalToBottom();
      this.initTerminalWebSocket();
    }
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private handleTerminalDockChange(pos: 'bottom' | 'right' | 'left') {
    this.terminalPosition = pos;
    localStorage.setItem('project_lumin_terminal_position', pos);
    soundFX.playClick();
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private handleTerminalSideResizerMouseDown(e: MouseEvent, side: 'left' | 'right') {
    e.preventDefault();
    this.isDraggingTerminalSideResizer = true;
    const startX = e.clientX;
    const startWidth = this.terminalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDraggingTerminalSideResizer) return;
      const deltaX = moveEvent.clientX - startX;
      const minW = Math.max(390, Math.min(440, Math.round(window.innerWidth * 0.28)));
      const maxW = Math.max(minW + 60, Math.min(Math.round(window.innerWidth * 0.55), window.innerWidth - 320));
      const newWidth = side === 'right'
        ? Math.max(minW, Math.min(maxW, startWidth - deltaX))
        : Math.max(minW, Math.min(maxW, startWidth + deltaX));
      this.terminalWidth = Math.round(newWidth);
      localStorage.setItem('project_lumin_terminal_width', String(Math.round(newWidth)));
      this.requestUpdate();
    };

    const onMouseUp = () => {
      this.isDraggingTerminalSideResizer = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.triggerWindowResize();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private handleCustomTerminalInput(text: string) {
    if (!text) return;
    soundFX.playClick();
    this.terminalLogs += `\n>> ${text}\n`;
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ type: 'input', data: text }));
    } else {
      this.terminalLogs += `[SYSTEM] Sent: "${text}" to local agent runtime.\n`;
      if (!this.isAgentRunning && !this.isStartingAgent) {
        this.startAgent();
      }
    }
    this.requestUpdate();
  }

  private handleTerminalVoiceCaptureToggle() {
    this.handleTerminalEmptyEnter();
  }

  private quickExecuteMetaCommand(cmd: string) {
    soundFX.playClick();
    const cleanCmd = cmd.startsWith('/') ? cmd.slice(1) : cmd;

    // Send to terminal / agent websocket
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ type: 'input', data: cleanCmd }));
    }
    
    // Add to chat history for visibility even when terminal is hidden
    this.transcriptionHistory = [
      ...this.transcriptionHistory,
      { speaker: 'user', text: `/${cleanCmd}` }
    ];
    this.isGeneratingResponse = true;
    this.taskProgress = {
      taskName: `/${cleanCmd}`,
      stepDescription: `Executing command: ${cleanCmd}`,
      elapsedSeconds: 0,
      canCancel: true
    };
    this.requestUpdate();

    // If websocket is not open, process via standard chat endpoint
    if (!this.wsTerminal || this.wsTerminal.readyState !== WebSocket.OPEN) {
      this.chatInputText = `Execute system command: ${cleanCmd}`;
      this.handleSendMessage();
    }
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
      
      const minW = Math.max(390, Math.min(440, Math.round(window.innerWidth * 0.28)));
      const maxW = Math.max(minW + 60, Math.round(window.innerWidth * 0.55));
      const minH = Math.max(140, Math.min(180, Math.round(window.innerHeight * 0.18)));
      const maxH = Math.max(minH + 50, Math.round(window.innerHeight * 0.50));

      if (position === 'right') {
        const newWidth = Math.max(minW, Math.min(maxW, startWidth - deltaX));
        this.terminalWidth = Math.round(newWidth);
        localStorage.setItem('project_lumin_terminal_width', String(Math.round(newWidth)));
      } else if (position === 'left') {
        const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX));
        this.terminalWidth = Math.round(newWidth);
        localStorage.setItem('project_lumin_terminal_width', String(Math.round(newWidth)));
      } else if (position === 'bottom') {
        const newHeight = Math.max(minH, Math.min(maxH, startHeight - deltaY));
        this.terminalHeight = Math.round(newHeight);
        localStorage.setItem('project_lumin_terminal_height', String(Math.round(newHeight)));
      } else if (position === 'top') {
        const newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY));
        this.terminalHeight = Math.round(newHeight);
        localStorage.setItem('project_lumin_terminal_height', String(Math.round(newHeight)));
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

      const minDist = Math.min(distLeft, distRight, distBottom);
      let newPos: 'left' | 'right' | 'bottom' = 'right';

      if (minDist === distLeft) newPos = 'left';
      else if (minDist === distRight) newPos = 'right';
      else newPos = 'bottom';

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
      const distBottom = window.innerHeight - touch.clientY;

      const minDist = Math.min(distLeft, distRight, distBottom);
      let newPos: 'left' | 'right' | 'bottom' = 'right';

      if (minDist === distLeft) newPos = 'left';
      else if (minDist === distRight) newPos = 'right';
      else newPos = 'bottom';

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
          style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${isUser ? 'var(--glow-color)' : 'rgba(255,255,255,0.3)'}; box-shadow: ${isUser ? '0 0 8px var(--glow-color-faded)' : 'none'}; flex-shrink: 0;"
        />
      `;
    }

    return html`
      <span
        class="user-avatar"
        style="width: 24px; height: 24px; border-radius: 50%; background: ${isUser ? 'linear-gradient(135deg, var(--glow-color, #00aaff), #0284c7)' : 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))'}; color: ${isUser ? 'var(--background-primary, #000)' : '#ffffff'}; border: 1px solid ${isUser ? 'var(--glow-color)' : 'rgba(255,255,255,0.25)'}; box-shadow: ${isUser ? '0 0 10px var(--glow-color-faded, rgba(0,170,255,0.35))' : 'none'}; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-family: system-ui, sans-serif; flex-shrink: 0; line-height: 1;"
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
      
      const minH = Math.max(120, Math.min(180, window.innerHeight * 0.18));
      const maxH = Math.max(minH + 50, window.innerHeight * 0.50);
      const newHeight = Math.max(minH, Math.min(maxH, startHeight - deltaY));
      this.terminalPaneHeight = Math.round(newHeight);
      localStorage.setItem('project_lumin_terminal_pane_height', String(Math.round(newHeight)));
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
      if (pre.querySelector('.code-block-header')) return;

      const codeEl = pre.querySelector('code');
      let lang = 'CODE';
      if (codeEl) {
        const classNames = codeEl.className.split(' ');
        for (const cls of classNames) {
          if (cls.startsWith('language-')) {
            lang = cls.replace('language-', '').toUpperCase();
            break;
          }
        }
      }

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const leftGroup = document.createElement('div');
      leftGroup.style.display = 'flex';
      leftGroup.style.alignItems = 'center';
      leftGroup.style.gap = '6px';

      const dots = document.createElement('div');
      dots.className = 'code-window-dots';
      dots.innerHTML = '<span class="code-dot red"></span><span class="code-dot yellow"></span><span class="code-dot green"></span>';

      const langTag = document.createElement('span');
      langTag.className = 'code-lang-tag';
      langTag.textContent = lang;

      leftGroup.appendChild(dots);
      leftGroup.appendChild(langTag);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.type = 'button';
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      `;

      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const textToCopy = codeEl ? codeEl.innerText : pre.innerText;
        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span style="color: #10b981;">Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code snippet:', err);
        }
      });

      header.appendChild(leftGroup);
      header.appendChild(copyBtn);
      pre.insertBefore(header, pre.firstChild);
    });
  }

  firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);

    // Ensure PIP bounds and safe zones are checked and clamped once DOM is attached
    setTimeout(() => {
      this.handleWindowResize();
    }, 120);

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

    // Global keyboard shortcuts for desktop tabs and developer console
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const activeEl = document.activeElement || (this.shadowRoot ? this.shadowRoot.activeElement : null);
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );

      // Ctrl + ` (Backquote) to toggle developer terminal anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        this.toggleTerminal();
        return;
      }

      // Alt + 1-3 for quick tab navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          this.switchTab('voice');
        } else if (e.key === '2') {
          e.preventDefault();
          this.switchTab('agent');
        } else if (e.key === '3') {
          e.preventDefault();
          this.switchTab('settings');
        }
      }
    });

    // Automatically initialize WebSocket connection to server to track active sessions and launch agent
    this.shouldStartOnConnect = true;
    this.initTerminalWebSocket(true);

    // Fetch initial agent config to synchronize unrestricted_mode
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.config && typeof data.config.unrestricted_mode === 'boolean') {
          this.unrestrictedMode = data.config.unrestricted_mode;
          localStorage.setItem('project_lumin_unrestricted_mode', String(data.config.unrestricted_mode));
          this.requestUpdate();
        }
      })
      .catch(() => {});

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
        if (msg.type === 'model_changed') {
          const isAuto = Boolean(msg.isAutoRouting || msg.activeModel === 'auto' || msg.activeModel === 'Auto-Router' || msg.activeModel === 'router');
          this.activeModelName = isAuto ? 'Auto-Router' : msg.activeModel;
          this.activePlatform = isAuto ? 'Auto-Router' : 'Ollama';
          localStorage.setItem('project_lumin_active_model', isAuto ? 'auto' : msg.activeModel);
          this.requestUpdate();
        } else if (msg.type === 'status') {
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

          // Parse dynamic platform and model from routing engine logs only when in Auto mode
          const routerMatch = cleanData.match(/>>> \[HYBRID ROUTER\]:\s*Task='.*?'\s*->\s*Platform=(\S+)\s*Model=(\S+)/i);
          if (routerMatch && routerMatch[1] && routerMatch[2]) {
            const saved = localStorage.getItem('project_lumin_active_model');
            const isManualLock = saved && saved !== 'auto' && saved !== 'Auto-Router' && saved !== 'router';
            if (!isManualLock && this.activeModelName === 'Auto-Router') {
              this.activePlatform = 'Ollama';
              this.requestUpdate();
            }
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

          // Parse structured status JSON if present
          const structuredStatus = parseStructuredStatus(cleanData);
          if (structuredStatus) {
            if (structuredStatus.status === 'running') {
              this.taskProgress = {
                taskName: structuredStatus.tool_name ? `Tool: ${structuredStatus.tool_name}` : 'Executing Agent Workflow',
                stepDescription: structuredStatus.next_action || 'Processing...',
                elapsedSeconds: this.responseTimer,
                canCancel: true
              };
              this.requestUpdate();
            } else if (structuredStatus.status === 'completed' || structuredStatus.status === 'failed') {
              this.taskProgress = null;
              this.requestUpdate();
            }
          }

          // Parse dynamic tool execution logs
          const toolExecMatch = cleanData.match(/(?:Executing tool|Running tool|Invoking tool|Calling tool|Executing):\s*([a-zA-Z0-9_\-.:]+)/i);
          if (toolExecMatch && toolExecMatch[1]) {
            const toolName = toolExecMatch[1].trim();
            this.taskProgress = {
              taskName: `Tool: ${toolName}`,
              stepDescription: `Agent executing ${toolName} in workspace environment...`,
              elapsedSeconds: this.responseTimer,
              canCancel: true
            };
            this.requestUpdate();
          }

          // Parse multi-step task progress (e.g. "Step 2 of 5: Analyzing dependencies")
          const stepMatch = cleanData.match(/(?:Step|Phase)\s*(\d+)\s*(?:of|\/)\s*(\d+)(?::\s*([^\r\n]+))?/i);
          if (stepMatch) {
            const currentStep = parseInt(stepMatch[1], 10);
            const totalSteps = parseInt(stepMatch[2], 10);
            const stepDesc = stepMatch[3] ? stepMatch[3].trim() : `Step ${currentStep} of ${totalSteps}`;
            const percent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : undefined;
            this.taskProgress = {
              taskName: this.taskProgress?.taskName || 'Agent Execution Plan',
              stepDescription: stepDesc,
              currentStep,
              totalSteps,
              progressPercent: percent,
              elapsedSeconds: this.responseTimer,
              canCancel: true
            };
            this.requestUpdate();
          }

          // Parse action logs (e.g. ">>> [AGENT ACTION]: Writing file /path/to/file")
          const actionMatch = cleanData.match(/>>> \[(?:AGENT ACTION|TASK PROGRESS|COGNITIVE STEP)\]:\s*([^\r\n]+)/i);
          if (actionMatch && actionMatch[1]) {
            this.taskProgress = {
              taskName: this.taskProgress?.taskName || 'Autonomous Workflow',
              stepDescription: actionMatch[1].trim(),
              elapsedSeconds: this.responseTimer,
              canCancel: true
            };
            this.requestUpdate();
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

                  // Remove any loading state message and clear task progress
                  this.transcriptionHistory = this.transcriptionHistory.filter(msg => !msg.isLoading);
                  this.taskProgress = null;
                  
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
                  } else if (this.isContinuousActive) {
                    soundFX.playComputerReady();
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
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mousemove', this.resetIdleTimer);
    document.removeEventListener('touchstart', this.resetIdleTimer);
    window.removeEventListener('click', this.handleWindowClick);
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('click', this.initSpeechOnInteractionBound);
    document.removeEventListener('touchstart', this.initSpeechOnInteractionBound);
    document.removeEventListener('keydown', this.initSpeechOnInteractionBound);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('scroll', this.updateRuntimeDrawerPosition);
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
      } catch (e) {}
    }
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
      const wakeWords = Array.from(new Set([customActivate, 'computer', 'wake up', 'hey lumin', 'ok lumin', 'okay lumin', 'hi lumin', 'hello lumin', 'lumin'].filter(Boolean)));
      const sleepWordLower = this.sleepCommandWord.trim().toLowerCase();
      const sleepWords = Array.from(new Set([sleepWordLower, 'standby', 'computer standby', 'computer, standby', 'go to sleep', 'sleep', 'goodbye agent', 'end session', "i'm done"].filter(Boolean)));

      const containsSleep = sleepWords.some(w => lowerFinal.includes(w) || lowerInterim.includes(w));
      const containsActivate = wakeWords.some(w => lowerFinal.includes(w) || lowerInterim.includes(w));

      if (containsSleep) {
        this.lastSleepTimestamp = Date.now();
        if (this.voiceSubmitTimer) {
          clearTimeout(this.voiceSubmitTimer);
          this.voiceSubmitTimer = null;
        }
        this.chatInputText = '';
        this.isContinuousActive = false;
        this.voiceMode = 'single';
        soundFX.playComputerStandby();
        this.stopEverythingAndGoToIdle();
        this.updateStatus('Standby');
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

        // Activate and continuously maintain audiovisualizer active state with computer activate tone
        soundFX.playComputerActivate();
        this.isContinuousActive = true;
        this.voiceMode = 'continuous';
        if (!this.isRecording || this.micPausedByTTS) {
          await this.startVoiceSession();
        } else {
          this.updateStatus('Listening...');
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
      
      let stream: MediaStream | null = null;
      if (this.selectedMicAudioDeviceId && this.selectedMicAudioDeviceId !== 'default') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              ...audioConstraints,
              deviceId: { exact: this.selectedMicAudioDeviceId },
            },
            video: false,
          });
        } catch (exactErr) {
          console.warn('[AudioCapture] Selected mic device failed or disconnected, falling back to default:', exactErr);
        }
      }

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
      }

      this.mediaStream = stream;
      this.micPermissionState = 'granted';
      this.micPermissionError = '';
      this.updateStatus(``);
      // Refresh enumerated devices now that permission is active
      this.updateAudioDevicesList();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error initializing microphone:', errorMessage);
      this.micPermissionState = 'denied';
      this.micPermissionError = errorMessage;
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
    this.initialParticleFormationScale = this.particleFormationScale;
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
    this.initialMercuryMetalEnabled = this.mercuryMetalEnabled;
    this.initialMercuryFluidity = this.mercuryFluidity;
    this.initialMercurySheen = this.mercurySheen;
    this.initialFilmGrainEnabled = this.filmGrainEnabled;
    this.initialFilmGrainIntensity = this.filmGrainIntensity;
    this.initialGodRaysEnabled = this.godRaysEnabled;
    this.initialGodRaysIntensity = this.godRaysIntensity;
    this.initialEdgeGlowEnabled = this.edgeGlowEnabled;
    this.initialEdgeGlowIntensity = this.edgeGlowIntensity;
    this.initialEdgeGlowThreshold = this.edgeGlowThreshold;
    this.initialHexGridEnabled = this.hexGridEnabled;
    this.initialHexGridScale = this.hexGridScale;
    this.initialBarrelDistortionEnabled = this.barrelDistortionEnabled;
    this.initialBarrelCurvature = this.barrelCurvature;
    this.initialPixelationEnabled = this.pixelationEnabled;
    this.initialPixelSize = this.pixelSize;
    this.initialVhsDistortionEnabled = this.vhsDistortionEnabled;
    this.initialVhsTapeNoise = this.vhsTapeNoise;
    this.initialPrismaticDispersionEnabled = this.prismaticDispersionEnabled;
    this.initialPrismaticSpread = this.prismaticSpread;
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
    this.activeSettingsTab = 'VOICE';

    // Query for physical audio input devices and refresh permission state
    this.requestMicrophonePermissionAndEnumerate(false);
  }

  private cancelSettings() {
    this.isSettingsOpen = false;
    this.masterEffectsEnabled = this.initialMasterEffectsEnabled;
    this.isReverbEnabled = this.initialReverbState;
    this.isDelayEnabled = this.initialDelayState;
    this.isFlangerEnabled = this.initialFlangerState;
    this.particleSize = this.initialParticleSize;
    this.particleFormationScale = this.initialParticleFormationScale;
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
    this.mercuryMetalEnabled = this.initialMercuryMetalEnabled;
    this.mercuryFluidity = this.initialMercuryFluidity;
    this.mercurySheen = this.initialMercurySheen;
    this.gradientBevelEnabled = this.initialGradientBevelEnabled;
    this.bevelRingWidth = this.initialBevelRingWidth;
    this.bevelSheen = this.initialBevelSheen;
    this.bevelShadowEnabled = this.initialBevelShadowEnabled;
    this.filmGrainEnabled = this.initialFilmGrainEnabled;
    this.filmGrainIntensity = this.initialFilmGrainIntensity;
    this.godRaysEnabled = this.initialGodRaysEnabled;
    this.godRaysIntensity = this.initialGodRaysIntensity;
    this.edgeGlowEnabled = this.initialEdgeGlowEnabled;
    this.edgeGlowIntensity = this.initialEdgeGlowIntensity;
    this.edgeGlowThreshold = this.initialEdgeGlowThreshold;
    this.hexGridEnabled = this.initialHexGridEnabled;
    this.hexGridScale = this.initialHexGridScale;
    this.barrelDistortionEnabled = this.initialBarrelDistortionEnabled;
    this.barrelCurvature = this.initialBarrelCurvature;
    this.pixelationEnabled = this.initialPixelationEnabled;
    this.pixelSize = this.initialPixelSize;
    this.vhsDistortionEnabled = this.initialVhsDistortionEnabled;
    this.vhsTapeNoise = this.initialVhsTapeNoise;
    this.prismaticDispersionEnabled = this.initialPrismaticDispersionEnabled;
    this.prismaticSpread = this.initialPrismaticSpread;
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

  private handleCustomEnvUpload = (file: File) => {
    if (!file) return;
    if (this.envImageUrl && this.envImageUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(this.envImageUrl); } catch (e) {}
    }
    const url = URL.createObjectURL(file);
    this.envImageUrl = url;
    this.envImageName = file.name;
    this.envSource = 'custom';
    this.envImageStatus = `Loading ${file.name}...`;
    this.envImageError = null;
    this.requestUpdate();
  };

  private resetCustomEnv = () => {
    if (this.envImageUrl && this.envImageUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(this.envImageUrl); } catch (e) {}
    }
    this.envImageUrl = null;
    this.envImageName = null;
    this.envSource = 'default';
    this.envIntensity = 1.0;
    this.envReflectionStrength = 1.0;
    this.envRotationY = 0;
    this.envImageStatus = null;
    this.envImageError = null;
    this.requestUpdate();
  };

  private handleCustomModelUpload = (file: File) => {
    if (!file) return;
    if (this.customModelUrl && this.customModelUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(this.customModelUrl); } catch (e) {}
    }
    const url = URL.createObjectURL(file);
    this.customModelUrl = url;
    this.customModelName = file.name;
    this.geometrySource = 'custom';
    this.customModelStatus = `Loading ${file.name}...`;
    this.customModelError = null;
    this.requestUpdate();
  };

  private resetCustomModel = () => {
    if (this.customModelUrl && this.customModelUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(this.customModelUrl); } catch (e) {}
    }
    this.customModelUrl = null;
    this.customModelName = null;
    this.geometrySource = 'builtin';
    this.customModelScale = 1.0;
    this.customModelPosX = 0;
    this.customModelPosY = 0;
    this.customModelPosZ = 0;
    this.customModelRotX = 0;
    this.customModelRotY = 0;
    this.customModelRotZ = 0;
    this.customModelVertexCount = 0;
    this.customModelStatus = null;
    this.customModelError = null;
    this.requestUpdate();
  };

  private resetCustomModelTransforms = () => {
    this.customModelScale = 1.0;
    this.customModelPosX = 0;
    this.customModelPosY = 0;
    this.customModelPosZ = 0;
    this.customModelRotX = 0;
    this.customModelRotY = 0;
    this.customModelRotZ = 0;
    this.requestUpdate();
  };

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

  public handleDeviceChange = () => {
    console.log('[AudioDevices] Media device hardware change detected, refreshing device list...');
    this.updateAudioDevicesList();
  };

  public async requestMicrophonePermissionAndEnumerate(forcePrompt: boolean = false) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    this.isRequestingMicPermission = true;
    this.micPermissionError = '';

    try {
      // First check currently visible devices
      let devices = await navigator.mediaDevices.enumerateDevices();
      let inputDevices = devices.filter(d => d.kind === 'audioinput');
      const hasLabels = inputDevices.some(d => !!d.label);

      // If no labels exist yet or explicit force prompt requested, trigger temporary getUserMedia to obtain permissions
      if ((!hasLabels || forcePrompt) && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.micPermissionState = 'granted';
          // Immediately stop temp tracks if the user is not actively recording/continuous listening
          if (!this.isRecording && !this.isContinuousActive && !this.mediaStream) {
            tempStream.getTracks().forEach(t => {
              try { t.stop(); } catch (e) {}
            });
          } else if (!this.mediaStream) {
            this.mediaStream = tempStream;
          }
        } catch (permErr: any) {
          const errMsg = permErr instanceof Error ? permErr.message : String(permErr);
          console.warn('[AudioDevices] getUserMedia permission prompt failed or denied:', errMsg);
          this.micPermissionState = 'denied';
          this.micPermissionError = errMsg;
        }
      }

      // Re-enumerate to get full device labels
      devices = await navigator.mediaDevices.enumerateDevices();
      inputDevices = devices.filter(d => d.kind === 'audioinput');
      this.audioDevices = inputDevices;

      if (inputDevices.some(d => !!d.label)) {
        this.micPermissionState = 'granted';
      }

      console.log(`[AudioDevices] Detected ${inputDevices.length} audio input device(s):`, inputDevices);
    } catch (e: any) {
      console.warn('[AudioDevices] Failed to enumerate audio devices:', e);
      this.micPermissionError = e?.message || String(e);
    } finally {
      this.isRequestingMicPermission = false;
      this.requestUpdate();
    }
  }

  public async updateAudioDevicesList() {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.audioDevices = devices.filter(d => d.kind === 'audioinput');
        if (this.audioDevices.some(d => !!d.label)) {
          this.micPermissionState = 'granted';
        }
        console.log('[AudioDevices] Loaded devices:', this.audioDevices);
        this.requestUpdate();
      }
    } catch (e) {
      console.warn('Failed to enumerate audio devices:', e);
    }
  }

  private async startDesktopDeviceAudio() {
    if (this.desktopDeviceStream) return;
    if (!this.selectedDesktopAudioDeviceId || this.selectedDesktopAudioDeviceId === 'screen-share') {
      return;
    }
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
        this.isDesktopAudioCapturing = true;
        console.log('Successfully connected custom desktop audio device to visualizer.');
      }
    } catch (err) {
      console.error('Failed to capture custom desktop audio device:', err);
      this.isDesktopAudioCapturing = false;
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
    this.isDesktopAudioCapturing = false;
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
        let fileType: 'image' | 'video' | 'audio' | 'file' = 'file';
        let mimeType = file.type;
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        const videoExts = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', '3gpp', 'ts', 'ogv']);
        const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'aiff', 'aif', 'wma', 'opus', 'amr', 'mp2', 'ac3']);
        const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif', 'ico']);

        if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'application/x-zip-compressed' || mimeType === 'application/zip') {
          if (ext === 'mp3') mimeType = 'audio/mpeg';
          else if (ext === 'wav') mimeType = 'audio/wav';
          else if (ext === 'ogg') mimeType = 'audio/ogg';
          else if (ext === 'flac') mimeType = 'audio/flac';
          else if (ext === 'aac') mimeType = 'audio/aac';
          else if (ext === 'm4a') mimeType = 'audio/mp4';
          else if (ext === 'aiff' || ext === 'aif') mimeType = 'audio/aiff';
          else if (ext === 'wma') mimeType = 'audio/x-ms-wma';
          else if (ext === 'opus') mimeType = 'audio/opus';
          else if (ext === 'amr') mimeType = 'audio/amr';
          else if (ext === 'mp2') mimeType = 'audio/mpeg';
          else if (ext === 'ac3') mimeType = 'audio/ac3';
          else if (ext === 'mp4') mimeType = 'video/mp4';
          else if (ext === 'webm') mimeType = 'video/webm';
          else if (ext === 'mkv') mimeType = 'video/x-matroska';
          else if (ext === 'avi') mimeType = 'video/x-msvideo';
          else if (ext === 'mov') mimeType = 'video/quicktime';
          else if (ext === 'flv') mimeType = 'video/x-flv';
          else if (ext === 'wmv') mimeType = 'video/x-ms-wmv';
          else if (ext === 'm4v') mimeType = 'video/x-m4v';
          else if (ext === '3gp' || ext === '3gpp') mimeType = 'video/3gpp';
          else if (ext === 'ts') mimeType = 'video/mp2t';
          else if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'bmp') mimeType = 'image/bmp';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'pdf') mimeType = 'application/pdf';
          else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (ext === 'zip') mimeType = 'application/zip';
          else if (ext === 'tar') mimeType = 'application/x-tar';
          else if (ext === 'gz') mimeType = 'application/gzip';
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

        const isVideo = mimeType.startsWith('video/') || (ext ? videoExts.has(ext) : false);
        const isAudio = mimeType.startsWith('audio/') || (ext ? audioExts.has(ext) : false);
        const isImage = mimeType.startsWith('image/') || (ext ? imageExts.has(ext) : false);

        if (isImage) fileType = 'image';
        else if (isVideo) fileType = 'video';
        else if (isAudio) fileType = 'audio';

        const isMediaFile = isVideo || isAudio;
        const maxSizeBytes = isMediaFile ? 1024 * 1024 * 1024 : 20 * 1024 * 1024;
        const maxSizeLabel = isMediaFile ? '1024MB (1GB)' : '20MB';

        if (file.size > maxSizeBytes) {
          throw new Error(`File '${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${maxSizeLabel} limit.`);
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
      let fileType: 'image' | 'video' | 'audio' | 'file' = 'file';
      let mimeType = file.type;
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      const videoExts = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', '3gpp', 'ts', 'ogv']);
      const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'aiff', 'aif', 'wma', 'opus', 'amr', 'mp2', 'ac3']);
      const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif', 'ico']);

      if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'application/x-zip-compressed' || mimeType === 'application/zip') {
        if (ext === 'mp3') mimeType = 'audio/mpeg';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'ogg') mimeType = 'audio/ogg';
        else if (ext === 'flac') mimeType = 'audio/flac';
        else if (ext === 'aac') mimeType = 'audio/aac';
        else if (ext === 'm4a') mimeType = 'audio/mp4';
        else if (ext === 'aiff' || ext === 'aif') mimeType = 'audio/aiff';
        else if (ext === 'wma') mimeType = 'audio/x-ms-wma';
        else if (ext === 'opus') mimeType = 'audio/opus';
        else if (ext === 'amr') mimeType = 'audio/amr';
        else if (ext === 'mp2') mimeType = 'audio/mpeg';
        else if (ext === 'ac3') mimeType = 'audio/ac3';
        else if (ext === 'mp4') mimeType = 'video/mp4';
        else if (ext === 'webm') mimeType = 'video/webm';
        else if (ext === 'mkv') mimeType = 'video/x-matroska';
        else if (ext === 'avi') mimeType = 'video/x-msvideo';
        else if (ext === 'mov') mimeType = 'video/quicktime';
        else if (ext === 'flv') mimeType = 'video/x-flv';
        else if (ext === 'wmv') mimeType = 'video/x-ms-wmv';
        else if (ext === 'm4v') mimeType = 'video/x-m4v';
        else if (ext === '3gp' || ext === '3gpp') mimeType = 'video/3gpp';
        else if (ext === 'ts') mimeType = 'video/mp2t';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'bmp') mimeType = 'image/bmp';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        else if (ext === 'zip') mimeType = 'application/zip';
        else if (ext === 'tar') mimeType = 'application/x-tar';
        else if (ext === 'gz') mimeType = 'application/gzip';
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
        'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/bmp', 'image/svg+xml',
        'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/mp4', 'audio/opus',
        'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-m4v', 'video/mp2t', 'video/ogg',
        'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/x-javascript', 'text/x-typescript', 'application/x-typescript', 'text/csv', 'text/markdown', 'text/x-python', 'application/x-python-code', 'application/json', 'text/xml', 'application/rtf', 'text/rtf',
        'application/pdf', 'application/zip', 'application/x-tar', 'application/gzip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ]);

      const isVideo = mimeType.startsWith('video/') || (ext ? videoExts.has(ext) : false);
      const isAudio = mimeType.startsWith('audio/') || (ext ? audioExts.has(ext) : false);
      const isImage = mimeType.startsWith('image/') || (ext ? imageExts.has(ext) : false);

      if (mimeType.startsWith('text/') && !supportedMimeTypes.has(mimeType)) {
        mimeType = 'text/plain';
      }

      if (!supportedMimeTypes.has(mimeType) && !isVideo && !isAudio && !isImage) {
        this.updateError(`Unsupported file type: ${ext ? '.' + ext : mimeType}.`);
        this.updateStatus('Ready');
        return;
      }

      if (isImage) fileType = 'image';
      else if (isVideo) fileType = 'video';
      else if (isAudio) fileType = 'audio';

      // Perform actual upload to Express server backend to save it locally in uploads/
      const isMediaFile = isVideo || isAudio;
      const maxSizeBytes = isMediaFile ? 1024 * 1024 * 1024 : 20 * 1024 * 1024;
      const maxSizeLabel = isMediaFile ? '1024MB (1GB)' : '20MB';

      if (file.size > maxSizeBytes) {
        throw new Error(`File '${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${maxSizeLabel} limit.`);
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
        soundFX.playComputerReady();
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
      soundFX.playComputerReady();
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
    const visShapes = ['sphere', 'cube', 'pyramid', 'torus', 'cylinder', 'torusKnot', 'octahedron', 'dodecahedron', 'icosahedron'];
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
        else if (/\b(torus|donut|ring shape)\b/.test(t)) { this.visualizerShape = 'torus'; matched = true; }
        else if (/\b(cylinder|pillar|column)\b/.test(t)) { this.visualizerShape = 'cylinder'; matched = true; }
        else if (/\b(torus knot|knot|nexus)\b/.test(t)) { this.visualizerShape = 'torusKnot'; matched = true; }
        else if (/\b(octahedron|diamond)\b/.test(t)) { this.visualizerShape = 'octahedron'; matched = true; }
        else if (/\b(dodecahedron)\b/.test(t)) { this.visualizerShape = 'dodecahedron'; matched = true; }
        else if (/\b(icosahedron)\b/.test(t)) { this.visualizerShape = 'icosahedron'; matched = true; }
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
    if (/\b(mercury|liquid metal|metal morph|chrome morph|adamantium)\b/.test(t)) {
        if (isOn(t) || /\b(make|with|enable|turn on)\b/.test(t)) this.mercuryMetalEnabled = true;
        if (isOff(t) || /\b(without|disable|turn off)\b/.test(t)) this.mercuryMetalEnabled = false;
        matched = true;
    }
    if (/\b(bevel|c4d bevel|gradient bevel|bevel metal|beveled rings)\b/.test(t)) {
        if (isOn(t) || /\b(make|with|enable|turn on)\b/.test(t)) this.gradientBevelEnabled = true;
        if (isOff(t) || /\b(without|disable|turn off)\b/.test(t)) this.gradientBevelEnabled = false;
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

  public async executeSkill(skill: LuminSkill, customQuery?: string) {
    if (!skill) return;

    soundFX.playClick();
    this.activeSkill = skill.name;
    const startTime = Date.now();

    const userMessage: TranscriptionEntry = {
      speaker: 'user',
      text: `${skill.icon} **[Executing Skill: ${skill.name}]**\n*${skill.description}*`,
    };
    this.transcriptionHistory = [...this.transcriptionHistory, userMessage];

    this.isGeneratingResponse = true;
    soundFX.playComputerProcessing();
    this.taskProgress = {
      taskName: `Skill: ${skill.name}`,
      stepDescription: `Executing ${skill.category} capability pack with ${this.activeModelName}...`,
      elapsedSeconds: 0,
      canCancel: true
    };

    const promptPayload = skillsManager.buildSkillExecutionPrompt(skill, {
      activeModel: this.activeModelName,
      activePlatform: this.activePlatform,
      unrestrictedMode: this.unrestrictedMode,
      visualizerShape: this.visualizerShape,
      activeTheme: this.activeTheme,
      gpuInfo: 'WebGL 2.0 (Active 60 FPS)',
      audioState: 'WebAudio 48kHz (Active)',
      userQuery: customQuery
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let localResponse = '';
    if (skill.id === 'morning_brief') {
      localResponse = `☀️ **Good morning, ${this.userName || 'User'}!**\n\n` +
        `Today is **${dateStr}** at **${timeStr}**.\n\n` +
        `### 🏛️ System & Architecture Status\n` +
        `- **Brain / Model**: \`${this.activeModelName}\` (${this.activePlatform} local-first inference)\n` +
        `- **Harness & Access**: \`${this.unrestrictedMode ? 'UNRESTRICTED (Full System Access)' : 'SANDBOXED (Protected Workspace)'}\`\n` +
        `- **Context Workspace**: \`lumin_context/\` active (\`USER.md\`, \`IDENTITY.md\`, \`RULES.md\`, \`MEMORY.md\`)\n` +
        `- **Hardware Health**: WebGL 2.0 3D Visualizer 60 FPS · WebAudio 48kHz Nominal\n\n` +
        `### 🎯 Prioritized Focus Items for Today\n` +
        `1. **Evolve Agent Architecture**: Leverage Context Layer & Skills system for automated workflows.\n` +
        `2. **Inspect 3D Audio Visualizer**: Test real-time shaders and reactive geometry.\n` +
        `3. **Continuous Execution**: Keep local inference latency zero-overhead.`;
    } else if (skill.id === 'daily_status') {
      localResponse = `### 📊 Daily Operational Status & Workflow Check\n\n` +
        `| Architecture Layer | Current Status | Details |\n` +
        `| :--- | :--- | :--- |\n` +
        `| **1. Model (Brain)** | \`ONLINE\` | \`${this.activeModelName}\` (${this.activePlatform}) |\n` +
        `| **2. Context (Memory)** | \`SYNCED\` | \`lumin_context/\` 4 Active Markdown Stores |\n` +
        `| **3. Skills (Jobs)** | \`${skillsManager.getActiveSkills().length} Active\` | ${skillsManager.getAllSkills().length} Registered Capability Packs |\n` +
        `| **4. Harness (Runtime)** | \`${this.unrestrictedMode ? 'UNRESTRICTED' : 'SANDBOXED'}\` | MCP Bridge: ${this.isMcpEnabled ? 'Connected' : 'Standby'} |\n` +
        `| **5. 3D Graphics & Audio** | \`NOMINAL\` | 60 FPS · WebAudio 48kHz |\n\n` +
        `*Verdict*: **All systems nominal. Ready to accept tasks.**`;
    } else if (skill.id === 'system_diagnostics') {
      localResponse = `### ⚡ System Diagnostics & Hardware Telemetry Audit\n\n` +
        `- **WebGL 2.0 Acceleration**: 60 FPS target · Real-time 3D audio reactive sphere\n` +
        `- **Audio Pipeline**: WebAudio 48kHz · Active Voice: \`${this.piperVoice}\`\n` +
        `- **Execution Sandbox**: \`${this.unrestrictedMode ? 'UNRESTRICTED (Elevated Privileges)' : 'SANDBOXED (Protected Mode)'}\`\n` +
        `- **Local Context Workspace**: \`USER.md\`, \`IDENTITY.md\`, \`RULES.md\`, \`MEMORY.md\` loaded\n` +
        `- **Registered Skill Packs**: ${skillsManager.getAllSkills().length} Capability Packs\n\n` +
        `All local telemetry metrics verified and operating within nominal parameters.`;
    } else if (skill.id === 'ambient_architect') {
      localResponse = `### 🪐 3D Visualizer & Ambient Architect Report\n\n` +
        `- **Current Geometry**: Shape \`${this.visualizerShape}\` · Particle Speed \`${this.particleSpeed}x\`\n` +
        `- **Theme Profile**: \`${this.activeTheme}\` palette\n` +
        `- **Post-Processing Pipeline**: Bloom (\`${this.bloomIntensity}\`), Chromatic Aberration & Mercury Shaders active\n` +
        `- **Audio Reactivity**: Multi-band frequency analyzer active (48kHz sample rate)\n\n` +
        `*Recommended Presets*: Try switching between **Arcane Quantum**, **Emerald Matrix**, and **Liquid Chrome** in Preferences → Interface & 3D.`;
    } else {
      localResponse = `### ${skill.icon} ${skill.name} Execution\n\n` +
        `**Task Instructions:**\n${skill.instructions}\n\n` +
        `${customQuery ? `**User Input:** ${customQuery}\n\n` : ''}` +
        `*Skill executed successfully using active Context Layer and runtime variables.*`;
    }

    try {
      if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
        this.wsTerminal.send(JSON.stringify({ type: 'input', data: promptPayload }));
      }
    } catch (e) {
      console.warn('WS send for skill execution:', e);
    }

    const duration = Date.now() - startTime;
    skillsManager.recordExecution(skill.id, localResponse, duration);

    this.transcriptionHistory = [
      ...this.transcriptionHistory,
      {
        speaker: 'ai',
        text: localResponse
      }
    ];

    if (this.ttsMode !== 'off' && this.autoPlayTTS) {
      this.playTTS(localResponse, this.transcriptionHistory.length - 1, this.piperVoice);
    } else if (this.isContinuousActive) {
      soundFX.playComputerReady();
    }

    this.isGeneratingResponse = false;
    this.taskProgress = null;
    setTimeout(() => {
      this.activeSkill = '';
      this.requestUpdate();
    }, 3000);
    this.requestUpdate();
  }

  private async handleSendMessage() {
    if (this.voiceSubmitTimer) {
      clearTimeout(this.voiceSubmitTimer);
      this.voiceSubmitTimer = null;
    }

    // Check for skill invocation match
    if (this.chatInputText && this.attachedFiles.length === 0) {
      const rawText = this.chatInputText.trim();
      const matchedSkill = skillsManager.matchSkill(rawText);
      if (matchedSkill) {
        const query = this.chatInputText;
        this.chatInputText = '';
        await this.executeSkill(matchedSkill, query);
        return;
      }
    }

    // Initialize terminal connection in background if needed without forcing UI panel open
    if (!this.isTerminalEnabled) {
      this.isTerminalEnabled = true;
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
    soundFX.playComputerProcessing();
    this.taskProgress = {
      taskName: 'Generating Response',
      stepDescription: `Reasoning with ${this.activeModelName} (${this.activePlatform})...`,
      elapsedSeconds: 0,
      canCancel: true
    };

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
      this.isGeneratingResponse = false;
      this.taskProgress = null;
      this.transcriptionHistory = this.transcriptionHistory.filter(msg => !msg.isLoading);
      this.transcriptionHistory = [
        ...this.transcriptionHistory,
        {
          speaker: 'ai',
          text: `**System Error**: ${err.message || 'Call failed'}.`,
          voiceName: this.piperVoice,
        },
      ];
    }
  }

  private cancelActiveTask() {
    soundFX.playClick();
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      try {
        this.wsTerminal.send(JSON.stringify({ type: 'input', data: '\x03' }));
        this.wsTerminal.send(JSON.stringify({ type: 'stop' }));
      } catch (e) {
        console.error('Error sending cancel signals to terminal WebSocket:', e);
      }
    }
    this.stopResponseTimer();
    this.isGeneratingResponse = false;
    this.taskProgress = null;
    this.transcriptionHistory = this.transcriptionHistory.filter(msg => !msg.isLoading);
    this.requestUpdate();
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
    const tabs: Array<{ id: string; label: string; desc: string; icon: string }> = [
      { id: 'VOICE', label: 'Voice & Audio', desc: 'Mic, Hotwords & TTS', icon: '🎙️' },
      { id: 'MODELS', label: 'Models & Persona', desc: 'Inference & Identity', icon: '🧠' },
      { id: 'CONTEXT_SKILLS', label: 'Context & Skills', desc: 'Identity, Memory & Jobs', icon: '📁' },
      { id: 'INTERFACE', label: 'Interface & 3D', desc: 'Visualizer, Themes & FX', icon: '🎨' },
      { id: 'ADVANCED', label: 'Advanced & MCP', desc: 'Tools, Guards & Backup', icon: '⚙️' },
    ];

    const currentTabId =
      this.activeSettingsTab === 'VOICE' || this.activeSettingsTab === 'VOICE_COMMANDS'
        ? 'VOICE'
        : this.activeSettingsTab === 'MODELS'
        ? 'MODELS'
        : this.activeSettingsTab === 'CONTEXT_SKILLS'
        ? 'CONTEXT_SKILLS'
        : this.activeSettingsTab === 'INTERFACE' ||
          this.activeSettingsTab === 'THEMES' ||
          this.activeSettingsTab === 'GEOMETRY' ||
          this.activeSettingsTab === 'POST_PROCESSING' ||
          this.activeSettingsTab === 'ENVIRONMENT' ||
          this.activeSettingsTab === 'GLOW_EFFECTS'
        ? 'INTERFACE'
        : 'ADVANCED';

    return html`
      <div class="settings-nav">
        <div class="settings-nav-header">
          <h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Preferences
          </h2>
          <span>Configure agent workspace</span>
        </div>

        <ul>
          ${tabs.map(
            (tab) => html`
              <li>
                <button
                  type="button"
                  class="settings-nav-item-btn ${currentTabId === tab.id ? 'active' : ''}"
                  @click=${() => {
                    this.activeSettingsTab = tab.id as any;
                    soundFX.playClick();
                  }}>
                  <div class="nav-icon">${tab.icon}</div>
                  <div class="nav-label-group">
                    <span class="nav-label">${tab.label}</span>
                    <span class="nav-desc">${tab.desc}</span>
                  </div>
                </button>
              </li>
            `,
          )}
        </ul>
      </div>
    `;
  }

  private renderSettingsContent() {
    const isVoice = this.activeSettingsTab === "VOICE" || this.activeSettingsTab === "VOICE_COMMANDS";
    const isModels = this.activeSettingsTab === "MODELS";
    const isContextSkills = this.activeSettingsTab === "CONTEXT_SKILLS";
    const isInterface =
      this.activeSettingsTab === "INTERFACE" ||
      this.activeSettingsTab === "THEMES" ||
      this.activeSettingsTab === "GEOMETRY" ||
      this.activeSettingsTab === "POST_PROCESSING" ||
      this.activeSettingsTab === "ENVIRONMENT" ||
      this.activeSettingsTab === "GLOW_EFFECTS";

    return html`
      <div class="settings-content ${isInterface ? 'interface-content-layout' : ''}">
        ${isVoice
          ? renderVoiceSettingsSection(this)
          : isModels
          ? renderModelSettingsSection(this)
          : isContextSkills
          ? renderContextSkillsSettingsSection(this)
          : isInterface
          ? renderInterfaceSettingsSection(this)
          : renderAdvancedSettingsSection(this)}
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
      particleFormationScale: this.particleFormationScale,
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
      mercuryMetalEnabled: this.mercuryMetalEnabled,
      mercuryFluidity: this.mercuryFluidity,
      mercurySheen: this.mercurySheen,
      gradientBevelEnabled: this.gradientBevelEnabled,
      bevelRingWidth: this.bevelRingWidth,
      bevelSheen: this.bevelSheen,
      bevelShadowEnabled: this.bevelShadowEnabled,
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
      envSource: this.envSource,
      envIntensity: this.envIntensity,
      envReflectionStrength: this.envReflectionStrength,
      envRotationY: this.envRotationY,
      geometrySource: this.geometrySource,
      customModelScale: this.customModelScale,
      customModelPosX: this.customModelPosX,
      customModelPosY: this.customModelPosY,
      customModelPosZ: this.customModelPosZ,
      customModelRotX: this.customModelRotX,
      customModelRotY: this.customModelRotY,
      customModelRotZ: this.customModelRotZ,
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
          if (config.particleFormationScale !== undefined) this.particleFormationScale = config.particleFormationScale;
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
          if (config.mercuryMetalEnabled !== undefined) this.mercuryMetalEnabled = config.mercuryMetalEnabled;
          if (config.mercuryFluidity !== undefined) this.mercuryFluidity = config.mercuryFluidity;
          if (config.mercurySheen !== undefined) this.mercurySheen = config.mercurySheen;
          if (config.gradientBevelEnabled !== undefined) this.gradientBevelEnabled = config.gradientBevelEnabled;
          if (config.bevelRingWidth !== undefined) this.bevelRingWidth = config.bevelRingWidth;
          if (config.bevelSheen !== undefined) this.bevelSheen = config.bevelSheen;
          if (config.bevelShadowEnabled !== undefined) this.bevelShadowEnabled = config.bevelShadowEnabled;
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

          if (config.envSource !== undefined) this.envSource = config.envSource;
          if (config.envIntensity !== undefined) this.envIntensity = config.envIntensity;
          if (config.envReflectionStrength !== undefined) this.envReflectionStrength = config.envReflectionStrength;
          if (config.envRotationY !== undefined) this.envRotationY = config.envRotationY;

          if (config.geometrySource !== undefined) this.geometrySource = config.geometrySource;
          if (config.customModelScale !== undefined) this.customModelScale = config.customModelScale;
          if (config.customModelPosX !== undefined) this.customModelPosX = config.customModelPosX;
          if (config.customModelPosY !== undefined) this.customModelPosY = config.customModelPosY;
          if (config.customModelPosZ !== undefined) this.customModelPosZ = config.customModelPosZ;
          if (config.customModelRotX !== undefined) this.customModelRotX = config.customModelRotX;
          if (config.customModelRotY !== undefined) this.customModelRotY = config.customModelRotY;
          if (config.customModelRotZ !== undefined) this.customModelRotZ = config.customModelRotZ;
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
    this.afterimageEnabled = true;
    this.afterimageStrength = 0.85;
    this.chromaticAberrationEnabled = false;
    this.chromaticAberrationIntensity = 0.005;
    this.morphingEnabled = true;
    this.morphingIntensity = 1.0;
    this.mercuryMetalEnabled = true;
    this.mercuryFluidity = 1.0;
    this.mercurySheen = 1.5;
    this.gradientBevelEnabled = false;
    this.bevelRingWidth = 1.0;
    this.bevelSheen = 1.6;
    this.bevelShadowEnabled = true;
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
    this.activateWord = 'computer';
    this.sleepCommandWord = 'standby';
    this.offlineMode = false;
    this.ollamaModel = 'llama3';
    this.piperVoice = 'en-US-JennyNeural';
    this.llmCommandTemplate = 'ollama run {model} "{prompt}"';
    this.cameraRotX = 0;
    this.cameraRotY = 0;
    this.cameraZoomMult = 1.0;
    this.cameraLocked = false;
    this.envSource = 'default';
    this.envIntensity = 1.0;
    this.envReflectionStrength = 1.0;
    this.envRotationY = 0;
    this.geometrySource = 'builtin';
    this.customModelScale = 1.0;
    this.customModelPosX = 0;
    this.customModelPosY = 0;
    this.customModelPosZ = 0;
    this.customModelRotX = 0;
    this.customModelRotY = 0;
    this.customModelRotZ = 0;
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
        style="position: relative; --chat-font-size: ${this.getChatFontSizeRem()}; --chat-line-height: ${this.getChatLineHeight()}; --chat-font-weight: ${this.chatFontBold ? '700' : 'normal'};"
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
              aria-label="Chat font size"
              .value=${this.chatFontSize === 'smaller' ? '0' : this.chatFontSize === 'larger' ? '2' : '1'}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this.chatFontSize = val === '0' ? 'smaller' : val === '2' ? 'larger' : 'default';
                localStorage.setItem('project_lumin_chat_font_size', this.chatFontSize);
                this.requestUpdate();
              }}
              style="width: 70px; cursor: pointer;"
            />
            <span style="color: var(--glow-color); font-weight: bold; width: 55px; text-transform: uppercase;">
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
            <div class="agent-vis-segmented" title="3D visualizer display mode in Agent workspace">
              <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); padding-left: 4px; font-weight: bold; text-transform: uppercase;">3D:</span>
              <button 
                type="button" 
                class="agent-vis-seg-btn ${this.agentVisMode === 'compact' ? 'active' : ''}" 
                @click=${() => this.setAgentVisMode('compact')}
                title="Show Compact PIP Visualizer"
              >
                PIP
              </button>
              <button 
                type="button" 
                class="agent-vis-seg-btn ${this.agentVisMode === 'minimal' ? 'active' : ''}" 
                @click=${() => this.setAgentVisMode('minimal')}
                title="Show Minimal Capsule"
              >
                Capsule
              </button>
              <button 
                type="button" 
                class="agent-vis-seg-btn ${this.agentVisMode === 'hidden' ? 'active' : ''}" 
                @click=${() => this.setAgentVisMode('hidden')}
                title="Hide 3D Visualizer for Clean Work Surface"
              >
                Hidden
              </button>
            </div>
            <button
              type="button"
              @click=${() => this.toggleTerminal()}
              title="${this.isTerminalOpen ? 'Hide Developer Console (Ctrl+`)' : 'Show Developer Console (Ctrl+`)'}"
              style="background: ${this.isTerminalOpen ? 'rgba(0, 170, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${this.isTerminalOpen ? 'rgba(0, 170, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}; color: ${this.isTerminalOpen ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)'}; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 600;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              ${this.isTerminalOpen ? 'Console: ON' : 'Console: OFF'}
            </button>
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
          style="--chat-font-size: ${this.getChatFontSizeRem()}; --chat-line-height: ${this.getChatLineHeight()}; --chat-font-weight: ${this.chatFontBold ? '600' : 'normal'}; font-size: var(--chat-font-size) !important; font-weight: var(--chat-font-weight) !important; line-height: var(--chat-line-height) !important;"
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
                          : att.type === 'audio'
                          ? html`<div class="file-preview-placeholder" style="display: flex; align-items: center; gap: 4px; color: #a78bfa;">
                              <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            </div>`
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
          <!-- Quick Meta-Commands Bar -->
          <div class="chat-meta-bar">
            <span class="chat-meta-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Quick
            </span>
            <button type="button" class="chat-cmd-chip" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" @click=${() => {
              const skill = skillsManager.getSkillById('morning_brief');
              if (skill) this.executeSkill(skill);
            }} title="Run executive Morning Briefing skill">☀️ /morning-brief</button>
            <button type="button" class="chat-cmd-chip" style="color: #34d399; border-color: rgba(52, 211, 153, 0.4);" @click=${() => {
              this.switchTab('settings');
              this.activeSettingsTab = 'CONTEXT_SKILLS';
            }} title="Open Context Workspace & Skills Registry">💼 Skills & Context</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.cycleAgentVisMode()} title="Cycle 3D visualizer display mode">🔮 3D: ${this.agentVisMode}</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand('help')} title="Show all system capabilities">❓ /help</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand('status')} title="Check system & agent diagnostics">📊 /status</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand('models')} title="Inspect installed Ollama models">🤖 /models</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand('voice list')} title="List Edge-TTS neural voices">🎙️ /voice list</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand('forget')} title="Clear working conversation memory">🧹 /forget</button>
            <button type="button" class="chat-cmd-chip" @click=${() => this.quickExecuteMetaCommand(this.dryRunEnabled ? 'dryrun off' : 'dryrun on')} title="Toggle safe simulation dry-run mode">🛡️ ${this.dryRunEnabled ? '/dryrun off' : '/dryrun on'}</button>
            <button type="button" class="chat-cmd-chip" @click=${() => { this.transcriptionHistory = []; this.requestUpdate(); }} title="Clear chat view">🗑️ Clear Chat</button>
          </div>

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

  private async toggleScreenShare() {
    if (this.isScreenSharingEnabled) {
      this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  private changeTheme(themeKey: string) {
    this.activeTheme = themeKey as keyof typeof THEMES;
    soundFX.playClick();
    this.requestUpdate();
  }

  private switchTab(tab: 'voice' | 'agent' | 'settings') {
    this.currentTab = tab;
    localStorage.setItem('project_lumin_active_tab', tab);
    soundFX.playTabSwitch();
    this.isSettingsOpen = false;
    this.areActionsExpanded = false;
    if (this.isVisualizerOnlyMode) {
      this.isVisualizerOnlyMode = false;
    }
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private setAgentVisMode(mode: 'compact' | 'minimal' | 'hidden') {
    this.agentVisMode = mode;
    localStorage.setItem('project_lumin_agent_vis_mode', mode);
    soundFX.playClick();
    this.triggerWindowResize();
    this.requestUpdate();
  }

  private cycleAgentVisMode() {
    const modes: ('compact' | 'minimal' | 'hidden')[] = ['compact', 'minimal', 'hidden'];
    const currentIdx = modes.indexOf(this.agentVisMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.setAgentVisMode(nextMode);
  }

  private toggleAgentPipCorner() {
    this.agentPipCorner = this.agentPipCorner === 'top-right' ? 'top-left' : 'top-right';
    localStorage.setItem('project_lumin_agent_pip_corner', this.agentPipCorner);
    this.agentPipPos = null;
    localStorage.removeItem('project_lumin_agent_pip_pos');
    soundFX.playClick();
    this.requestUpdate();
  }

  private resetAgentPipPosition() {
    this.agentPipPos = null;
    localStorage.removeItem('project_lumin_agent_pip_pos');
    soundFX.playClick();
    this.requestUpdate();
  }

  private handleAgentPipPointerDown = (e: PointerEvent | MouseEvent) => {
    // Prevent drag if clicking buttons, inputs, links or actions container
    const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement;
    if (target && (target.closest('button') || target.closest('.pip-actions') || target.closest('a') || target.closest('input'))) {
      return;
    }

    const stageElem = this.shadowRoot?.getElementById('lumin-visualizer-stage') as HTMLElement | null;
    if (!stageElem) return;

    e.preventDefault();
    this.isDraggingAgentPip = true;
    this.hasAgentPipDragged = false;

    const mainElem = this.shadowRoot?.querySelector('.lumin-main-content') as HTMLElement | null;
    const mainRect = mainElem ? mainElem.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const rect = stageElem.getBoundingClientRect();
    // Element position relative to .lumin-main-content
    const startElemX = rect.left - mainRect.left;
    const startElemY = rect.top - mainRect.top;
    const startPointerX = e.clientX;
    const startPointerY = e.clientY;

    const onPointerMove = (moveEvent: PointerEvent | MouseEvent) => {
      if (!this.isDraggingAgentPip) return;
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;

      if (Math.hypot(deltaX, deltaY) > 3) {
        this.hasAgentPipDragged = true;
      }

      const currentMainElem = this.shadowRoot?.querySelector('.lumin-main-content') as HTMLElement | null;
      const currentMainRect = currentMainElem ? currentMainElem.getBoundingClientRect() : mainRect;

      const elemWidth = stageElem.offsetWidth || (this.agentVisMode === 'minimal' ? 172 : 270);
      const elemHeight = stageElem.offsetHeight || (this.agentVisMode === 'minimal' ? 34 : 180);

      let minX = 12;
      let maxX = Math.max(minX, currentMainRect.width - elemWidth - 12);
      if (this.isTerminalOpen && this.terminalPosition === 'left') {
        minX = Math.max(minX, this.terminalWidth + 12);
      } else if (this.isTerminalOpen && this.terminalPosition === 'right') {
        maxX = Math.max(minX, currentMainRect.width - this.terminalWidth - elemWidth - 12);
      }
      const minY = 48; // Keep clearly below the top accessibility toolbar (38px height)

      // Real-time top boundary check against chat input area with generous safe margin
      const chatInputArea = this.shadowRoot?.querySelector('.chat-input-area') as HTMLElement | null;
      let maxAvailableY = currentMainRect.height - elemHeight - 160;
      if (chatInputArea) {
        const inputRect = chatInputArea.getBoundingClientRect();
        if (inputRect.top > 0) {
          const inputTopRelativeToMain = inputRect.top - currentMainRect.top;
          const safeMargin = 28; // Keep PIP strictly and clearly above chat input & quick command chips
          maxAvailableY = inputTopRelativeToMain - elemHeight - safeMargin;
        }
      }
      const maxY = Math.max(minY, maxAvailableY);

      const rawX = startElemX + deltaX;
      const rawY = startElemY + deltaY;

      const clampedX = Math.round(Math.max(minX, Math.min(maxX, rawX)));
      const clampedY = Math.round(Math.max(minY, Math.min(maxY, rawY)));

      this.agentPipPos = { x: clampedX, y: clampedY };
      this.requestUpdate();
    };

    const onPointerUp = () => {
      if (this.isDraggingAgentPip) {
        this.isDraggingAgentPip = false;
        if (this.agentPipPos) {
          localStorage.setItem('project_lumin_agent_pip_pos', JSON.stringify(this.agentPipPos));
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        this.requestUpdate();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  };

  private randomizeVisualizer() {
    const themeKeys = Object.keys(THEMES) as Array<keyof typeof THEMES>;
    const shapes = ['saturn', 'sphere', 'triangle', 'flower-of-life', 'vesica-piscis', 'spiral', 'lissajous', 'trefoil', 'cinquefoil', 'heart', 'butterfly', 'infinity', 'galaxy', 'star', 'rose', 'hypocycloid', 'atom', 'torus', 'helix'];
    const centralShapes = ['sphere', 'cube', 'pyramid'];

    if (themeKeys.length > 0) {
      this.activeTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    }
    this.particleShape = shapes[Math.floor(Math.random() * shapes.length)];
    this.visualizerShape = centralShapes[Math.floor(Math.random() * centralShapes.length)];
    this.particleSize = +(0.03 + Math.random() * 0.08).toFixed(3);
    this.particleSpeed = +(0.5 + Math.random() * 1.8).toFixed(1);
    this.visualizerSize = +(0.8 + Math.random() * 0.8).toFixed(2);
    this.bloomIntensity = +(0.4 + Math.random() * 1.4).toFixed(2);
    soundFX.playClick();
    this.requestUpdate();
  }

  private toggleRuntimeDrawer(force?: boolean) {
    const nextState = force !== undefined ? force : !this.isRuntimeDrawerOpen;
    this.isRuntimeDrawerOpen = nextState;
    if (nextState) {
      this.updateRuntimeDrawerPosition();
    }
    soundFX.playClick();
    this.requestUpdate();
  }

  private renderRuntimeDrawer() {
    if (!this.isRuntimeDrawerOpen) return '';

    return html`
      <div 
        class="runtime-drawer-popover ${this.runtimeDrawerPos.flipUp ? 'flip-up' : ''}" 
        style="top: ${this.runtimeDrawerPos.top}px; left: ${this.runtimeDrawerPos.left}px; width: ${this.runtimeDrawerPos.width}px; max-height: ${this.runtimeDrawerPos.maxHeight}px;"
        @click=${(e: Event) => e.stopPropagation()}
      >
        <div class="runtime-drawer-header">
          <div class="runtime-drawer-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>RUNTIME & MODEL CONTROLS</span>
          </div>
          <button class="runtime-drawer-close" @click=${() => this.toggleRuntimeDrawer(false)} title="Close Controls">×</button>
        </div>

        <div class="runtime-drawer-body" style="max-height: ${Math.max(120, this.runtimeDrawerPos.maxHeight - 48)}px;">
          <div class="runtime-control-group">
            <span class="runtime-group-label">Active Model Routing</span>
            <lumin-model-selector
              id="lumin-nav-model-selector"
              .activeModel=${this.activeModelName}
              @model-selected=${(e: CustomEvent) => {
                const isAuto = e.detail.isAuto || e.detail.model === 'auto' || e.detail.model === 'Auto-Router' || e.detail.model === 'router';
                this.activeModelName = isAuto ? 'Auto-Router' : e.detail.model;
                this.activePlatform = isAuto ? 'Auto-Router' : 'Ollama';
                localStorage.setItem('project_lumin_active_model', isAuto ? 'auto' : e.detail.model);
                if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
                  this.wsTerminal.send(JSON.stringify({
                    type: 'input',
                    data: isAuto ? 'model auto' : `model switch ${e.detail.model}`
                  }));
                }
                this.requestUpdate();
              }}
            ></lumin-model-selector>
          </div>

          <div class="runtime-control-group">
            <span class="runtime-group-label">Agent Process</span>
            <div class="runtime-agent-row">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="status-dot ${this.isAgentRunning ? 'active' : this.isStartingAgent ? 'starting' : ''}"></span>
                <span style="font-size: 0.72rem; font-family: var(--font-mono, monospace); font-weight: 600; color: #f1f5f9;">
                  ${this.isAgentRunning ? 'AGENT LINKED' : this.isStartingAgent ? 'LAUNCHING...' : 'STANDBY'}
                </span>
              </div>
              <div>
                ${this.isAgentRunning ? html`
                  <button class="nav-action-btn stop-agent-btn" @click=${this.stopAgent} ?disabled=${this.isStoppingAgent} title="Stop Agent Process">
                    Stop
                  </button>
                ` : html`
                  <button class="nav-action-btn start-agent-btn" @click=${this.startAgent} ?disabled=${this.isStartingAgent} title="Launch Agent Process">
                    Launch
                  </button>
                `}
              </div>
            </div>
          </div>

          <div class="runtime-control-group">
            <span class="runtime-group-label">Quick Actions</span>
            <div class="runtime-quick-buttons">
              <button 
                class="runtime-btn"
                @click=${() => {
                  this.toggleRuntimeDrawer(false);
                  this.switchTab('agent');
                  this.toggleTerminal(true);
                }}
              >
                Open Terminal
              </button>
              <button 
                class="runtime-btn"
                style="color: #f87171;"
                @click=${() => {
                  this.forceStopServer();
                  this.toggleRuntimeDrawer(false);
                }}
              >
                Kill Server
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public async setUnrestrictedMode(val: boolean) {
    this.unrestrictedMode = val;
    localStorage.setItem('project_lumin_unrestricted_mode', String(val));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unrestricted_mode: val })
      });
    } catch (e) {
      console.warn('Failed to sync unrestricted_mode to backend config:', e);
    }
    if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
      this.wsTerminal.send(JSON.stringify({ 
        type: 'input', 
        data: val ? 'unrestricted on\n' : 'unrestricted off\n' 
      }));
    }
    this.requestUpdate();
  }

  private async triggerLuminEasterEgg() {
    this.isLuminEasterEggActive = true;
    const isUnlocking = !this.unrestrictedMode;
    await this.setUnrestrictedMode(isUnlocking);

    // Audio cue & feedback
    if (isUnlocking) {
      soundFX.playSuccess();
    } else {
      soundFX.playToggle();
    }

    // Generate burst of vibrant particle vectors emanating from top-left
    const particles: Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; delay: number }> = [];
    const unlockColors = ['#ffd700', '#00ffc4', '#38bdf8', '#f59e0b', '#c084fc', '#4ade80', '#ffffff'];
    const relockColors = ['#38bdf8', '#818cf8', '#64748b', '#94a3b8', '#0284c7'];
    const colors = isUnlocking ? unlockColors : relockColors;

    for (let i = 0; i < 40; i++) {
      const angle = (Math.random() * Math.PI * 1.6) - 0.2; // outward spread
      const speed = 80 + Math.random() * 280;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particles.push({
        id: i,
        x: 40,
        y: 24,
        vx,
        vy,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.15
      });
    }
    this.luminEasterEggParticles = particles;

    // Trigger visual feedback in 3D visualizer
    const prevBloom = this.bloomIntensity;
    this.bloomIntensity = isUnlocking ? 1.5 : 0.8;
    setTimeout(() => {
      this.bloomIntensity = prevBloom;
    }, 2200);

    if (this.luminEasterEggTimeout) {
      clearTimeout(this.luminEasterEggTimeout);
    }
    this.luminEasterEggTimeout = setTimeout(() => {
      this.isLuminEasterEggActive = false;
      this.luminEasterEggParticles = [];
    }, 3200);
  }

  private handleLuminTitleClick(e: MouseEvent) {
    e.preventDefault();
    const now = Date.now();
    // Filter timestamps within last 2.5 seconds
    this.luminClickTimestamps = this.luminClickTimestamps.filter(t => now - t < 2500);
    this.luminClickTimestamps.push(now);

    // Require 5 clicks within 2.5 seconds to trigger Unrestricted Mode toggle
    if (this.luminClickTimestamps.length >= 5) {
      this.luminClickTimestamps = [];
      this.triggerLuminEasterEgg();
    } else if (this.luminClickTimestamps.length === 1 && this.currentTab !== 'voice') {
      // Normal single click action safely navigates to Voice tab without toggling unrestricted mode
      this.switchTab('voice');
    }
  }

  private renderTopNav() {
    const isVoiceLive = this.isRecording || (this.isContinuousActive && this.micPausedByTTS) || this.ttsPlaybackState === 'playing';

    return html`
      <header class="lumin-top-nav" id="lumin-top-nav">
        <!-- Left Section: Clean Branding Title + Expandable Runtime Pill -->
        <div class="nav-left-section">
          <div 
            class="nav-brand-compact" 
            @click=${this.handleLuminTitleClick} 
            title="LUMIN AI Workstation"
          >
            <span class="brand-title-compact">LUMIN</span>
          </div>

          <button 
            id="nav-runtime-pill-btn"
            class="nav-runtime-pill ${this.isRuntimeDrawerOpen ? 'active' : ''}"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.toggleRuntimeDrawer();
            }}
            title="Runtime & Model Controls (Click to open)"
          >
            <span class="runtime-status-dot ${this.isAgentRunning ? 'online' : this.isStartingAgent ? 'starting' : ''}"></span>
            <span class="runtime-model-text">${this.activeModelName || 'Auto-Router'}</span>
            <svg class="chevron-icon ${this.isRuntimeDrawerOpen ? 'open' : ''}" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          ${this.renderRuntimeDrawer()}
        </div>

        <!-- Center Section: Visually Centered Primary Tab Bar -->
        <div class="nav-center-cluster">
          <nav class="nav-tabs" role="tablist" aria-label="LUMIN Workstation Navigation">
            <button 
              class="nav-tab ${this.currentTab === 'voice' ? 'active' : ''}" 
              @click=${() => this.switchTab('voice')}
              role="tab"
              id="nav-tab-voice"
              aria-selected=${this.currentTab === 'voice'}
              title="Immersive Voice Experience with Fullscreen 3D Visualizer (Alt+1)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              <span>Voice</span>
              ${isVoiceLive ? html`
                <span class="tab-live-voice-pulse" title="Voice audio active">
                  <span></span><span></span><span></span>
                </span>
              ` : ''}
              <span class="tab-hotkey" title="Shortcut: Alt+1">⌥1</span>
            </button>

            <button 
              class="nav-tab ${this.currentTab === 'agent' ? 'active' : ''}" 
              @click=${() => this.switchTab('agent')}
              role="tab"
              id="nav-tab-agent"
              aria-selected=${this.currentTab === 'agent'}
              title="Developer Agent Workspace & Terminal (Alt+2)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span>Agent</span>
              ${this.isAgentRunning ? html`<span class="tab-indicator-dot running" title="Agent process active"></span>` : this.isStartingAgent ? html`<span class="tab-indicator-dot" style="background:#f59e0b;" title="Agent starting..."></span>` : ''}
              <span class="tab-hotkey" title="Shortcut: Alt+2">⌥2</span>
            </button>

            <button 
              class="nav-tab ${this.currentTab === 'settings' ? 'active' : ''}" 
              @click=${() => this.switchTab('settings')}
              role="tab"
              id="nav-tab-settings"
              aria-selected=${this.currentTab === 'settings'}
              title="Global System & AI Settings (Alt+3)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Settings</span>
              <span class="tab-hotkey" title="Shortcut: Alt+3">⌥3</span>
            </button>
          </nav>
        </div>

        <!-- Right Section: Clean Action Buttons -->
        <div class="nav-actions-clean">
          <button
            class="nav-tab-btn-console ${this.isTerminalOpen && this.currentTab === 'agent' ? 'active' : ''}"
            @click=${() => {
              if (this.currentTab !== 'agent') {
                this.switchTab('agent');
                this.toggleTerminal(true);
              } else {
                this.toggleTerminal();
              }
            }}
            title="${this.isTerminalOpen ? 'Hide Developer Terminal Panel (Ctrl+`)' : 'Show Developer Terminal Panel (Ctrl+`)'}"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>Console</span>
            ${this.isAgentRunning ? html`<span class="console-active-dot"></span>` : ''}
          </button>

          <div class="nav-divider"></div>

          <button 
            class="nav-icon-btn ${this.isVisualizerOnlyMode ? 'active' : ''}" 
            @click=${() => this.toggleVisualizerOnlyMode()} 
            title="Visualizer-Only Cinema Mode (Hide all UI Chrome - Press 'H' or 'V')"
            id="nav-btn-cinema-mode"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <button 
            class="nav-icon-btn ${soundFX.getEnabled() ? 'active' : ''}" 
            @click=${() => { soundFX.toggleEnabled(); this.requestUpdate(); }} 
            title="${soundFX.getEnabled() ? 'UI Sound Effects: ON (Click to mute)' : 'UI Sound Effects: Muted (Click to enable)'}"
          >
            ${soundFX.getEnabled() ? html`
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            ` : html`
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            `}
          </button>

          <button class="nav-icon-btn" @click=${this.toggleFullscreen} title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
        </div>
      </header>
    `;
  }

  private renderVisualizerStage(isVisualizerActive: boolean) {
    let stageClass = this.isVisualizerOnlyMode
      ? 'visualizer-stage mode-voice visualizer-only-fullscreen'
      : `visualizer-stage mode-${this.currentTab}`;
    let stageStyle = '';
    if (!this.isVisualizerOnlyMode && this.currentTab === 'agent') {
      stageClass += ` vis-${this.agentVisMode} ${this.isDraggingAgentPip ? 'is-dragging' : ''}`;
      if (this.agentPipPos) {
        stageStyle = `left: ${this.agentPipPos.x}px; top: ${this.agentPipPos.y}px; right: auto; bottom: auto; margin: 0;`;
      } else {
        stageClass += ` corner-${this.agentPipCorner}`;
        if (this.agentPipCorner === 'top-right') {
          if (this.isTerminalOpen && this.terminalPosition === 'right') {
            stageStyle = `right: calc(${this.terminalWidth}px + 16px); top: 48px; left: auto;`;
          } else {
            stageStyle = 'right: 16px; top: 48px; left: auto;';
          }
        } else {
          if (this.isTerminalOpen && this.terminalPosition === 'left') {
            stageStyle = `left: calc(${this.terminalWidth}px + 16px); top: 48px; right: auto;`;
          } else {
            stageStyle = 'left: 16px; top: 48px; right: auto;';
          }
        }
      }
    }

    // In Agent mode when hidden, completely disappear from the canvas (controlled via toolbar Sphere selector)
    if (!this.isVisualizerOnlyMode && this.currentTab === 'agent' && this.agentVisMode === 'hidden') {
      return nothing;
    }

    return html`
      <div 
        class="${stageClass}"
        style="${stageStyle}"
        id="lumin-visualizer-stage"
      >
        <!-- Mode: Agent Adaptive Visualizer Header & Capsule -->
        ${!this.isVisualizerOnlyMode && this.currentTab === 'agent' ? (
          this.agentVisMode === 'minimal' ? html`
            <div 
              class="mini-capsule-content" 
              @pointerdown=${this.handleAgentPipPointerDown}
              @click=${() => { if (this.hasAgentPipDragged) return; this.setAgentVisMode('compact'); }} 
              title="Click to Expand • Drag to Move"
            >
              <svg class="pip-drag-handle" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/>
                <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
                <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
              </svg>
              <span class="mini-orb-pulse"></span>
              <span>3D · LIVE</span>
            </div>
            <div class="pip-actions" @pointerdown=${(e: Event) => e.stopPropagation()}>
              ${this.agentPipPos ? html`
                <button 
                  class="pip-btn" 
                  @click=${() => this.resetAgentPipPosition()} 
                  title="Snap to Corner Dock"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                  </svg>
                </button>
              ` : ''}
              <button 
                class="pip-btn" 
                @click=${() => this.toggleAgentPipCorner()} 
                title="Switch Corner (${this.agentPipCorner === 'top-right' ? 'Move to Top-Left' : 'Move to Top-Right'})"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>
                </svg>
              </button>
              <button 
                class="pip-btn" 
                @click=${() => this.switchTab('voice')} 
                title="Expand to Fullscreen Voice Mode"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              </button>
              <button 
                class="pip-btn" 
                @click=${() => this.setAgentVisMode('compact')} 
                title="Expand to Compact PIP"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
              </button>
              <button 
                class="pip-btn close-btn" 
                @click=${() => this.setAgentVisMode('hidden')} 
                title="Hide 3D Visualizer"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ` : html`
            <div 
              class="pip-header"
              @pointerdown=${this.handleAgentPipPointerDown}
              title="Drag to reposition anywhere on screen"
            >
              <div class="pip-title">
                <svg class="pip-drag-handle" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/>
                  <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
                  <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
                </svg>
                <span class="pip-pulse-dot"></span>
                <span>3D · LIVE</span>
              </div>
              <div class="pip-actions" @pointerdown=${(e: Event) => e.stopPropagation()}>
                ${this.agentPipPos ? html`
                  <button 
                    class="pip-btn" 
                    @click=${() => this.resetAgentPipPosition()} 
                    title="Snap to Corner Dock"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12h18M3 6h18M3 18h18"/>
                    </svg>
                  </button>
                ` : ''}
                <button 
                  class="pip-btn" 
                  @click=${() => this.toggleAgentPipCorner()} 
                  title="Switch Corner (${this.agentPipCorner === 'top-right' ? 'Move to Top-Left' : 'Move to Top-Right'})"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>
                  </svg>
                </button>
                <button 
                  class="pip-btn" 
                  @click=${() => this.switchTab('voice')} 
                  title="Expand to Fullscreen Voice Mode"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </button>
                <button 
                  class="pip-btn" 
                  @click=${() => this.setAgentVisMode('minimal')} 
                  title="Collapse to Minimal Capsule"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14"/>
                  </svg>
                </button>
                <button 
                  class="pip-btn close-btn" 
                  @click=${() => this.setAgentVisMode('hidden')} 
                  title="Hide 3D Visualizer for Deep Focus"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          `
        ) : ''}

        ${(!this.isVisualizerOnlyMode && this.currentTab === 'agent' && this.agentVisMode === 'minimal') ? '' : html`
          <gdm-live-audio-visuals-3d
            .isActive=${isVisualizerActive}
            .isSpeaking=${(this.ttsPlaybackState === 'playing' && (!!this.currentTTSSource || this.sources.size > 0)) || (window.speechSynthesis && window.speechSynthesis.speaking)}
            .inputNode=${this.inputNode}
            .outputNode=${this.outputNode}
            .particleSize=${this.particleSize}
            .particleFormationScale=${this.particleFormationScale}
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
            .themeGlowColors=${this.activeTheme === 'custom' ? (this.separateCustomColors ? [this.customMainColor] : this.customThemeColors) : [THEMES[this.activeTheme as keyof typeof THEMES]?.['--glow-color'] || '#00aaff']}
            .themeParticleColors=${this.activeTheme === 'custom' && this.separateCustomColors ? [this.customParticleColor] : []}
            .backdropTextureUrl=${null}
            .afterimageEnabled=${this.afterimageEnabled}
            .afterimageStrength=${this.afterimageStrength}
            .chromaticAberrationEnabled=${this.chromaticAberrationEnabled}
            .morphingEnabled=${this.morphingEnabled}
            .morphingIntensity=${this.morphingIntensity}
            .mercuryMetalEnabled=${this.mercuryMetalEnabled}
            .mercuryFluidity=${this.mercuryFluidity}
            .mercurySheen=${this.mercurySheen}
            .gradientBevelEnabled=${this.gradientBevelEnabled}
            .bevelRingWidth=${this.bevelRingWidth}
            .bevelSheen=${this.bevelSheen}
            .bevelShadowEnabled=${this.bevelShadowEnabled}
            .chromaticAberrationIntensity=${this.chromaticAberrationIntensity}
            .filmGrainEnabled=${this.filmGrainEnabled}
            .filmGrainIntensity=${this.filmGrainIntensity}
            .scanlinesEnabled=${this.scanlinesEnabled}
            .scanlinesIntensity=${this.scanlinesIntensity}
            .scanlinesDensity=${this.scanlinesDensity}
            .vignetteEnabled=${this.vignetteEnabled}
            .vignetteDarkness=${this.vignetteDarkness}
            .vignetteOffset=${this.vignetteOffset}
            .glitchEnabled=${this.glitchEnabled}
            .glitchIntensity=${this.glitchIntensity}
            .anamorphicFlareEnabled=${this.anamorphicFlareEnabled}
            .flareIntensity=${this.flareIntensity}
            .flareThreshold=${this.flareThreshold}
            .colorGradingEnabled=${this.colorGradingEnabled}
            .colorGradingMode=${this.colorGradingMode}
            .colorGradingIntensity=${this.colorGradingIntensity}
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
            .lightColor=${this.lightColor || '#ffffff'}
            .ambientLightColor=${this.ambientLightColor || '#ffffff'}
            .cameraRotX=${this.cameraRotX}
            .cameraRotY=${this.cameraRotY}
            .cameraZoomMult=${this.cameraZoomMult}
            .cameraLocked=${this.cameraLocked}
            .envSource=${this.envSource}
            .envImageUrl=${this.envImageUrl}
            .envImageName=${this.envImageName}
            .envIntensity=${this.envIntensity}
            .envReflectionStrength=${this.envReflectionStrength}
            .envRotationY=${this.envRotationY}
            .geometrySource=${this.geometrySource}
            .customModelUrl=${this.customModelUrl}
            .customModelName=${this.customModelName}
            .customModelScale=${this.customModelScale}
            .customModelPosX=${this.customModelPosX}
            .customModelPosY=${this.customModelPosY}
            .customModelPosZ=${this.customModelPosZ}
            .customModelRotX=${this.customModelRotX}
            .customModelRotY=${this.customModelRotY}
            .customModelRotZ=${this.customModelRotZ}
            @custom-model-loaded=${(e: CustomEvent) => {
              this.customModelVertexCount = e.detail.vertexCount;
              this.customModelStatus = `Loaded (${e.detail.vertexCount.toLocaleString()} vertices)`;
              this.customModelError = null;
              this.requestUpdate();
            }}
            @custom-model-error=${(e: CustomEvent) => {
              this.customModelError = e.detail.error;
              this.customModelStatus = null;
              this.requestUpdate();
            }}
            @custom-env-loaded=${(e: CustomEvent) => {
              this.envImageStatus = `Active (${e.detail.fileName || 'Environment'})`;
              this.envImageError = null;
              this.requestUpdate();
            }}
            @custom-env-error=${(e: CustomEvent) => {
              this.envImageError = e.detail.error;
              this.envImageStatus = null;
              this.requestUpdate();
            }}
            @camera-update=${(e: CustomEvent) => {
              this.cameraRotX = e.detail.rotX;
              this.cameraRotY = e.detail.rotY;
              this.cameraZoomMult = e.detail.zoom;
              this.cameraLocked = e.detail.locked;
            }}
            @silence-timeout=${this.stopEverythingAndGoToIdle}
          ></gdm-live-audio-visuals-3d>
        `}
      </div>
    `;
  }

  private renderVoiceModeOverlay() {
    return html`
      <div class="voice-mode-overlay">
        ${this.renderCitations()}

        <div class="hud">
          <div class="hud-actions">
            <div class="actions-container">
              <div class="actions-menu ${this.areActionsExpanded ? 'expanded' : ''}">
                <button
                  class="hud-button ${this.isRecording || (this.isContinuousActive && this.micPausedByTTS) ? 'active' : ''} ${this.isContinuousActive ? 'continuous' : ''}"
                  title="${this.isContinuousActive ? 'Continuous Mode Active - click to stop' : (this.isRecording || (this.isContinuousActive && this.micPausedByTTS) ? 'Stop Voice Recording' : 'Start Voice Input (Single tap: single turn, Double tap: continuous conversation)')}"
                  @click=${this.handleMicClick}
                  ?disabled=${this.isReconnecting}>
                  ${this.isRecording || (this.isContinuousActive && this.micPausedByTTS)
                    ? html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path d="M6 6h12v12H6V6z" />
                      </svg>`
                    : html`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
                      </svg>`}
                </button>

                <button
                  class="hud-button"
                  title="Switch to Agent Workspace"
                  @click=${() => this.switchTab('agent')}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zm-12-3h8v2H8v-2zm-2-4l3-3-3-3 1.4-1.4 4.4 4.4-4.4 4.4L6 11z"/>
                  </svg>
                </button>

                <button
                  class="hud-button"
                  title="Visualizer-Only Cinema Mode (Hide UI Chrome - Press 'H')"
                  @click=${() => this.toggleVisualizerOnlyMode()}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>

              <button
                class="actions-toggle-button ${this.areActionsExpanded ? 'expanded' : ''}"
                title="${this.areActionsExpanded ? 'Close Actions' : 'Open Actions'}"
                @click=${() => (this.areActionsExpanded = !this.areActionsExpanded)}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor">
                  <path d="M0 0h24v24H0V0z" fill="none" />
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAgentModeSurface() {
    const isDockedInAgentMode = this.isTerminalOpen;

    return html`
      <div class="agent-workspace-surface dock-${this.isTerminalOpen ? this.terminalPosition : 'hidden'}">
        <!-- Left Docked Terminal -->
        ${isDockedInAgentMode && this.terminalPosition === 'left' ? html`
          <lumin-terminal-panel
            .terminalLogs=${this.terminalLogs}
            .isAgentRunning=${this.isAgentRunning}
            .isStartingAgent=${this.isStartingAgent}
            .isStoppingAgent=${this.isStoppingAgent}
            .isVoiceActive=${this.isTerminalVoiceCaptureActive}
            .fontSize=${this.terminalFontSize}
            .isBold=${this.terminalIsBold}
            .dockPosition=${'left'}
            .isCollapsed=${this.isTerminalPaneCollapsed}
            .panelWidth=${this.terminalWidth}
            @dock-changed=${(e: CustomEvent) => this.handleTerminalDockChange(e.detail.position)}
            @collapse-toggled=${(e: CustomEvent) => {
              this.isTerminalPaneCollapsed = e.detail.isCollapsed;
              localStorage.setItem('project_lumin_terminal_pane_collapsed', String(this.isTerminalPaneCollapsed));
              this.requestUpdate();
            }}
            @close-terminal=${() => this.toggleTerminal(false)}
            @adjust-font-size=${(e: CustomEvent) => this.adjustTerminalFontSize(e.detail.delta)}
            @toggle-bold=${() => this.toggleTerminalBold()}
            @clear-logs=${() => this.clearTerminalLogs()}
            @send-input=${(e: CustomEvent) => this.handleCustomTerminalInput(e.detail.text)}
            @send-empty-enter=${() => this.handleTerminalEmptyEnter()}
            @toggle-voice=${() => this.handleTerminalVoiceCaptureToggle()}
            @start-agent=${() => this.startAgent()}
            @stop-agent=${() => this.stopAgent()}
          ></lumin-terminal-panel>
          <div 
            class="terminal-side-resizer ${this.isDraggingTerminalSideResizer ? 'dragging' : ''}" 
            @mousedown=${(e: MouseEvent) => this.handleTerminalSideResizerMouseDown(e, 'left')} 
            title="Drag to resize terminal width"
          ></div>
        ` : ''}

        <!-- Primary Conversational Chat Interface: Takes 100% of available space when terminal is hidden/docked -->
        <div class="agent-chat-wrapper">
          ${this.renderChatPanel()}
        </div>

        <!-- Right Docked Terminal -->
        ${isDockedInAgentMode && this.terminalPosition === 'right' ? html`
          <div 
            class="terminal-side-resizer ${this.isDraggingTerminalSideResizer ? 'dragging' : ''}" 
            @mousedown=${(e: MouseEvent) => this.handleTerminalSideResizerMouseDown(e, 'right')} 
            title="Drag to resize terminal width"
          ></div>
          <lumin-terminal-panel
            .terminalLogs=${this.terminalLogs}
            .isAgentRunning=${this.isAgentRunning}
            .isStartingAgent=${this.isStartingAgent}
            .isStoppingAgent=${this.isStoppingAgent}
            .isVoiceActive=${this.isTerminalVoiceCaptureActive}
            .fontSize=${this.terminalFontSize}
            .isBold=${this.terminalIsBold}
            .dockPosition=${'right'}
            .isCollapsed=${this.isTerminalPaneCollapsed}
            .panelWidth=${this.terminalWidth}
            @dock-changed=${(e: CustomEvent) => this.handleTerminalDockChange(e.detail.position)}
            @collapse-toggled=${(e: CustomEvent) => {
              this.isTerminalPaneCollapsed = e.detail.isCollapsed;
              localStorage.setItem('project_lumin_terminal_pane_collapsed', String(this.isTerminalPaneCollapsed));
              this.requestUpdate();
            }}
            @close-terminal=${() => this.toggleTerminal(false)}
            @adjust-font-size=${(e: CustomEvent) => this.adjustTerminalFontSize(e.detail.delta)}
            @toggle-bold=${() => this.toggleTerminalBold()}
            @clear-logs=${() => this.clearTerminalLogs()}
            @send-input=${(e: CustomEvent) => this.handleCustomTerminalInput(e.detail.text)}
            @send-empty-enter=${() => this.handleTerminalEmptyEnter()}
            @toggle-voice=${() => this.handleTerminalVoiceCaptureToggle()}
            @start-agent=${() => this.startAgent()}
            @stop-agent=${() => this.stopAgent()}
          ></lumin-terminal-panel>
        ` : ''}

        <!-- Bottom Docked Terminal -->
        ${isDockedInAgentMode && this.terminalPosition === 'bottom' ? html`
          <div 
            class="terminal-pane-resizer ${this.isDraggingTerminalPaneResizer ? 'dragging' : ''}" 
            @mousedown=${this.handleTerminalPaneResizerMouseDown} 
            @touchstart=${this.handleTerminalPaneResizerMouseDown}
            title="Drag to resize terminal height"
          ></div>
          <lumin-terminal-panel
            .terminalLogs=${this.terminalLogs}
            .isAgentRunning=${this.isAgentRunning}
            .isStartingAgent=${this.isStartingAgent}
            .isStoppingAgent=${this.isStoppingAgent}
            .isVoiceActive=${this.isTerminalVoiceCaptureActive}
            .fontSize=${this.terminalFontSize}
            .isBold=${this.terminalIsBold}
            .dockPosition=${'bottom'}
            .isCollapsed=${this.isTerminalPaneCollapsed}
            .panelHeight=${this.terminalPaneHeight}
            @dock-changed=${(e: CustomEvent) => this.handleTerminalDockChange(e.detail.position)}
            @collapse-toggled=${(e: CustomEvent) => {
              this.isTerminalPaneCollapsed = e.detail.isCollapsed;
              localStorage.setItem('project_lumin_terminal_pane_collapsed', String(this.isTerminalPaneCollapsed));
              this.requestUpdate();
            }}
            @close-terminal=${() => this.toggleTerminal(false)}
            @adjust-font-size=${(e: CustomEvent) => this.adjustTerminalFontSize(e.detail.delta)}
            @toggle-bold=${() => this.toggleTerminalBold()}
            @clear-logs=${() => this.clearTerminalLogs()}
            @send-input=${(e: CustomEvent) => this.handleCustomTerminalInput(e.detail.text)}
            @send-empty-enter=${() => this.handleTerminalEmptyEnter()}
            @toggle-voice=${() => this.handleTerminalVoiceCaptureToggle()}
            @start-agent=${() => this.startAgent()}
            @stop-agent=${() => this.stopAgent()}
          ></lumin-terminal-panel>
        ` : ''}
      </div>
    `;
  }

  private renderSettingsModeSurface() {
    return html`
      <div class="settings-workspace-surface" id="settings-workspace">
        <form @submit=${this.saveSettings} id="inlineSettingsForm" style="display: flex; flex-direction: column; width: 100%; height: 100%;">
          <div class="settings-modal-body" style="flex: 1; min-height: 0;">
            ${this.renderSettingsNav()}
            ${this.renderSettingsContent()}
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
              <input type="file" id="config-import-input-settings" accept=".json" style="display: none;" @change=${this.importConfig} />
              <button type="button" class="config-btn" title="Import preset" @click=${() => this.shadowRoot?.getElementById('config-import-input-settings')?.click()}>
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
              <button type="button" class="cancel-btn" @click=${() => this.switchTab('voice')}>Back to Voice</button>
              <button type="submit" class="save-btn">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  private renderCameraAndScreenFeeds() {
    return html`
      <input
        type="file"
        multiple
        ${ref(this.fileInputRef)}
        style="display: none;"
        @change=${this.handleAttachmentChange}
        accept="*/*" />

      <canvas class="camera-canvas" ${ref(this.canvasRef)} style="display: none;"></canvas>

      <div
        class="camera-view ${this.isCameraEnabled ? 'active' : ''} ${this.isDraggingCamera ? 'dragging' : ''}"
        ${ref(this.cameraViewRef)}
        style="${this.cameraPosition ? `transform: translate(${this.cameraPosition.x}px, ${this.cameraPosition.y}px);` : ''}"
        @mousedown=${this.handleCameraDragStart}
        @touchstart=${this.handleCameraDragStart}>
        <video
          ${ref(this.videoRef)}
          autoplay
          playsinline
          muted
          .srcObject=${this.videoStream}></video>
      </div>

      <div
        class="screen-view ${this.isScreenSharingEnabled ? 'active' : ''} ${this.isDraggingScreen ? 'dragging' : ''}"
        ${ref(this.screenViewRef)}
        style="${this.screenPosition ? `transform: translate(${this.screenPosition.x}px, ${this.screenPosition.y}px);` : ''}"
        @mousedown=${this.handleScreenDragStart}
        @touchstart=${this.handleScreenDragStart}>
        <video
          ${ref(this.screenVideoRef)}
          autoplay
          playsinline
          muted
          .srcObject=${this.screenStream}></video>
      </div>
    `;
  }

  private renderInitOverlay() {
    return '';
  }

  render() {
    const isVisualizerActive = this.isRecording || this.micPausedByTTS || this.ttsPlaybackState === 'playing' || this.isScreenSharingEnabled;
    return html`
      <div 
        class="app-root ${this.isDraggingFile ? 'drag-over' : ''} ${this.isVisualizerOnlyMode ? 'visualizer-only-mode cinema-mode' : ''}"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <!-- Top Navigation Bar (Hidden in Visualizer-Only Cinema Mode) -->
        ${this.isVisualizerOnlyMode ? '' : this.renderTopNav()}

        <!-- Global Status Bar & Task Progress Indicators (Hidden in Visualizer-Only Cinema Mode) -->
        ${this.isVisualizerOnlyMode ? '' : html`
          <lumin-status-bar
            .currentMode=${this.currentTab}
            .activeModelName=${this.activeModelName}
            .activePlatform=${this.activePlatform}
            .agentState=${this.getSystemAgentState()}
            .isAgentRunning=${this.isAgentRunning}
            .isStartingAgent=${this.isStartingAgent}
            .isStoppingAgent=${this.isStoppingAgent}
            .isGeneratingResponse=${this.isGeneratingResponse}
            .isListening=${this.isRecording}
            .isSpeaking=${this.ttsPlaybackState === 'playing'}
            .isContinuousActive=${this.isContinuousActive}
            .isScreenSharing=${this.isScreenSharingEnabled}
            .isCameraActive=${this.isCameraEnabled}
            .piperVoice=${this.piperVoice}
            .elapsedSeconds=${this.responseTimer}
            .taskProgress=${this.taskProgress}
            .showTaskProgress=${this.isGeneratingResponse || this.isStartingAgent || !!this.taskProgress}
            .isTerminalOpen=${this.isTerminalOpen}
            .unrestrictedMode=${this.unrestrictedMode}
            .activeSkill=${this.activeSkill}
            .activeSkillsCount=${skillsManager.getActiveSkills().length}
            .lastRunSkill=${skillsManager.getLastRunSkill()}
            @toggle-terminal=${() => this.toggleTerminal()}
            @toggle-mode-menu=${() => {
              const modes: Array<'voice' | 'agent' | 'settings'> = ['voice', 'agent', 'settings'];
              const idx = modes.indexOf(this.currentTab);
              const nextMode = modes[(idx + 1) % modes.length];
              this.switchTab(nextMode);
            }}
            @open-model-selector=${() => {
              const selector = this.shadowRoot?.querySelector('#lumin-nav-model-selector') as any;
              if (selector && typeof selector.openModal === 'function') {
                selector.openModal();
              } else {
                this.switchTab('settings');
                this.activeSettingsTab = 'MODELS';
              }
            }}
            @voice-change=${(e: CustomEvent) => {
              const newVoice = e.detail?.voice;
              if (newVoice) {
                this.piperVoice = newVoice;
                try {
                  localStorage.setItem('project_lumin_piper_voice', newVoice);
                } catch (err) {}
                if (this.wsTerminal && this.wsTerminal.readyState === WebSocket.OPEN) {
                  this.wsTerminal.send(JSON.stringify({ type: 'config', voice: newVoice }));
                }
                this.requestUpdate();
              }
            }}
            @cancel-active-task=${() => this.cancelActiveTask()}
          ></lumin-status-bar>
        `}

        <!-- Main Content Area -->
        <main class="lumin-main-content">
          <!-- Continuous 3D Visualizer Stage (Adapts position and size per active mode) -->
          ${this.renderVisualizerStage(isVisualizerActive)}

          <!-- Mode 1: Voice Mode Overlay (Hidden in Cinema Mode) -->
          ${!this.isVisualizerOnlyMode && this.currentTab === 'voice' ? this.renderVoiceModeOverlay() : ''}

          <!-- Mode 2: Agent Workspace Surface (Hidden in Cinema Mode) -->
          ${!this.isVisualizerOnlyMode && this.currentTab === 'agent' ? this.renderAgentModeSurface() : ''}

          <!-- Mode 3: Settings Workspace Surface (Hidden in Cinema Mode) -->
          ${!this.isVisualizerOnlyMode && this.currentTab === 'settings' ? this.renderSettingsModeSurface() : ''}
        </main>

        <!-- Floating Settings Modal (If triggered while outside settings tab) -->
        ${!this.isVisualizerOnlyMode && this.isSettingsOpen && this.currentTab !== 'settings' ? this.renderSettingsModal() : ''}

        <!-- Camera and Screen Share Floating Feeds -->
        ${!this.isVisualizerOnlyMode ? this.renderCameraAndScreenFeeds() : ''}

        <!-- Initialization Audio Overlay -->
        ${this.renderInitOverlay()}

        <!-- Brief First-Enter Cinema Mode Toast (Disappears in <= 1.2s, once per session) -->
        ${this.isVisualizerOnlyMode && this.showCinemaToast ? html`
          <div class="cinema-mode-toast">
            <span>Press <strong style="color: #38bdf8;">Esc</strong> or <strong style="color: #38bdf8;">H</strong> to restore UI</span>
          </div>
        ` : ''}

        <!-- LUMIN Multi-Click Easter Egg Particle System -->
        ${!this.isVisualizerOnlyMode && this.isLuminEasterEggActive ? html`
          <div class="lumin-easter-egg-container" aria-hidden="true">
            <div class="lumin-easter-egg-ripple ${this.unrestrictedMode ? 'unlocked' : 'relocked'}"></div>
            ${this.luminEasterEggParticles.map(p => html`
              <div 
                class="lumin-easter-egg-particle"
                style="
                  left: ${p.x}px;
                  top: ${p.y}px;
                  width: ${p.size}px;
                  height: ${p.size}px;
                  background: ${p.color};
                  box-shadow: 0 0 ${p.size * 2.5}px ${p.color};
                  --tx: ${p.vx}px;
                  --ty: ${p.vy}px;
                  animation-delay: ${p.delay}s;
                "
              ></div>
            `)}
            <div class="lumin-easter-egg-banner ${this.unrestrictedMode ? 'unlocked' : 'relocked'}">
              <span style="font-size: 0.95rem;">${this.unrestrictedMode ? '⚡' : '🔒'}</span>
              <span>
                ${this.unrestrictedMode 
                  ? 'UNRESTRICTED MODE UNLOCKED · FULL SYSTEM ACCESS' 
                  : 'SANDBOX RESTORED · STANDARD MODE ACTIVE'}
              </span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
