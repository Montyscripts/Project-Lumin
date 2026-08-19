import { html, TemplateResult } from 'lit';
import { soundFX } from '../../sound-effects';

export function renderAdvancedSettingsSection(host: any): TemplateResult {
  return html`
    <!-- Header Banner -->
    <div class="settings-tab-banner" id="advanced-settings-banner">
      <div class="settings-tab-banner-info">
        <h3>
          <span class="section-icon">⚙️</span> Advanced & MCP Integration
        </h3>
        <p>
          Configure Model Context Protocol (MCP) server endpoints, developer runtime safeguards, and system configuration backups.
        </p>
      </div>
      <div class="settings-header-badge">
        MCP Engine: ${host.isMcpEnabled ? 'Connected & Active' : 'Standby'}
      </div>
    </div>

    <!-- Section 1: Dual Model Context Protocol (MCP) Hub -->
    <div class="form-section" id="mcp-hub-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🔌</span> Model Context Protocol (MCP) Hub
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Native Tools & External Bridges</span>
      </div>

      <div class="form-field-toggle">
        <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
          <label for="enable-mcp-toggle">Enable MCP Tool Integrations</label>
          <span class="setting-desc">Empowers LUMIN to discover and execute tools across local filesystem, memory, browser automation, and connected MCP servers.</span>
        </div>
        <input
          id="enable-mcp-toggle"
          type="checkbox"
          role="switch"
          .checked=${host.isMcpEnabled}
          @change=${(e: Event) => {
            host.isMcpEnabled = (e.target as HTMLInputElement).checked;
            localStorage.setItem('project_lumin_mcp_enabled', String(host.isMcpEnabled));
            soundFX.playToggle();
            host.requestUpdate();
          }} />
      </div>

      ${host.isMcpEnabled ? html`
        <!-- Connect New MCP Server -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); padding: 18px; border-radius: 12px; margin-top: 8px;">
          <h5 style="margin: 0 0 14px 0; color: #ffffff; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--glow-color, #00aaff)" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Connect Remote or Local MCP Server (SSE / Stdio)
          </h5>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) auto; gap: 12px; align-items: flex-end;">
            <div class="form-field">
              <label for="new-mcp-name">Server Identifier</label>
              <input
                id="new-mcp-name"
                type="text"
                placeholder="e.g. filesystem" />
            </div>

            <div class="form-field" style="grid-column: span 1;">
              <label for="new-mcp-url">Endpoint URL or CLI Command</label>
              <input
                id="new-mcp-url"
                type="text"
                placeholder="http://localhost:8000/sse or npx -y @modelcontextprotocol/..." />
            </div>

            <button
              type="button"
              id="btn-connect-mcp-server"
              class="config-btn"
              style="height: 42px; background: rgba(0, 170, 255, 0.15); border-color: var(--glow-color, #00aaff); color: var(--glow-color, #00aaff); font-weight: 600;"
              @click=${() => {
                const nameInput = host.shadowRoot?.querySelector('#new-mcp-name') as HTMLInputElement;
                const urlInput = host.shadowRoot?.querySelector('#new-mcp-url') as HTMLInputElement;
                if (nameInput && urlInput && nameInput.value && urlInput.value) {
                  const cmd = `connect mcp to ${nameInput.value} ${urlInput.value}`;
                  if (host.wsTerminal && host.wsTerminal.readyState === WebSocket.OPEN) {
                    host.wsTerminal.send(JSON.stringify({ type: 'input', data: cmd }));
                  }
                  nameInput.value = '';
                  urlInput.value = '';
                  soundFX.playClick();
                  host.requestUpdate();
                }
              }}>
              Connect Server
            </button>
          </div>
        </div>

        <!-- Built-in Native MCP Servers -->
        <div style="margin-top: 12px;">
          <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--glow-color, #00aaff);">Built-in Server Capabilities</span>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 8px;">
            <div style="background: rgba(0, 170, 255, 0.05); border: 1px solid rgba(0, 170, 255, 0.2); padding: 14px 16px; border-radius: 10px;">
              <strong style="color: #ffffff; font-size: 0.88rem; display: block; margin-bottom: 4px;">📁 File System Toolset</strong>
              <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;">Read, edit, search, and list workspace files securely</span>
            </div>

            <div style="background: rgba(0, 170, 255, 0.05); border: 1px solid rgba(0, 170, 255, 0.2); padding: 14px 16px; border-radius: 10px;">
              <strong style="color: #ffffff; font-size: 0.88rem; display: block; margin-bottom: 4px;">🧠 Memory & Context Store</strong>
              <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;">Long-term semantic memory and knowledge index</span>
            </div>

            <div style="background: rgba(0, 170, 255, 0.05); border: 1px solid rgba(0, 170, 255, 0.2); padding: 14px 16px; border-radius: 10px;">
              <strong style="color: #ffffff; font-size: 0.88rem; display: block; margin-bottom: 4px;">🌐 Web & Document Automator</strong>
              <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;">Web scraping, browser automations & document compilation</span>
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Section 2: Developer Diagnostics & System Safeguards -->
    <div class="form-section" id="system-safeguards-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🛡️</span> Developer Diagnostics & Runtime Safeguards
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Security Boundaries</span>
      </div>

      <div class="form-grid-2">
        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="unrestricted-mode-toggle" style="display: flex; align-items: center; gap: 6px;">
              <span>Unrestricted System Access Mode</span>
              ${host.unrestrictedMode ? html`<span style="font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); font-weight: 700;">UNLOCKED</span>` : ''}
            </label>
            <span class="setting-desc">Allows agent filesystem reads/writes beyond sandbox directories and enables full administrative tooling (unrestricted_mode in agent_config.json).</span>
          </div>
          <input
            id="unrestricted-mode-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.unrestrictedMode}
            @change=${(e: Event) => {
              const val = (e.target as HTMLInputElement).checked;
              host.setUnrestrictedMode ? host.setUnrestrictedMode(val) : (host.unrestrictedMode = val);
              soundFX.playToggle();
              host.requestUpdate();
            }} />
        </div>

        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="offline-mode-toggle">Air-gapped / Offline Mode</label>
            <span class="setting-desc">Disables external HTTP requests; forces all inference and tools to run strictly on localhost.</span>
          </div>
          <input
            id="offline-mode-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.offlineMode}
            @change=${(e: Event) => {
              host.offlineMode = (e.target as HTMLInputElement).checked;
              soundFX.playToggle();
              host.requestUpdate();
            }} />
        </div>

        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="dryrun-toggle">Safe Dry-Run Simulation Mode</label>
            <span class="setting-desc">Simulates code edits and command outputs without making destructive modifications to disk.</span>
          </div>
          <input
            id="dryrun-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.dryRunEnabled}
            @change=${(e: Event) => {
              host.dryRunEnabled = (e.target as HTMLInputElement).checked;
              soundFX.playToggle();
              host.requestUpdate();
            }} />
        </div>
      </div>
    </div>

    <!-- Section 3: Configuration Backup, Import & System Control -->
    <div class="form-section" id="config-backup-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">💾</span> Configuration Backup, Import & Factory Reset
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">State Management</span>
      </div>

      <p class="setting-desc" style="margin-bottom: 8px;">
        Export your complete visual, audio, and model profile settings to a portable JSON file, or restore from a previous backup.
      </p>

      <div class="config-actions" id="config-actions-bar">
        <button
          type="button"
          id="btn-export-config"
          class="config-btn"
          @click=${() => host.exportConfig && host.exportConfig()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Backup JSON
        </button>

        <label class="config-btn" id="btn-import-config" style="cursor: pointer;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Import Backup JSON
          <input
            type="file"
            id="import-config-file-input"
            accept=".json"
            style="display: none;"
            @change=${(e: Event) => host.importConfig && host.importConfig(e)} />
        </label>

        <button
          type="button"
          id="btn-reset-defaults"
          class="config-btn"
          style="border-color: rgba(255, 80, 80, 0.4); color: #ff8080;"
          @click=${() => host.resetConfig && host.resetConfig()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
          Reset to Factory Defaults
        </button>

        <button
          type="button"
          id="btn-force-stop-server"
          class="config-btn"
          style="margin-left: auto; background: rgba(255, 40, 40, 0.15); border-color: rgba(255, 40, 40, 0.4); color: #ff6666;"
          @click=${() => host.forceStopServer && host.forceStopServer()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <rect x="9" y="9" width="6" height="6"></rect>
          </svg>
          Stop Backend Server
        </button>
      </div>
    </div>
  `;
}

