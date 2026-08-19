/**
 * LUMIN Context Layer & Skills System Settings Section
 * 
 * Provides an intuitive management interface for:
 * 1. User Context Files (USER.md, IDENTITY.md, MEMORY.md, RULES.md)
 * 2. Reusable Skill Packs (Built-in + Custom User Skills)
 * 3. Modern Personal Agent Architecture Hygiene (Model -> Context -> Skills -> Harness)
 */

import { html, TemplateResult } from 'lit';
import { soundFX } from '../../sound-effects';
import { contextManager } from '../../services/context-manager';
import { skillsManager, LuminSkill } from '../../services/skills-manager';

export function renderContextSkillsSettingsSection(host: any): TemplateResult {
  const activeContextTab = host.activeContextSubTab || 'USER';
  const activeSkillCategory = host.activeSkillCategoryFilter || 'ALL';
  const isCreatingSkill = host.isCreatingCustomSkill || false;

  const contextTabs = [
    { id: 'USER', label: 'USER.md', desc: 'Who you are, preferences, goals', icon: '👤' },
    { id: 'IDENTITY', label: 'IDENTITY.md', desc: 'How LUMIN speaks & behaves', icon: '✨' },
    { id: 'MEMORY', label: 'MEMORY.md', desc: 'Durable facts & knowledge', icon: '🧠' },
    { id: 'RULES', label: 'RULES.md', desc: 'Hard constraints & safety', icon: '🛡️' },
  ];

  const skillCategories = ['ALL', 'Daily Routines', 'System & Dev', 'Research & Analysis', 'Creative & Ambient', 'Custom'];

  const allSkills = skillsManager.getAllSkills();
  const filteredSkills = activeSkillCategory === 'ALL' 
    ? allSkills 
    : allSkills.filter(s => s.category === activeSkillCategory);

  // Active file content lookup
  let currentFileContent = '';
  let currentFileDesc = '';
  let currentFilePlaceholder = '';

  if (activeContextTab === 'USER') {
    currentFileContent = contextManager.getUserContext();
    currentFileDesc = 'Defines who you are, your role, technical preferences, and primary goals. Injected into every prompt.';
    currentFilePlaceholder = '# USER.md\n- Name: User\n- Role: Software Engineer...';
  } else if (activeContextTab === 'IDENTITY') {
    currentFileContent = contextManager.getIdentityContext();
    currentFileDesc = 'Directives for LUMIN\'s tone, conversational demeanor, responsiveness, and problem-solving agency.';
    currentFilePlaceholder = '# IDENTITY.md\nYou are LUMIN...';
  } else if (activeContextTab === 'MEMORY') {
    currentFileContent = contextManager.getMemoryContext();
    currentFileDesc = 'Long-term facts, key project milestones, and persistent knowledge learned across sessions.';
    currentFilePlaceholder = '# MEMORY.md\n- System milestones...';
  } else {
    currentFileContent = contextManager.getRulesContext();
    currentFileDesc = 'Operational boundaries, sandboxing constraints, privacy mandates, and output formatting rules.';
    currentFilePlaceholder = '# RULES.md\n1. Local-first privacy...';
  }

  return html`
    <!-- Header Banner -->
    <div class="settings-tab-banner" id="context-skills-banner">
      <div class="settings-tab-banner-info">
        <h3>
          <span class="section-icon">📁</span> Context Layer & Reusable Skills
        </h3>
        <p>
          Hermes & OpenClaw-style personal agent architecture: structured local context (USER, IDENTITY, MEMORY, RULES) + reusable job capability packs.
        </p>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          id="btn-create-new-skill-top"
          class="action-btn"
          style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25)); border: 1px solid rgba(52, 211, 153, 0.45); color: #34d399; font-weight: 700; padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; display: flex; align-items: center; gap: 6px; cursor: pointer;"
          @click=${() => {
            host.isCreatingCustomSkill = !host.isCreatingCustomSkill;
            soundFX.playClick();
            host.requestUpdate();
          }}
        >
          <span style="font-size: 0.95rem;">${isCreatingSkill ? '✕ Close' : '➕ Create Skill'}</span>
          <span>${isCreatingSkill ? 'Cancel' : 'New Skill'}</span>
        </button>
        <div class="settings-header-badge" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">
          ${skillsManager.getActiveSkills().length} Skills Active
        </div>
      </div>
    </div>

    <!-- Architecture Hygiene Stack Overview -->
    <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 18px;">
      <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #38bdf8; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>🏛️ AGENT SYSTEM ARCHITECTURE (Home → Harness → Model → Context → Skills)</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
        <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 12px; border-radius: 8px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #a855f7;">1. Model (Brain)</div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            ${host.activeModelName || 'llama3.2:3b'} (${host.activePlatform || 'Ollama'})
          </div>
        </div>

        <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 12px; border-radius: 8px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">2. Context (Memory)</div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            USER • IDENTITY • MEMORY • RULES
          </div>
        </div>

        <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 12px; border-radius: 8px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #34d399;">3. Skills (Jobs)</div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            ${allSkills.length} Total Registered Packs
          </div>
        </div>

        <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); padding: 8px 12px; border-radius: 8px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: #fbbf24;">4. Harness (Runtime)</div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            ${host.unrestrictedMode ? 'UNRESTRICTED' : 'SANDBOXED'} · MCP ${host.isMcpEnabled ? 'Online' : 'Standby'}
          </div>
        </div>
      </div>
    </div>

    <!-- Section 1: Context Layer Workspace (lumin_context/) -->
    <div class="form-section" id="context-workspace-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🗂️</span> Local Context Workspace (<code>lumin_context/</code>)
        </h4>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button
            type="button"
            class="config-btn"
            id="btn-reload-context-disk"
            title="Reload context files from disk"
            style="display: flex; align-items: center; gap: 5px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);"
            @click=${async () => {
              await contextManager.fetchServerContext();
              soundFX.playClick();
              host.requestUpdate();
            }}
          >
            <span>🔄</span> Reload from Disk
          </button>
          <button
            type="button"
            class="config-btn"
            id="btn-save-context-disk"
            title="Save context files directly to disk"
            style="display: flex; align-items: center; gap: 5px; background: rgba(16, 185, 129, 0.15); border-color: rgba(52, 211, 153, 0.5); color: #34d399; font-weight: 700;"
            @click=${async () => {
              await contextManager.saveToServer();
              soundFX.playSuccess();
              host.requestUpdate();
            }}
          >
            <span>💾</span> Save to Disk
          </button>
          <button
            type="button"
            class="config-btn"
            id="btn-reset-context-file"
            title="Reset active file to default template"
            @click=${() => {
              contextManager.resetToDefaults(activeContextTab.toLowerCase() as any);
              soundFX.playClick();
              host.requestUpdate();
            }}
          >
            Reset Template
          </button>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <p class="setting-desc" style="margin: 0;">
          Personalization is powered by persistent markdown files under <code>lumin_context/</code>. Disk is the single source of truth:
        </p>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); color: #34d399; font-family: monospace;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
          <span>Synced to lumin_context/ (${contextManager.getLastSyncedAt() ? new Date(contextManager.getLastSyncedAt()!).toLocaleTimeString() : 'Disk Synced'})</span>
        </div>
      </div>

      <!-- Context Sub-tabs -->
      <div class="settings-filter-pills" style="margin-bottom: 12px;">
        ${contextTabs.map(tab => html`
          <button
            type="button"
            id="context-tab-${tab.id.toLowerCase()}"
            class="settings-filter-pill ${activeContextTab === tab.id ? 'active' : ''}"
            style="padding: 5px 14px; font-size: 0.78rem;"
            @click=${() => {
              host.activeContextSubTab = tab.id;
              soundFX.playClick();
              host.requestUpdate();
            }}
          >
            <span>${tab.icon}</span>
            <span>${tab.label}</span>
          </button>
        `)}
      </div>

      <!-- Active File Editor Card -->
      <div style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="font-size: 0.82rem; font-weight: 700; color: #ffffff; font-family: monospace;">
              lumin_context/${activeContextTab}.md
            </span>
            <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 2px;">
              ${currentFileDesc}
            </div>
          </div>
          <div style="font-size: 0.72rem; color: #64748b; font-family: monospace;">
            ${currentFileContent.length} chars · ${currentFileContent.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>

        <textarea
          id="context-file-editor"
          style="width: 100%; min-height: 180px; max-height: 360px; background: rgba(5, 7, 13, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #e2e8f0; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; line-height: 1.5; padding: 12px; resize: vertical; outline: none; box-sizing: border-box;"
          placeholder="${currentFilePlaceholder}"
          .value=${currentFileContent}
          @input=${(e: Event) => {
            const val = (e.target as HTMLTextAreaElement).value;
            if (activeContextTab === 'USER') contextManager.setUserContext(val);
            else if (activeContextTab === 'IDENTITY') contextManager.setIdentityContext(val);
            else if (activeContextTab === 'MEMORY') contextManager.setMemoryContext(val);
            else contextManager.setRulesContext(val);
          }}
        ></textarea>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 0.72rem; color: #10b981; display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            Disk is single source of truth · Injected into every Python agent cycle
          </span>

          ${activeContextTab === 'MEMORY' ? html`
            <div style="display: flex; gap: 6px; align-items: center;">
              <input
                id="quick-memory-input"
                type="text"
                placeholder="Append durable fact or milestone..."
                style="padding: 4px 10px; font-size: 0.76rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; color: #ffffff; width: 220px;"
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      contextManager.appendMemory(input.value.trim());
                      input.value = '';
                      soundFX.playClick();
                      host.requestUpdate();
                    }
                  }
                }}
              />
              <button
                type="button"
                class="config-btn"
                style="padding: 4px 10px; font-size: 0.75rem;"
                @click=${() => {
                  const input = host.shadowRoot?.querySelector('#quick-memory-input') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    contextManager.appendMemory(input.value.trim());
                    input.value = '';
                    soundFX.playClick();
                    host.requestUpdate();
                  }
                }}
              >
                + Add Note
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Section 2: Reusable Skills Layer ("Give him jobs") -->
    <div class="form-section" id="skills-registry-section">
      <div class="form-section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <h4 class="form-section-title" style="margin-bottom: 2px;">
            <span class="section-icon">💼</span> Reusable Skills Registry ("Give Him Jobs")
          </h4>
          <span style="font-size: 0.72rem; color: ${skillsManager.syncStatus === 'synced' ? '#34d399' : skillsManager.syncStatus === 'saving' ? '#38bdf8' : skillsManager.syncStatus === 'error' ? '#f87171' : '#94a3b8'};">
            ${skillsManager.syncStatus === 'synced' ? '● Synced to lumin_context/SKILLS/registry.json' : skillsManager.syncStatus === 'saving' ? '⟳ Saving to disk...' : skillsManager.syncStatus === 'error' ? '⚠ Disk sync error' : '○ Standby'}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button
            type="button"
            class="config-btn"
            style="padding: 4px 10px; font-size: 0.75rem;"
            @click=${async () => {
              await skillsManager.fetchServerSkills();
              soundFX.playSuccess();
              host.requestUpdate();
            }}
            title="Reload skills registry from disk"
          >
            🔄 Reload
          </button>
          <button
            type="button"
            class="config-btn"
            style="padding: 4px 10px; font-size: 0.75rem; background: rgba(52, 211, 153, 0.15); border-color: rgba(52, 211, 153, 0.4); color: #34d399; font-weight: 600;"
            @click=${async () => {
              await skillsManager.saveToServer();
              soundFX.playSuccess();
              host.requestUpdate();
            }}
            title="Save all skills and states to disk"
          >
            💾 Save to Disk
          </button>
          <button
            type="button"
            class="config-btn"
            style="padding: 4px 10px; font-size: 0.75rem; background: #38bdf8; color: #020617; font-weight: 700; border-color: #38bdf8;"
            @click=${() => {
              host.isCreatingCustomSkill = !host.isCreatingCustomSkill;
              soundFX.playClick();
              host.requestUpdate();
            }}
          >
            ${isCreatingSkill ? '✕ Close Form' : '+ New Skill'}
          </button>
        </div>
      </div>

      <p class="setting-desc" style="margin-top: 4px;">
        Skills are durable capability packs triggered via chat or voice (e.g. <em>"run morning brief"</em>, <em>"diagnostics report"</em>) or executed directly:
      </p>

      <!-- Custom Skill Creator Form -->
      ${isCreatingSkill ? html`
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px;">
          <h5 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #34d399; display: flex; align-items: center; gap: 6px;">
            <span>➕ Create Custom Reusable Skill Pack</span>
          </h5>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <div class="form-field">
              <label for="custom-skill-name">Skill Display Name</label>
              <input id="custom-skill-name" type="text" placeholder="e.g. Weekly Code Review" />
            </div>

            <div class="form-field">
              <label for="custom-skill-icon">Emoji Icon</label>
              <input id="custom-skill-icon" type="text" placeholder="⚡" style="max-width: 80px;" value="⚡" />
            </div>

            <div class="form-field" style="grid-column: span 2;">
              <label for="custom-skill-desc">Description</label>
              <input id="custom-skill-desc" type="text" placeholder="Brief summary of what this job performs..." />
            </div>

            <div class="form-field" style="grid-column: span 2;">
              <label for="custom-skill-triggers">Trigger Phrases (comma-separated)</label>
              <input id="custom-skill-triggers" type="text" placeholder="e.g. code review, review pull request, audit code" />
            </div>

            <div class="form-field" style="grid-column: span 2;">
              <label for="custom-skill-instructions">Step-by-Step Instructions Template</label>
              <textarea
                id="custom-skill-instructions"
                style="width: 100%; min-height: 100px; background: rgba(5, 7, 13, 0.85); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #e2e8f0; font-family: monospace; font-size: 0.78rem; padding: 10px; box-sizing: border-box;"
                placeholder="1. Analyze current git status or file diff.\n2. Check for security vulnerabilities.\n3. Output a structured summary with actionable fixes."
              ></textarea>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button
              type="button"
              class="config-btn"
              @click=${() => {
                host.isCreatingCustomSkill = false;
                host.requestUpdate();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              class="config-btn"
              style="background: #10b981; color: #ffffff; font-weight: 700; border-color: #10b981;"
              @click=${async () => {
                const nameInput = host.shadowRoot?.querySelector('#custom-skill-name') as HTMLInputElement;
                const iconInput = host.shadowRoot?.querySelector('#custom-skill-icon') as HTMLInputElement;
                const descInput = host.shadowRoot?.querySelector('#custom-skill-desc') as HTMLInputElement;
                const triggersInput = host.shadowRoot?.querySelector('#custom-skill-triggers') as HTMLInputElement;
                const instInput = host.shadowRoot?.querySelector('#custom-skill-instructions') as HTMLTextAreaElement;

                if (nameInput && nameInput.value.trim() && instInput && instInput.value.trim()) {
                  skillsManager.addCustomSkill({
                    name: nameInput.value.trim(),
                    icon: iconInput?.value.trim() || '⚡',
                    description: descInput?.value.trim() || 'Custom user-defined skill',
                    category: 'Custom',
                    triggerHints: (triggersInput?.value || nameInput.value)
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean),
                    requiredTools: ['context_memory', 'runtime_harness'],
                    instructions: instInput.value.trim(),
                    isEnabled: true
                  });
                  host.isCreatingCustomSkill = false;
                  soundFX.playToggle();
                  host.requestUpdate();
                }
              }}
            >
              Save & Register Skill
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Skill Category Filter Pills -->
      <div class="settings-filter-pills" style="margin-bottom: 12px;">
        ${skillCategories.map(cat => html`
          <button
            type="button"
            class="settings-filter-pill ${activeSkillCategory === cat ? 'active' : ''}"
            style="padding: 4px 12px; font-size: 0.76rem;"
            @click=${() => {
              host.activeSkillCategoryFilter = cat;
              soundFX.playClick();
              host.requestUpdate();
            }}
          >
            ${cat}
          </button>
        `)}
      </div>

      <!-- Skills Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        ${filteredSkills.map(skill => html`
          <div
            class="skill-card"
            style="background: rgba(13, 19, 33, 0.7); border: 1px solid ${skill.isEnabled ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; transition: border-color 0.15s ease;"
          >
            <div>
              <!-- Top Row: Icon, Title, Category Badge, Toggle -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3rem;">${skill.icon}</span>
                  <div>
                    <strong style="color: #ffffff; font-size: 0.88rem; display: block;">${skill.name}</strong>
                    <span style="font-size: 0.68rem; color: #38bdf8; font-weight: 600;">${skill.category}</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <input
                    type="checkbox"
                    role="switch"
                    .checked=${skill.isEnabled}
                    @change=${(e: Event) => {
                      skillsManager.toggleSkill(skill.id, (e.target as HTMLInputElement).checked);
                      soundFX.playToggle();
                      host.requestUpdate();
                    }}
                  />
                  ${skill.isCustom ? html`
                    <button
                      type="button"
                      title="Delete Custom Skill"
                      style="background: transparent; border: none; color: #f43f5e; cursor: pointer; font-size: 0.9rem;"
                      @click=${() => {
                        skillsManager.deleteSkill(skill.id);
                        soundFX.playClick();
                        host.requestUpdate();
                      }}
                    >
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Description -->
              <p style="font-size: 0.75rem; color: var(--text-secondary, #94a3b8); margin: 8px 0 0 0; line-height: 1.45;">
                ${skill.description}
              </p>

              <!-- Trigger Hints -->
              <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                ${skill.triggerHints.slice(0, 3).map(hint => html`
                  <span style="background: rgba(255, 255, 255, 0.05); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-family: monospace;">
                    "${hint}"
                  </span>
                `)}
              </div>

              <!-- Last Result Summary if available -->
              ${skill.lastResultSummary ? html`
                <div style="margin-top: 8px; padding: 6px 8px; background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 6px; font-size: 0.68rem; color: #94a3b8; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                  <strong style="color: #38bdf8;">Last Result:</strong> ${skill.lastResultSummary}
                </div>
              ` : ''}
            </div>

            <!-- Bottom Row: Run Now Button & Last Run Status -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 8px; margin-top: 4px;">
              <span style="font-size: 0.68rem; color: #94a3b8; display: flex; align-items: center; gap: 5px;">
                ${skill.lastRunAt ? html`
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${skill.lastRunStatus === 'failed' ? '#f87171' : '#34d399'}; box-shadow: 0 0 4px ${skill.lastRunStatus === 'failed' ? '#f87171' : '#34d399'};"></span>
                  <span style="color: ${skill.lastRunStatus === 'failed' ? '#f87171' : '#38bdf8'}; font-weight: 500;">${skill.lastRunStatus === 'failed' ? 'Failed' : 'Success'}</span>
                  <span style="color: #64748b;">· ${skill.lastRunAt}</span>
                ` : html`
                  <span style="color: #64748b;">Never executed</span>
                `}
              </span>

              <button
                type="button"
                id="btn-run-skill-${skill.id.replace(/[^a-zA-Z0-9]/g, '-')}"
                class="config-btn"
                style="padding: 3px 10px; font-size: 0.74rem; background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 600; display: flex; align-items: center; gap: 4px;"
                ?disabled=${!skill.isEnabled}
                @click=${() => {
                  if (typeof host.executeSkill === 'function') {
                    host.executeSkill(skill);
                  }
                  soundFX.playClick();
                }}
              >
                <span>▶ Run Job</span>
              </button>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}
