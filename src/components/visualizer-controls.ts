import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { THEMES, ThemeKey } from '../services/settings-manager';

export interface VisualizerConfig {
  activeTheme: ThemeKey;
  particleShape: string;
  rotationSpeed: number;
  rotationLocked: boolean;
  metalness: number;
  roughness: number;
  autoPanEnabled: boolean;
  autoPanSpeed: number;
  directionalLightIntensity: number;
  ambientLightIntensity: number;
}

@customElement('lumin-visualizer-controls')
export class LuminVisualizerControls extends LitElement {
  @property({ type: Boolean }) isOpen = false;
  @property({ type: Object }) config: VisualizerConfig = {
    activeTheme: 'cyberware',
    particleShape: 'saturn',
    rotationSpeed: 1.0,
    rotationLocked: false,
    metalness: 0.1,
    roughness: 0.7,
    autoPanEnabled: true,
    autoPanSpeed: 1.0,
    directionalLightIntensity: 1.2,
    ambientLightIntensity: 0.15,
  };

  @state() private activeTab: 'THEMES' | 'GEOMETRY' | 'ENVIRONMENT' = 'THEMES';

  static styles = css`
    :host {
      display: block;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      background: rgba(18, 18, 24, 0.95);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tabs {
      display: flex;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #a0a0a0);
      font-weight: bold;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }

    .tab-btn.active {
      background: rgba(0, 170, 255, 0.2);
      color: var(--glow-color, #00aaff);
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .theme-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .theme-card {
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
      background: rgba(255, 255, 255, 0.03);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
    }

    .theme-card.active {
      border-color: var(--glow-color, #00aaff);
      background: rgba(0, 170, 255, 0.1);
    }

    .swatch {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .control-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
      border-radius: var(--lumin-radius-md, 8px);
    }

    .control-row label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #f1f5f9);
    }

    .control-row select {
      background-color: var(--background-surface, #131722);
      color: #ffffff;
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.14));
      border-radius: var(--lumin-radius-md, 8px);
      padding: 8px 34px 8px 12px;
      font-size: 0.82rem;
      font-family: inherit;
      font-weight: 600;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300aaff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 13px;
      transition: all 0.18s ease;
      min-width: 140px;
    }

    .control-row select:hover {
      border-color: rgba(255, 255, 255, 0.25);
      background-color: #171d2b;
    }

    .control-row select:focus {
      border-color: var(--glow-color, #00aaff);
      box-shadow: 0 0 0 1px var(--glow-color, #00aaff), 0 0 12px var(--glow-color-faded, rgba(0, 170, 255, 0.28));
      background-color: #0d121f;
    }

    .control-row select option {
      background-color: #131722;
      color: #ffffff;
      padding: 8px 12px;
    }

    .control-row input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 180px;
      height: 5px;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      transition: background 0.2s;
    }

    .control-row input[type="range"]:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .control-row input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--glow-color, #00aaff);
      box-shadow: 0 0 10px var(--glow-color-faded, rgba(0, 170, 255, 0.4));
      border: 2px solid #0b0f19;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .control-row input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.25);
      box-shadow: 0 0 16px var(--glow-color, #00aaff);
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary, #94a3b8);
      width: 28px;
      height: 28px;
      border-radius: var(--lumin-radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.15s ease;
      outline: none;
    }

    .close-btn:hover {
      background: rgba(244, 63, 94, 0.18);
      border-color: rgba(244, 63, 94, 0.35);
      color: #f43f5e;
    }
  `;

  render() {
    if (!this.isOpen) return null;

    return html`
      <div class="modal-overlay" @click=${this.handleOverlayClick}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h3 style="margin: 0; color: var(--glow-color, #00aaff);">VISUALIZER & SETTINGS</h3>
            <button class="close-btn" @click=${this.close}>✕</button>
          </div>

          <div class="tabs">
            <button class="tab-btn ${this.activeTab === 'THEMES' ? 'active' : ''}" @click=${() => this.activeTab = 'THEMES'}>THEMES</button>
            <button class="tab-btn ${this.activeTab === 'GEOMETRY' ? 'active' : ''}" @click=${() => this.activeTab = 'GEOMETRY'}>GEOMETRY</button>
            <button class="tab-btn ${this.activeTab === 'ENVIRONMENT' ? 'active' : ''}" @click=${() => this.activeTab = 'ENVIRONMENT'}>ENVIRONMENT</button>
          </div>

          <div class="modal-body">
            ${this.activeTab === 'THEMES' ? this.renderThemes() : ''}
            ${this.activeTab === 'GEOMETRY' ? this.renderGeometry() : ''}
            ${this.activeTab === 'ENVIRONMENT' ? this.renderEnvironment() : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderThemes() {
    return html`
      <div class="theme-grid">
        ${Object.entries(THEMES).map(([key, t]) => html`
          <div
            class="theme-card ${this.config.activeTheme === key ? 'active' : ''}"
            @click=${() => this.updateConfig('activeTheme', key as ThemeKey)}
          >
            <div class="swatch" style="background: ${t['--glow-color']};"></div>
            <span>${t.name}</span>
          </div>
        `)}
      </div>
    `;
  }

  private renderGeometry() {
    const shapes = ['saturn', 'sphere', 'cube', 'cylinder', 'torus', 'trefoil', 'lissajous', 'flowerOfLife', 'vesicaPiscis', 'triangle'];
    return html`
      <div class="control-row">
        <label>Particle Shape</label>
        <select
          .value=${this.config.particleShape}
          @change=${(e: Event) => this.updateConfig('particleShape', (e.target as HTMLSelectElement).value)}
        >
          ${shapes.map((s) => html`<option value="${s}">${s.toUpperCase()}</option>`)}
        </select>
      </div>

      <div class="control-row">
        <label>Rotation Speed</label>
        <input
          type="range" min="0" max="3" step="0.1"
          .value=${String(this.config.rotationSpeed)}
          @input=${(e: Event) => this.updateConfig('rotationSpeed', parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    `;
  }

  private renderEnvironment() {
    return html`
      <div class="control-row">
        <label>Metalness</label>
        <input
          type="range" min="0" max="1" step="0.05"
          .value=${String(this.config.metalness)}
          @input=${(e: Event) => this.updateConfig('metalness', parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>

      <div class="control-row">
        <label>Roughness</label>
        <input
          type="range" min="0" max="1" step="0.05"
          .value=${String(this.config.roughness)}
          @input=${(e: Event) => this.updateConfig('roughness', parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    `;
  }

  private updateConfig(key: keyof VisualizerConfig, val: any) {
    this.config = { ...this.config, [key]: val };
    this.dispatchEvent(new CustomEvent('config-change', { detail: this.config, bubbles: true, composed: true }));
  }

  private handleOverlayClick() {
    this.close();
  }

  private close() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}
