/**
 * LUMIN Context Layer Manager
 * 
 * Manages the first-class User Context workspace (Hermes/OpenClaw-style architecture):
 * - lumin_context/USER.md     (Who the user is, background, goals, preferences)
 * - lumin_context/IDENTITY.md (How LUMIN speaks, persona, posture, behavioral directives)
 * - lumin_context/MEMORY.md   (Durable facts, learned preferences, project history)
 * - lumin_context/RULES.md    (Hard constraints, safety policies, output styling)
 */

export interface LuminContextStore {
  user: string;
  identity: string;
  memory: string;
  rules: string;
  lastUpdated: string;
}

export const DEFAULT_USER_CONTEXT = `# USER.md — User Profile & Preferences
## Identity
- **Name**: User
- **Role**: Software Engineer & Creative Technologist
- **Primary Languages**: TypeScript, Python, Rust, Go
- **Environment**: Linux / Web Local-First Agent Runtime

## Goals & Workflows
- Building high-performance local AI agent workflows and creative interfaces.
- Prefers concise, direct responses with actionable code and minimal conversational filler.
- Appreciates proactive system health diagnostics, performance metrics, and clean architecture.

## Interaction Preferences
- Code Style: Modern TypeScript, modular functions, strict types, zero superfluous comments.
- Tone: Professional, competent, technical, sharp.
`;

export const DEFAULT_IDENTITY_CONTEXT = `# IDENTITY.md — LUMIN Personality & Directives
## Core Persona
You are **LUMIN** — an advanced local-first personal AI agent runtime.
You operate with senior-staff engineering precision, deep systems empathy, and creative visual elegance.

## Communication Philosophy
- **Direct & High-Agency**: Solve problems completely. Never give half-baked solutions or placeholder stubs.
- **Architectural Rigor**: Maintain clear boundaries between Model (brain), Context (identity & memory), Skills (jobs), and Harness (runtime).
- **Proactive & Grounded**: Acknowledge local execution context, hardware constraints, and active tools.

## Vocal & Conversational Nuance
- When speaking over TTS, keep spoken sentences natural, rhythmic, and punchy.
- Avoid reading out dense raw JSON, URLs, or long regexes aloud.
`;

export const DEFAULT_MEMORY_CONTEXT = `# MEMORY.md — Durable Knowledge & Learned Preferences
## System Milestones
- [${new Date().toISOString().split('T')[0]}] LUMIN v9.0 personal agent architecture initialized.
- [Context Layer] User profile, identity guidelines, rules, and skills system configured.

## Active Projects & Notes
- Working on LUMIN local AI agent runtime enhancements.
- 3D Visualizer: Real-time WebGL audio-reactive geometry and shader pipeline active.
- Access Policy: Sandboxed local execution with Unrestricted mode available via system authorization.
`;

export const DEFAULT_RULES_CONTEXT = `# RULES.md — Hard Operational Constraints & Output Policies
## Safety & Boundaries
1. **Local-First Privacy**: Never exfiltrate private user context or memory to unauthorized third-party endpoints.
2. **Access Level Respect**: Adhere strictly to the active access policy (SANDBOXED vs UNRESTRICTED). In Sandboxed mode, confine file modifications to the allowed workspace paths.
3. **Idempotence & Reliability**: Ensure automation scripts and tool executions handle errors gracefully without crashing the agent harness.

## Output Formatting
- Use Markdown for structured text, tables, and bullet points.
- Highlight key parameters in **bold** or inline \`code\`.
- Keep voice-mode responses conversational and easy to synthesize.
`;

const STORAGE_KEYS = {
  USER: 'project_lumin_context_user',
  IDENTITY: 'project_lumin_context_identity',
  MEMORY: 'project_lumin_context_memory',
  RULES: 'project_lumin_context_rules',
  INITIALIZED: 'project_lumin_context_initialized'
};

export class ContextManager {
  private static instance: ContextManager;

  private userContext: string = '';
  private identityContext: string = '';
  private memoryContext: string = '';
  private rulesContext: string = '';
  private lastSyncedAt: string | null = null;
  private syncStatus: 'idle' | 'synced' | 'saving' | 'reloading' | 'error' = 'idle';
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadAll();
  }

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) {}
    });
  }

  public getSyncStatus(): 'idle' | 'synced' | 'saving' | 'reloading' | 'error' {
    return this.syncStatus;
  }

  public getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }

  public loadAll(): LuminContextStore {
    try {
      const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!isInit) {
        this.userContext = DEFAULT_USER_CONTEXT;
        this.identityContext = DEFAULT_IDENTITY_CONTEXT;
        this.memoryContext = DEFAULT_MEMORY_CONTEXT;
        this.rulesContext = DEFAULT_RULES_CONTEXT;
        this.saveAll();
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      } else {
        this.userContext = localStorage.getItem(STORAGE_KEYS.USER) || DEFAULT_USER_CONTEXT;
        this.identityContext = localStorage.getItem(STORAGE_KEYS.IDENTITY) || DEFAULT_IDENTITY_CONTEXT;
        this.memoryContext = localStorage.getItem(STORAGE_KEYS.MEMORY) || DEFAULT_MEMORY_CONTEXT;
        this.rulesContext = localStorage.getItem(STORAGE_KEYS.RULES) || DEFAULT_RULES_CONTEXT;
      }

      // Fetch server-side files from /api/context (disk is source of truth)
      this.fetchServerContext();
    } catch (e) {
      console.warn('Failed to load context from localStorage, using defaults:', e);
      this.userContext = DEFAULT_USER_CONTEXT;
      this.identityContext = DEFAULT_IDENTITY_CONTEXT;
      this.memoryContext = DEFAULT_MEMORY_CONTEXT;
      this.rulesContext = DEFAULT_RULES_CONTEXT;
    }

    return this.getContextStore();
  }

  public async fetchServerContext(): Promise<{ success: boolean; syncedAt?: string }> {
    this.syncStatus = 'reloading';
    this.notifyListeners();
    try {
      const res = await fetch('/api/context');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.context) {
          if (typeof data.context.user === 'string') this.userContext = data.context.user;
          if (typeof data.context.identity === 'string') this.identityContext = data.context.identity;
          if (typeof data.context.memory === 'string') this.memoryContext = data.context.memory;
          if (typeof data.context.rules === 'string') this.rulesContext = data.context.rules;
          
          this.lastSyncedAt = data.syncedAt || new Date().toISOString();
          this.syncStatus = 'synced';

          try {
            localStorage.setItem(STORAGE_KEYS.USER, this.userContext);
            localStorage.setItem(STORAGE_KEYS.IDENTITY, this.identityContext);
            localStorage.setItem(STORAGE_KEYS.MEMORY, this.memoryContext);
            localStorage.setItem(STORAGE_KEYS.RULES, this.rulesContext);
            localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
          } catch (e) {}

          this.notifyListeners();
          return { success: true, syncedAt: this.lastSyncedAt };
        }
      }
      this.syncStatus = 'error';
      this.notifyListeners();
      return { success: false };
    } catch (e) {
      this.syncStatus = 'error';
      this.notifyListeners();
      return { success: false };
    }
  }

  public async saveToServer(): Promise<{ success: boolean; syncedAt?: string }> {
    this.syncStatus = 'saving';
    this.notifyListeners();
    try {
      localStorage.setItem(STORAGE_KEYS.USER, this.userContext);
      localStorage.setItem(STORAGE_KEYS.IDENTITY, this.identityContext);
      localStorage.setItem(STORAGE_KEYS.MEMORY, this.memoryContext);
      localStorage.setItem(STORAGE_KEYS.RULES, this.rulesContext);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: this.userContext,
          identity: this.identityContext,
          memory: this.memoryContext,
          rules: this.rulesContext
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.lastSyncedAt = data.syncedAt || new Date().toISOString();
        this.syncStatus = 'synced';
        this.notifyListeners();
        return { success: true, syncedAt: this.lastSyncedAt };
      } else {
        this.syncStatus = 'error';
        this.notifyListeners();
        return { success: false };
      }
    } catch (e) {
      this.syncStatus = 'error';
      this.notifyListeners();
      return { success: false };
    }
  }

  public getContextStore(): LuminContextStore {
    return {
      user: this.userContext,
      identity: this.identityContext,
      memory: this.memoryContext,
      rules: this.rulesContext,
      lastUpdated: this.lastSyncedAt || new Date().toISOString()
    };
  }

  public getUserContext(): string {
    return this.userContext;
  }

  public setUserContext(val: string): void {
    this.userContext = val;
    this.persistKey(STORAGE_KEYS.USER, val);
  }

  public getIdentityContext(): string {
    return this.identityContext;
  }

  public setIdentityContext(val: string): void {
    this.identityContext = val;
    this.persistKey(STORAGE_KEYS.IDENTITY, val);
  }

  public getMemoryContext(): string {
    return this.memoryContext;
  }

  public setMemoryContext(val: string): void {
    this.memoryContext = val;
    this.persistKey(STORAGE_KEYS.MEMORY, val);
  }

  public appendMemory(entry: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const newEntry = `\n- [${timestamp}] ${entry.trim()}`;
    this.memoryContext = (this.memoryContext + newEntry).trim();
    this.persistKey(STORAGE_KEYS.MEMORY, this.memoryContext);
  }

  public getRulesContext(): string {
    return this.rulesContext;
  }

  public setRulesContext(val: string): void {
    this.rulesContext = val;
    this.persistKey(STORAGE_KEYS.RULES, val);
  }

  public saveAll(): void {
    this.saveToServer();
  }

  public resetToDefaults(key?: 'user' | 'identity' | 'memory' | 'rules'): void {
    if (!key || key === 'user') this.userContext = DEFAULT_USER_CONTEXT;
    if (!key || key === 'identity') this.identityContext = DEFAULT_IDENTITY_CONTEXT;
    if (!key || key === 'memory') this.memoryContext = DEFAULT_MEMORY_CONTEXT;
    if (!key || key === 'rules') this.rulesContext = DEFAULT_RULES_CONTEXT;
    this.saveToServer();
  }

  private persistKey(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
      fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: this.userContext,
          identity: this.identityContext,
          memory: this.memoryContext,
          rules: this.rulesContext
        })
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          this.lastSyncedAt = data.syncedAt || new Date().toISOString();
          this.syncStatus = 'synced';
          this.notifyListeners();
        }
      }).catch(() => {});
    } catch (e) {
      console.warn(`Failed to persist context key ${key}:`, e);
    }
  }

  /**
   * Builds the formatted prompt context injection block for LLM prompts.
   * Injects USER + IDENTITY + RULES + MEMORY into the system context.
   */
  public buildPromptContextBlock(extraContext?: Record<string, string>): string {
    const user = this.userContext.trim();
    const identity = this.identityContext.trim();
    const rules = this.rulesContext.trim();
    const memory = this.memoryContext.trim();

    let block = `=== LUMIN LOCAL CONTEXT WORKSPACE (lumin_context/) ===\n`;
    
    if (identity) {
      block += `\n[IDENTITY & PERSONA (IDENTITY.md)]\n${identity}\n`;
    }
    if (user) {
      block += `\n[USER PROFILE & PREFERENCES (USER.md)]\n${user}\n`;
    }
    if (rules) {
      block += `\n[HARD OPERATIONAL RULES (RULES.md)]\n${rules}\n`;
    }
    if (memory) {
      block += `\n[DURABLE MEMORY & KNOWLEDGE (MEMORY.md)]\n${memory}\n`;
    }

    if (extraContext && Object.keys(extraContext).length > 0) {
      block += `\n[RUNTIME CONTEXT VARIABLES]\n`;
      for (const [k, v] of Object.entries(extraContext)) {
        block += `- ${k}: ${v}\n`;
      }
    }

    block += `\n======================================================`;
    return block;
  }
}

export const contextManager = ContextManager.getInstance();
