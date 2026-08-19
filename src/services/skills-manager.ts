/**
 * LUMIN Skills Layer Manager
 * 
 * Reusable capability packs ("Give him jobs") in the Hermes/OpenClaw architecture:
 * - Structured skill definitions (name, description, category, trigger hints, tools, instructions)
 * - Built-in operational skills + user-defined custom skills
 * - Natural language and 1-click execution engine
 * - Execution state, last run timestamps, and result summaries
 */

import { contextManager } from './context-manager';

export interface LuminSkill {
  id: string;
  name: string;
  description: string;
  category: 'Daily Routines' | 'System & Dev' | 'Research & Analysis' | 'Creative & Ambient' | 'Custom';
  icon: string;
  triggerHints: string[];
  requiredTools: string[];
  instructions: string;
  isEnabled: boolean;
  isCustom?: boolean;
  lastRunAt?: string | null;
  lastRunStatus?: 'success' | 'failed' | null;
  lastResultSummary?: string | null;
}

export interface SkillExecutionContext {
  activeModel: string;
  activePlatform: string;
  unrestrictedMode: boolean;
  visualizerShape: string;
  activeTheme: string;
  gpuInfo?: string;
  audioState?: string;
  userQuery?: string;
}

export interface SkillExecutionResult {
  skillId: string;
  skillName: string;
  success: boolean;
  outputText: string;
  executionTimeMs: number;
  timestamp: string;
}

export const BUILTIN_SKILLS: LuminSkill[] = [
  {
    id: 'morning_brief',
    name: 'Morning Brief',
    description: 'Compiles an actionable morning briefing: calendar date & time, system status, active model health, durable memory priorities, and recommended focus tasks.',
    category: 'Daily Routines',
    icon: '☀️',
    triggerHints: ['morning brief', 'run morning brief', 'give me my morning brief', 'daily briefing', 'morning briefing', 'start my day'],
    requiredTools: ['context_memory', 'system_clock', 'status_monitor'],
    instructions: `Generate an executive Morning Briefing tailored to the user.
1. Greet the user by name (from USER.md) with energetic, professional composure.
2. State current Date and Time clearly.
3. System & Model Status: Report the active neural engine, access level (Sandboxed vs Unrestricted), and runtime health.
4. Memory & Priority Highlights: Extract top active projects and commitments from MEMORY.md.
5. Action Plan: Suggest 3 prioritized, high-leverage focus items for today.`,
    isEnabled: true,
  },
  {
    id: 'daily_status',
    name: 'Daily Status & Workflow Check',
    description: 'Audits current agent runtime, active cognitive pipeline, memory store status, connected MCP tools, and pending workflows.',
    category: 'System & Dev',
    icon: '📊',
    triggerHints: ['daily status', 'workflow check', 'run daily status', 'agent status check', 'system status check'],
    requiredTools: ['runtime_harness', 'mcp_registry', 'memory_manager'],
    instructions: `Perform an operational status and workflow check.
1. Active Cognitive Model & Platform Engine status.
2. Context Layer Status: Confirm USER.md, IDENTITY.md, RULES.md, and MEMORY.md are synced.
3. Capabilities & MCP status.
4. Access Level & Sandboxing posture.
5. Provide a crisp 1-sentence readiness summary.`,
    isEnabled: true,
  },
  {
    id: 'system_diagnostics',
    name: 'System Diagnostics Report',
    description: 'Comprehensive audit of WebGL 2.0 3D GPU acceleration, WebAudio 48kHz synthesis pipeline, memory footprint, access policy, and LLM latency.',
    category: 'System & Dev',
    icon: '⚡',
    triggerHints: ['diagnostics report', 'run diagnostics', 'system diagnostics', 'hardware telemetry report', 'audit system'],
    requiredTools: ['webgl_telemetry', 'webaudio_analyser', 'hardware_probe', 'access_governor'],
    instructions: `Compile a technical System Diagnostics & Telemetry Report.
1. Hardware & Acceleration: WebGL 2.0 renderer profile, frame target (60 FPS), GPU state.
2. Audio & Speech: WebAudio 48kHz pipeline, active TTS voice engine, STT state.
3. Memory & Runtime: Sandbox memory footprint, active process bridge.
4. Access Policy: Explicitly confirm if runtime is SANDBOXED or UNRESTRICTED.
5. Overall Health: State whether all subsystems are nominal.`,
    isEnabled: true,
  },
  {
    id: 'deep_research',
    name: 'Deep Research & Synthesis',
    description: 'Applies a structured multi-phase research framework to break down complex engineering topics or questions into Hypothesis, Findings, Trade-offs, and Actionable Steps.',
    category: 'Research & Analysis',
    icon: '🔬',
    triggerHints: ['deep research', 'research topic', 'synthesize topic', 'analyze problem', 'run research'],
    requiredTools: ['reasoning_engine', 'document_synthesis', 'markdown_formatter'],
    instructions: `Execute a structured Deep Research & Synthesis workflow on the user's topic.
1. Problem Decomposition & Core Hypothesis.
2. Technical Findings & Architectural Approaches.
3. Trade-off Matrix (Performance vs Complexity vs Maintainability).
4. Direct Recommendation & Next Actionable Steps.`,
    isEnabled: true,
  },
  {
    id: 'ambient_architect',
    name: '3D Visualizer & Ambient Architect',
    description: 'Inspects visualizer geometry, theme colorways, post-processing shaders, and audio reactivity, then tunes or recommends scene presets.',
    category: 'Creative & Ambient',
    icon: '🪐',
    triggerHints: ['ambient architect', 'visualizer tune', 'optimize visualizer', 'recommend theme', 'ambient scene'],
    requiredTools: ['visualizer_controller', 'shader_pipeline', 'theme_matrix'],
    instructions: `Analyze and architect the ambient visualizer environment.
1. Current Geometry & Shape profile.
2. Color Palette & Lighting harmony.
3. Post-Processing & Shader synergy (bloom, afterimage trails, mercury fluid, chromatic aberration).
4. Recommend or apply curated signature presets (Liquid Chrome, Emerald Matrix, Solar Supernova, Arcane Quantum, Glacial Prism).`,
    isEnabled: true,
  }
];

const SKILLS_STORAGE_KEY = 'project_lumin_skills_registry';
const SKILLS_HISTORY_KEY = 'project_lumin_skills_history';

export class SkillsManager {
  private static instance: SkillsManager;
  private skills: LuminSkill[] = [];
  private executionHistory: SkillExecutionResult[] = [];
  private listeners: Set<() => void> = new Set();
  public syncStatus: 'idle' | 'synced' | 'saving' | 'error' = 'idle';
  public lastSyncedAt: string | null = null;

  private constructor() {
    this.loadSkills();
  }

  public static getInstance(): SkillsManager {
    if (!SkillsManager.instance) {
      SkillsManager.instance = new SkillsManager();
    }
    return SkillsManager.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in skillsManager listener:', e);
      }
    }
  }

  public loadSkills(): LuminSkill[] {
    try {
      const saved = localStorage.getItem(SKILLS_STORAGE_KEY);
      if (saved) {
        const parsed: LuminSkill[] = JSON.parse(saved);
        const customSkills = parsed.filter(s => s.isCustom);
        const savedBuiltinsMap = new Map(parsed.filter(s => !s.isCustom).map(s => [s.id, s]));

        this.skills = [
          ...BUILTIN_SKILLS.map(builtin => {
            const savedState = savedBuiltinsMap.get(builtin.id);
            if (savedState) {
              return {
                ...builtin,
                isEnabled: typeof savedState.isEnabled === 'boolean' ? savedState.isEnabled : builtin.isEnabled,
                lastRunAt: savedState.lastRunAt || null,
                lastRunStatus: savedState.lastRunStatus || null,
                lastResultSummary: savedState.lastResultSummary || null
              };
            }
            return builtin;
          }),
          ...customSkills
        ];
      } else {
        this.skills = [...BUILTIN_SKILLS];
      }

      const historySaved = localStorage.getItem(SKILLS_HISTORY_KEY);
      if (historySaved) {
        this.executionHistory = JSON.parse(historySaved);
      }

      // Fetch authoritative skills from disk via /api/skills
      this.fetchServerSkills();
    } catch (e) {
      console.warn('Failed to load skills from localStorage, using defaults:', e);
      this.skills = [...BUILTIN_SKILLS];
    }
    return this.skills;
  }

  public async fetchServerSkills(): Promise<void> {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.skills) && data.skills.length > 0) {
          this.skills = data.skills;
          this.syncStatus = 'synced';
          this.lastSyncedAt = data.syncedAt || new Date().toISOString();
          try {
            localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(this.skills));
          } catch (e) {}
          this.notifyListeners();
          return;
        }
      }
      this.syncStatus = 'synced';
      this.notifyListeners();
    } catch (e) {
      console.warn('Could not fetch server skills from /api/skills (offline mode):', e);
      this.syncStatus = 'error';
      this.notifyListeners();
    }
  }

  public async saveToServer(): Promise<boolean> {
    this.syncStatus = 'saving';
    this.notifyListeners();
    try {
      localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(this.skills));
      localStorage.setItem(SKILLS_HISTORY_KEY, JSON.stringify(this.executionHistory.slice(-20)));

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: this.skills })
      });
      if (res.ok) {
        const data = await res.json();
        this.syncStatus = 'synced';
        this.lastSyncedAt = data.syncedAt || new Date().toISOString();
        this.notifyListeners();
        return true;
      }
      this.syncStatus = 'error';
      this.notifyListeners();
      return false;
    } catch (e) {
      console.error('Error saving skills to server:', e);
      this.syncStatus = 'error';
      this.notifyListeners();
      return false;
    }
  }

  public saveSkills(): void {
    try {
      localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(this.skills));
      localStorage.setItem(SKILLS_HISTORY_KEY, JSON.stringify(this.executionHistory.slice(-20)));
      this.saveToServer();
    } catch (e) {
      console.error('Error saving skills:', e);
    }
  }

  public getAllSkills(): LuminSkill[] {
    return this.skills;
  }

  public getActiveSkills(): LuminSkill[] {
    return this.skills.filter(s => s.isEnabled);
  }

  public getSkillById(id: string): LuminSkill | undefined {
    return this.skills.find(s => s.id === id);
  }

  public toggleSkill(id: string, enabled?: boolean): void {
    const skill = this.skills.find(s => s.id === id);
    if (skill) {
      skill.isEnabled = enabled !== undefined ? enabled : !skill.isEnabled;
      this.saveSkills();
    }
  }

  public addCustomSkill(skill: Omit<LuminSkill, 'id' | 'isCustom'>): LuminSkill {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newSkill: LuminSkill = {
      ...skill,
      id,
      category: 'Custom',
      isCustom: true,
      isEnabled: true,
      lastRunAt: null,
      lastRunStatus: null,
      lastResultSummary: null
    };
    this.skills.push(newSkill);
    this.saveSkills();
    return newSkill;
  }

  public updateSkill(id: string, updates: Partial<LuminSkill>): void {
    const idx = this.skills.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.skills[idx] = { ...this.skills[idx], ...updates };
      this.saveSkills();
    }
  }

  public deleteSkill(id: string): boolean {
    const initialLen = this.skills.length;
    this.skills = this.skills.filter(s => s.id !== id || !s.isCustom);
    if (this.skills.length !== initialLen) {
      this.saveSkills();
      return true;
    }
    return false;
  }

  public async resetToDefaults(): Promise<void> {
    this.skills = [...BUILTIN_SKILLS];
    await this.saveToServer();
  }

  /**
   * Matches a natural language query against trigger hints of enabled skills.
   */
  public matchSkill(query: string): LuminSkill | null {
    if (!query || typeof query !== 'string') return null;
    const clean = query.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ');

    // Check for explicit "run skill <name>" or "execute skill <name>" syntax
    const explicitMatch = clean.match(/^(?:run|execute|launch|start|trigger)\s+(?:skill\s+)?([a-z0-9\s_-]+)$/i);
    if (explicitMatch && explicitMatch[1]) {
      const target = explicitMatch[1].trim();
      const direct = this.skills.find(s => s.isEnabled && (
        s.id.toLowerCase() === target ||
        s.name.toLowerCase() === target ||
        target.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(target)
      ));
      if (direct) return direct;
    }

    // Check for trigger phrase containment
    for (const skill of this.getActiveSkills()) {
      for (const hint of skill.triggerHints) {
        const cleanHint = hint.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.includes(cleanHint) || cleanHint.includes(clean)) {
          return skill;
        }
      }
    }

    return null;
  }

  /**
   * Formats a complete execution prompt for a skill, incorporating Context + Runtime + Instructions.
   * Execution prompt includes active Context (USER/IDENTITY/RULES/MEMORY) and skill.instructions.
   */
  public buildSkillExecutionPrompt(skill: LuminSkill, context: SkillExecutionContext): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const contextBlock = contextManager.buildPromptContextBlock({
      'Current Date': dateStr,
      'Current Time': timeStr,
      'Active Model': context.activeModel || 'llama3.2:3b',
      'Platform Engine': context.activePlatform || 'Ollama',
      'Access Policy': context.unrestrictedMode ? 'UNRESTRICTED (Full System Access)' : 'SANDBOXED (Protected Workspace)',
      'Active Visualizer': `${context.visualizerShape || 'Sphere'} (${context.activeTheme || 'Default'} theme)`,
      'GPU Telemetry': context.gpuInfo || 'WebGL 2.0 60 FPS',
      'Audio Pipeline': context.audioState || 'WebAudio 48kHz'
    });

    return `${contextBlock}

[SKILL EXECUTION PACK: ${skill.name.toUpperCase()}]
Description: ${skill.description}
Required Tools: ${skill.requiredTools.join(', ')}
Category: ${skill.category}

[SPECIFIC JOB INSTRUCTIONS]
${skill.instructions}

${context.userQuery ? `[USER INPUT QUERY]\n${context.userQuery}\n` : ''}
Execute this job immediately. Provide a complete, polished, and structured response.`;
  }

  /**
   * Records a completed execution result and persists updated timestamps/summaries to disk.
   */
  public recordExecution(skillId: string, outputText: string, durationMs: number, success = true): void {
    const skill = this.getSkillById(skillId);
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // First 120 chars as summary
    const summary = outputText.replace(/\n+/g, ' ').substring(0, 120) + (outputText.length > 120 ? '...' : '');

    if (skill) {
      skill.lastRunAt = timestamp;
      skill.lastRunStatus = success ? 'success' : 'failed';
      skill.lastResultSummary = summary;
    }

    const res: SkillExecutionResult = {
      skillId,
      skillName: skill?.name || skillId,
      success,
      outputText,
      executionTimeMs: durationMs,
      timestamp: new Date().toISOString()
    };

    this.executionHistory.push(res);
    this.saveSkills();

    // Also trigger dedicated record endpoint for instantaneous disk sync
    try {
      fetch('/api/skills/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          lastRunAt: timestamp,
          lastRunStatus: success ? 'success' : 'failed',
          lastResultSummary: summary
        })
      }).catch(() => {});
    } catch (e) {}
  }

  public getExecutionHistory(): SkillExecutionResult[] {
    return this.executionHistory;
  }

  /**
   * Returns the most recently executed skill status for compact UI indicators.
   */
  public getLastRunSkill(): { id: string; name: string; icon: string; success: boolean; time: string; summary?: string } | null {
    if (this.executionHistory.length > 0) {
      const last = this.executionHistory[this.executionHistory.length - 1];
      const skill = this.getSkillById(last.skillId);
      const timeFormatted = new Date(last.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return {
        id: last.skillId,
        name: last.skillName,
        icon: skill?.icon || '⚡',
        success: last.success,
        time: timeFormatted,
        summary: skill?.lastResultSummary || undefined
      };
    }
    
    // Fallback: check if any skill has lastRunAt populated
    const recentlyRun = this.skills.find(s => s.lastRunAt);
    if (recentlyRun && recentlyRun.lastRunAt) {
      return {
        id: recentlyRun.id,
        name: recentlyRun.name,
        icon: recentlyRun.icon,
        success: recentlyRun.lastRunStatus !== 'failed',
        time: recentlyRun.lastRunAt,
        summary: recentlyRun.lastResultSummary || undefined
      };
    }

    return null;
  }
}

export const skillsManager = SkillsManager.getInstance();
