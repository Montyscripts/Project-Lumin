import { html, TemplateResult } from 'lit';
import { soundFX } from '../../sound-effects';

export function renderModelSettingsSection(host: any): TemplateResult {
  const popularModels = [
    { id: 'llama3.2:3b', name: 'Llama 3.2 3B', tag: '⚡ Ultra Fast', desc: 'Optimized for instant conversational voice and rapid tool execution' },
    { id: 'codellama:7b', name: 'CodeLlama 7B', tag: '💻 Coding', desc: 'Specialized for writing, reviewing, and executing code' },
    { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B', tag: '🧠 Reasoning', desc: 'Chain-of-thought logic and multi-step reasoning algorithms' },
    { id: 'llama3.2-vision:11b', name: 'Llama 3.2 Vision 11B', tag: '👁️ Vision', desc: 'Multimodal vision and screen analysis' },
    { id: 'mistral:7b', name: 'Mistral 7B', tag: '🎯 Balanced', desc: 'High-quality general reasoning and writing assistant' },
    { id: 'router', name: 'Smart Router', tag: '🤖 Auto', desc: 'Automatically selects best model per prompt workload' },
  ];

  const isCurrentAuto = !host.activeModelName || host.activeModelName === 'auto' || host.activeModelName === 'Auto-Router' || host.activeModelName === 'router' || host.activeModelName === 'Smart Router';
  const activeModelId = isCurrentAuto ? 'Auto-Router (Dynamic)' : (host.activeModelName || host.ollamaModel || 'llama3.2:3b');

  return html`
    <!-- Header Banner -->
    <div class="settings-tab-banner" id="model-settings-banner">
      <div class="settings-tab-banner-info">
        <h3>
          <span class="section-icon">🧠</span> Neural Models & Persona Architecture
        </h3>
        <p>
          Configure local LLM inference engines, quick-switch neural models, set CLI templates, and customize user & agent identities.
        </p>
      </div>
      <div class="settings-header-badge">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00e676; box-shadow: 0 0 8px #00e676;"></span>
        Model: ${activeModelId}
      </div>
    </div>

    <!-- Section 1: Active Neural Model Spotlight -->
    <div class="form-section" id="active-model-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">⚡</span> Active Inference Engine & Quick Switch
        </h4>
        <button
          type="button"
          class="config-btn"
          id="btn-open-model-catalog"
          @click=${() => {
            const selector = host.shadowRoot?.querySelector('lumin-model-selector') as any;
            if (selector && typeof selector.openModal === 'function') {
              selector.openModal();
            } else {
              const trigger = host.shadowRoot?.querySelector('.model-nav-trigger') as HTMLElement;
              if (trigger) trigger.click();
            }
          }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Open Full Model Catalog
        </button>
      </div>

      <div class="model-spotlight-card" id="model-spotlight-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--glow-color, #00aaff); font-weight: 700;">Currently Active Model</span>
            <div style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin-top: 2px;">
              ${activeModelId}
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="background: rgba(255, 255, 255, 0.06); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.1);">Platform: ${isCurrentAuto ? 'Auto-Router' : (host.activePlatform || 'Ollama')}</span>
            <span style="background: rgba(0, 230, 118, 0.12); color: #00e676; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; border: 1px solid rgba(0, 230, 118, 0.3);">Local Zero-Latency</span>
          </div>
        </div>

        <p class="setting-desc" style="margin: 2px 0 0 0;">
          Select a recommended local model optimized for specific workloads or switch dynamically per task:
        </p>

        <div class="model-quick-pills">
          ${popularModels.map(m => {
            const isPillAuto = m.id === 'router' || m.id === 'auto';
            const isPillActive = isPillAuto ? isCurrentAuto : (!isCurrentAuto && (host.activeModelName === m.id || host.ollamaModel === m.id));
            return html`
              <button
                type="button"
                id="model-pill-${m.id.replace(/[^a-zA-Z0-9]/g, '-')}"
                class="model-quick-pill ${isPillActive ? 'active' : ''}"
                @click=${() => {
                  const target = isPillAuto ? 'auto' : m.id;
                  host.activeModelName = isPillAuto ? 'Auto-Router' : target;
                  host.ollamaModel = isPillAuto ? 'Auto-Router' : target;
                  host.activePlatform = isPillAuto ? 'Auto-Router' : 'Ollama';
                  localStorage.setItem('project_lumin_active_model', target);
                  localStorage.setItem('project_lumin_ollama_model', target);
                  fetch('/api/models/switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: target })
                  }).catch(() => {});
                  if (host.wsTerminal && host.wsTerminal.readyState === WebSocket.OPEN) {
                    host.wsTerminal.send(JSON.stringify({
                      type: 'input',
                      data: isPillAuto ? 'model auto' : `model ${target}`
                    }));
                  }
                  soundFX.playClick();
                  host.requestUpdate();
                }}
                title="${m.desc}">
                <span>${m.name}</span>
                <span style="font-size: 0.72rem; opacity: 0.75; font-weight: 500;">${m.tag}</span>
              </button>
            `;
          })}
        </div>
      </div>
    </div>

    <!-- Section 2: LLM Command & Execution Pipeline -->
    <div class="form-section" id="llm-pipeline-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🛠️</span> LLM CLI Command & Execution Pipeline
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Runtime Shell</span>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="llm-cmd-input">Local LLM Execution Template</label>
          <span class="setting-desc">CLI invocation pattern used by the agent runtime. Use <code>{model}</code> and <code>{prompt}</code> placeholders.</span>
          <input
            id="llm-cmd-input"
            type="text"
            placeholder='ollama run {model} "{prompt}"'
            .value=${host.llmCommandTemplate || 'ollama run {model} "{prompt}"'}
            @input=${(e: Event) => {
              host.llmCommandTemplate = (e.target as HTMLInputElement).value;
            }} />
        </div>
      </div>
    </div>

    <!-- Section 3: User Identity & Profile -->
    <div class="form-section" id="user-profile-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">👤</span> User Identity & Profile
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Personalization</span>
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <label for="user-name-input">User Display Name</label>
          <span class="setting-desc">The name LUMIN will use to address you in conversation and workspace logs.</span>
          <input
            id="user-name-input"
            type="text"
            placeholder="User"
            .value=${host.userName || 'User'}
            @input=${(e: Event) => {
              host.userName = (e.target as HTMLInputElement).value;
              localStorage.setItem('project_lumin_user_name', host.userName);
            }} />
        </div>

        <div class="form-field">
          <label id="user-avatar-label">User Avatar Signature</label>
          <span class="setting-desc">Choose a personal icon or upload your custom avatar image.</span>
          <div style="display: flex; gap: 10px; align-items: center; min-height: 42px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(255, 255, 255, 0.08); border: 2px solid var(--glow-color, #00aaff); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 10px var(--glow-color-faded, rgba(0, 170, 255, 0.25));">
              ${host.renderAvatarIcon ? host.renderAvatarIcon('user') : html`👤`}
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap; flex: 1;">
              ${['👤', '🧑‍💻', '🚀', '⚡', '🦊', '🦉'].map(emoji => html`
                <button
                  type="button"
                  style="width: 36px; height: 36px; border-radius: 8px; background: ${host.userAvatar === emoji ? 'var(--glow-color-faded, rgba(0, 170, 255, 0.25))' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${host.userAvatar === emoji ? 'var(--glow-color, #00aaff)' : 'rgba(255, 255, 255, 0.1)'}; font-size: 1.15rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.15s ease;"
                  @click=${() => {
                    host.userAvatar = emoji;
                    localStorage.setItem('project_lumin_user_avatar', emoji);
                    soundFX.playClick();
                    host.requestUpdate();
                  }}>
                  ${emoji}
                </button>
              `)}
            </div>

            <label class="config-btn" style="cursor: pointer; flex-shrink: 0;">
              Upload
              <input
                type="file"
                id="user-avatar-file-input"
                accept="image/*"
                style="display: none;"
                @change=${(e: Event) => host.handleUserAvatarUpload && host.handleUserAvatarUpload(e)} />
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 4: Assistant Persona & Avatar -->
    <div class="form-section" id="assistant-persona-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">✨</span> Assistant Persona & Visual Signature
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Agent Identity</span>
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <label for="system-name-input">Assistant / System Name</label>
          <span class="setting-desc">Display title for the AI Agent in headers, notification toasts, and transcripts.</span>
          <input
            id="system-name-input"
            type="text"
            placeholder="LUMIN"
            .value=${host.systemName || 'LUMIN'}
            @input=${(e: Event) => {
              host.systemName = (e.target as HTMLInputElement).value;
              localStorage.setItem('project_lumin_system_name', host.systemName);
            }} />
        </div>

        <div class="form-field">
          <label id="assistant-avatar-label">Assistant Avatar Signature</label>
          <span class="setting-desc">Visual avatar for AI response bubbles and 3D visualizer.</span>
          <div style="display: flex; gap: 10px; align-items: center; min-height: 42px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(0, 170, 255, 0.15); border: 2px solid var(--glow-color, #00aaff); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 10px var(--glow-color-faded, rgba(0, 170, 255, 0.25));">
              ${host.renderAvatarIcon ? host.renderAvatarIcon('ai') : html`✨`}
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap; flex: 1;">
              ${['✨', '🤖', '🪐', '🔮', '💠', '🌌'].map(emoji => html`
                <button
                  type="button"
                  style="width: 36px; height: 36px; border-radius: 8px; background: ${host.systemAvatar === emoji ? 'var(--glow-color-faded, rgba(0, 170, 255, 0.25))' : 'rgba(255, 255, 255, 0.05)'}; border: 1px solid ${host.systemAvatar === emoji ? 'var(--glow-color, #00aaff)' : 'rgba(255, 255, 255, 0.1)'}; font-size: 1.15rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: transform 0.15s ease;"
                  @click=${() => {
                    host.systemAvatar = emoji;
                    localStorage.setItem('project_lumin_system_avatar', emoji);
                    soundFX.playClick();
                    host.requestUpdate();
                  }}>
                  ${emoji}
                </button>
              `)}
            </div>

            <label class="config-btn" style="cursor: pointer; flex-shrink: 0;">
              Upload
              <input
                type="file"
                id="assistant-avatar-file-input"
                accept="image/*"
                style="display: none;"
                @change=${(e: Event) => host.handleSystemAvatarUpload && host.handleSystemAvatarUpload(e)} />
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

