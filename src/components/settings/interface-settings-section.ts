import { html, TemplateResult } from 'lit';
import { THEMES } from '../../services/settings-manager';
import { soundFX } from '../../sound-effects';

/**
 * Procedurally generates a randomized, harmonically compatible visualizer configuration.
 */
export function randomizeVisualizerSettings(host: any) {
  soundFX.playDiceRoll();

  const themes: Array<keyof typeof THEMES> = [
    'cyberware', 'crimson', 'matrix', 'solar', 'arcane', 'glacial', 'golden', 'hotpink', 'aqua', 'tungsten'
  ];
  const visualizerShapes = ['sphere', 'cube', 'torus', 'cylinder', 'pyramid', 'torusKnot'];
  const particleShapes = [
    'saturn',
    'sphere',
    'cube',
    'cylinder',
    'torus',
    'trefoil',
    'lissajous',
    'flowerOfLife',
    'vesicaPiscis',
    'triangle'
  ];
  const colorGradingModes = ['cyberpunk', 'matrix', 'solar', 'noir', 'thermal'];

  // 1. Theme or dynamic duo gradient
  const useStandardTheme = Math.random() > 0.25;
  if (useStandardTheme) {
    host.activeTheme = themes[Math.floor(Math.random() * themes.length)];
  } else {
    host.activeTheme = 'custom';
    const vibrantPairs = [
      ['#00f0ff', '#ff0077'],
      ['#7928ca', '#ff0080'],
      ['#00dfd8', '#007cf0'],
      ['#ff4d4d', '#f9cb28'],
      ['#00ff87', '#60efff'],
      ['#ff0099', '#493240'],
      ['#f12711', '#f5af19'],
      ['#38ef7d', '#11998e'],
      ['#ea00d9', '#711c91']
    ];
    const picked = vibrantPairs[Math.floor(Math.random() * vibrantPairs.length)];
    host.customMainColor = picked[0];
    host.customParticleColor = picked[1];
    host.separateCustomColors = true;
  }

  // 2. Geometry & Particles
  host.visualizerShape = visualizerShapes[Math.floor(Math.random() * visualizerShapes.length)];
  host.particleShape = particleShapes[Math.floor(Math.random() * particleShapes.length)];
  host.visualizerSize = Number((1.2 + Math.random() * 1.0).toFixed(2));
  host.visualizerSpeed = Number((0.8 + Math.random() * 0.7).toFixed(2));
  host.particleSize = Number((0.03 + Math.random() * 0.04).toFixed(3));
  host.particleSpeed = Number((0.7 + Math.random() * 0.8).toFixed(2));
  host.showParticles = true;
  host.showMainVisualizer = true;

  // 3. Audio Shape Morphing & Liquid Mercury Metal (Enabled by default)
  host.morphingEnabled = true;
  host.morphingIntensity = Number((0.6 + Math.random() * 1.0).toFixed(2));
  host.mercuryMetalEnabled = true;
  host.mercuryFluidity = Number((0.8 + Math.random() * 0.8).toFixed(2));
  host.mercurySheen = Number((1.1 + Math.random() * 0.7).toFixed(2));

  // 4. Bloom & Motion Blur (Afterimage)
  host.afterimageEnabled = true;
  host.afterimageStrength = Number((0.70 + Math.random() * 0.20).toFixed(2));
  host.bloomIntensity = Number((0.40 + Math.random() * 0.40).toFixed(2));
  host.bloomRadius = Number((0.25 + Math.random() * 0.30).toFixed(2));
  host.bloomThreshold = 0.25;

  // 5. Stylized Post-Processing Shader Flavors (Tastefully blended)
  host.chromaticAberrationEnabled = Math.random() > 0.45;
  host.chromaticAberrationIntensity = Number((0.003 + Math.random() * 0.006).toFixed(4));
  host.filmGrainEnabled = Math.random() > 0.65;
  host.filmGrainIntensity = 0.25;
  host.scanlinesEnabled = Math.random() > 0.70;
  host.scanlinesIntensity = 0.28;
  host.vignetteEnabled = Math.random() > 0.35;
  host.vignetteDarkness = 1.2;
  host.glitchEnabled = Math.random() > 0.85;
  host.glitchIntensity = 0.22;
  host.anamorphicFlareEnabled = Math.random() > 0.55;
  host.flareIntensity = Number((0.5 + Math.random() * 0.4).toFixed(2));
  host.colorGradingEnabled = Math.random() > 0.65;
  host.colorGradingMode = colorGradingModes[Math.floor(Math.random() * colorGradingModes.length)];

  // 6. Materials & Stage Lighting
  host.metalness = Number((0.15 + Math.random() * 0.65).toFixed(2));
  host.roughness = Number((0.15 + Math.random() * 0.55).toFixed(2));
  host.directionalLightIntensity = Number((1.0 + Math.random() * 0.6).toFixed(2));
  host.ambientLightIntensity = Number((0.15 + Math.random() * 0.2).toFixed(2));
  host.autoPanEnabled = true;
  host.autoPanSpeed = 1.0;

  // Feedback Notification Banner
  const shapeTitle = host.visualizerShape.charAt(0).toUpperCase() + host.visualizerShape.slice(1);
  const themeTitle = host.activeTheme === 'custom' ? 'Neon Gradient' : THEMES[host.activeTheme as keyof typeof THEMES]?.name || 'Custom';
  host.lastRandomPresetToast = `🎲 Rolled: ${shapeTitle} • ${themeTitle}`;
  if (host.randomToastTimeout) clearTimeout(host.randomToastTimeout);
  host.randomToastTimeout = setTimeout(() => {
    host.lastRandomPresetToast = null;
    host.requestUpdate();
  }, 3500);

  host.requestUpdate();
}

/**
 * Applies a curated signature archetype preset.
 */
export function applyVisualizerPreset(host: any, presetKey: string) {
  soundFX.playClick();

  // 1. Shared Clean Cinematic Baseline (matches Default Quality Bar)
  host.showMainVisualizer = true;
  host.showParticles = true;
  host.visualizerSize = 2.0;
  host.visualizerSpeed = 1.0;
  host.particleSize = 0.05;
  host.particleSpeed = 1.0;
  host.globalScale = 1.0;

  // Fluid Dynamics & Audio Morphing
  host.morphingEnabled = true;
  host.morphingIntensity = 1.0;
  host.mercuryMetalEnabled = true;
  host.mercuryFluidity = 1.0;
  host.mercurySheen = 1.5;

  // Trails & Bloom
  host.afterimageEnabled = true;
  host.afterimageStrength = 0.85;
  host.bloomIntensity = 0.5;
  host.bloomRadius = 0.35;
  host.bloomThreshold = 0.25;

  // Material & Lighting
  host.metalness = 0.2;
  host.roughness = 0.55;
  host.ambientLightIntensity = 0.15;
  host.directionalLightIntensity = 1.2;

  // Clear all previous optional/heavy shader FX to clean state (prevents leftover artifacts)
  host.chromaticAberrationEnabled = false;
  host.chromaticAberrationIntensity = 0.005;
  host.scanlinesEnabled = false;
  host.scanlinesIntensity = 0.35;
  host.scanlinesDensity = 600.0;
  host.filmGrainEnabled = false;
  host.filmGrainIntensity = 0.35;
  host.vignetteEnabled = false;
  host.vignetteDarkness = 1.4;
  host.vignetteOffset = 1.1;
  host.anamorphicFlareEnabled = false;
  host.flareIntensity = 0.8;
  host.flareThreshold = 0.75;
  host.glitchEnabled = false;
  host.glitchIntensity = 0.35;
  host.colorGradingEnabled = false;
  host.colorGradingMode = 'cyberpunk';
  host.colorGradingIntensity = 0.85;
  host.gradientBevelEnabled = false;
  host.godRaysEnabled = false;
  host.edgeGlowEnabled = false;
  host.hexGridEnabled = false;
  host.barrelDistortionEnabled = false;
  host.pixelationEnabled = false;
  host.vhsDistortionEnabled = false;
  host.prismaticDispersionEnabled = false;

  const isCustomGeometry = host.geometrySource === 'custom';

  // 2. Curated Signature Overrides
  switch (presetKey) {
    case 'luminDefault':
    case 'signatureDefault':
      // The authentic LUMIN baseline experience
      host.activeTheme = 'cyberware';
      if (!isCustomGeometry) host.visualizerShape = 'sphere';
      host.particleShape = 'saturn';
      host.particleSize = 0.05;
      host.particleSpeed = 1.0;
      host.visualizerSize = 2.0;
      host.visualizerSpeed = 1.0;
      host.metalness = 0.10;
      host.roughness = 0.70;
      host.bloomIntensity = 0.50;
      host.bloomRadius = 0.35;
      host.bloomThreshold = 0.25;
      host.morphingIntensity = 1.0;
      host.mercuryFluidity = 1.0;
      host.mercurySheen = 1.5;
      host.afterimageStrength = 0.85;
      break;

    case 'liquidChrome':
      // Mirror-fluid chrome torus, ultra-reflective fluid metal
      host.activeTheme = 'cyberware';
      if (!isCustomGeometry) host.visualizerShape = 'torus';
      host.particleShape = 'trefoil';
      host.particleSize = 0.045;
      host.particleSpeed = 1.1;
      host.metalness = 0.95;
      host.roughness = 0.06;
      host.mercuryMetalEnabled = true;
      host.mercuryFluidity = 1.45;
      host.mercurySheen = 1.95;
      host.morphingIntensity = 1.35;
      host.bloomIntensity = 0.72;
      host.bloomRadius = 0.35;
      host.bloomThreshold = 0.22;
      host.afterimageStrength = 0.92;
      host.chromaticAberrationEnabled = true;
      host.chromaticAberrationIntensity = 0.004;
      host.vignetteEnabled = true;
      host.vignetteDarkness = 0.75;
      host.vignetteOffset = 1.25;
      break;

    case 'emeraldMatrix':
      // Elegant green phosphor tech, readable, premium
      host.activeTheme = 'matrix';
      if (!isCustomGeometry) host.visualizerShape = 'cylinder';
      host.particleShape = 'vesicaPiscis';
      host.globalScale = 0.60;
      host.metalness = 0.40;
      host.roughness = 0.40;
      host.colorGradingEnabled = true;
      host.colorGradingMode = 'matrix';
      host.colorGradingIntensity = 0.85;
      host.scanlinesEnabled = true;
      host.scanlinesIntensity = 0.20;
      host.scanlinesDensity = 650.0;
      host.bloomIntensity = 0.55;
      host.morphingIntensity = 1.1;
      host.mercuryMetalEnabled = true;
      host.mercuryFluidity = 1.0;
      host.mercurySheen = 1.45;
      break;

    case 'solarFlare':
      // Radiant stellar core, warm, dramatic, sharp
      host.activeTheme = 'solar';
      if (!isCustomGeometry) host.visualizerShape = 'torusKnot';
      host.particleShape = 'flowerOfLife';
      host.metalness = 0.50;
      host.roughness = 0.30;
      host.anamorphicFlareEnabled = true;
      host.flareIntensity = 0.80;
      host.flareThreshold = 0.70;
      host.bloomIntensity = 0.70;
      host.bloomThreshold = 0.22;
      host.afterimageStrength = 0.90;
      host.morphingIntensity = 1.35;
      host.mercuryFluidity = 1.3;
      host.mercurySheen = 1.6;
      host.vignetteEnabled = true;
      host.vignetteDarkness = 0.85;
      host.vignetteOffset = 1.15;
      break;

    case 'arcaneNova':
      // Occult precision instrument, rich purple, sophisticated
      host.activeTheme = 'arcane';
      if (!isCustomGeometry) host.visualizerShape = 'sphere';
      host.particleShape = 'triangle';
      host.visualizerSize = 1.25;
      host.visualizerSpeed = 0.3;
      host.metalness = 0.55;
      host.roughness = 0.25;
      host.chromaticAberrationEnabled = true;
      host.chromaticAberrationIntensity = 0.005;
      host.bloomIntensity = 0.65;
      host.mercurySheen = 1.75;
      host.mercuryFluidity = 1.15;
      host.morphingIntensity = 1.1;
      break;

    case 'glacialPrism':
      // Cold crystalline clarity, serene, expensive
      host.activeTheme = 'glacial';
      if (!isCustomGeometry) host.visualizerShape = 'pyramid';
      host.particleShape = 'torus';
      host.particleSize = 0.065;
      host.particleSpeed = 0.75;
      host.metalness = 0.65;
      host.roughness = 0.20;
      host.bloomIntensity = 0.50;
      host.vignetteEnabled = true;
      host.vignetteDarkness = 0.80;
      host.vignetteOffset = 1.20;
      host.morphingIntensity = 0.95;
      host.mercuryFluidity = 0.90;
      host.mercurySheen = 1.55;
      break;
  }

  // Toast Notification Banner
  const presetLabels: Record<string, string> = {
    luminDefault: '✦ LUMIN Default',
    signatureDefault: '✦ LUMIN Default',
    liquidChrome: '🌟 Liquid Chrome',
    emeraldMatrix: '🪐 Emerald Matrix',
    solarFlare: '☀️ Solar Supernova',
    arcaneNova: '🔮 Arcane Quantum',
    glacialPrism: '❄️ Glacial Prism',
  };

  host.lastRandomPresetToast = `✨ Preset: ${presetLabels[presetKey] || presetKey}`;
  if (host.randomToastTimeout) clearTimeout(host.randomToastTimeout);
  host.randomToastTimeout = setTimeout(() => {
    host.lastRandomPresetToast = null;
    host.requestUpdate();
  }, 3500);

  host.requestUpdate();
}

export function renderInterfaceSettingsSection(host: any): TemplateResult {
  const filter = host.activeInterfaceFilter || 'ALL';
  const viewportHeightMap = {
    compact: 'clamp(75px, 12vh, 105px)',
    standard: 'clamp(100px, 17vh, 150px)',
    expanded: 'clamp(140px, 24vh, 200px)'
  };
  const activeViewportHeight = viewportHeightMap[host.previewViewportSize as keyof typeof viewportHeightMap] || 'clamp(100px, 17vh, 150px)';
  const themeGlowColor = host.activeTheme === 'custom' 
    ? (host.customMainColor || '#00aaff') 
    : (THEMES[host.activeTheme as keyof typeof THEMES]?.['--glow-color'] || '#00aaff');

  const filterTabs = [
    { id: 'ALL', label: 'All Controls', icon: '✨' },
    { id: 'THEMES', label: 'Themes & Colors', icon: '🎨' },
    { id: 'GEOMETRY', label: '3D Geometry', icon: '🪐' },
    { id: 'POST_PROCESSING', label: 'Glow & Shaders', icon: '💫' },
    { id: 'CAMERA', label: 'Camera & Lighting', icon: '🎥' },
    { id: 'WORKSPACE', label: 'Workspace & Fonts', icon: '💻' },
  ];

  // Calculate active shader count for HUD badge
  let activeShadersCount = 0;
  if (host.afterimageEnabled) activeShadersCount++;
  if (host.morphingEnabled) activeShadersCount++;
  if (host.mercuryMetalEnabled) activeShadersCount++;
  if (host.chromaticAberrationEnabled) activeShadersCount++;
  if (host.filmGrainEnabled) activeShadersCount++;
  if (host.scanlinesEnabled) activeShadersCount++;
  if (host.vignetteEnabled) activeShadersCount++;
  if (host.glitchEnabled) activeShadersCount++;
  if (host.anamorphicFlareEnabled) activeShadersCount++;
  if (host.colorGradingEnabled) activeShadersCount++;

  return html`
    <div class="interface-settings-layout" style="display: flex; flex-direction: column; height: 100%; width: 100%; overflow: hidden; background: var(--background-primary, #08090d);">
      
      <!-- PINNED TOP STUDIO DOCK (Header + Live 3D Studio Preview + Filter Pills) -->
      <div class="interface-studio-dock" style="flex-shrink: 0; display: flex; flex-direction: column; background: var(--background-primary, #08090d); border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08)); z-index: 10; padding: 8px 18px 6px 18px; gap: 6px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);">
        
        <!-- Header Banner -->
        <div class="settings-tab-banner" id="interface-settings-banner" style="padding-bottom: 0; margin-bottom: 0; border-bottom: none; gap: 6px;">
          <div class="settings-tab-banner-info" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h3 style="font-size: 1.05rem; margin: 0; display: flex; align-items: center; gap: 6px;">
              <span class="section-icon">🎨</span> Interface & 3D Visualizer
            </h3>
            <span style="font-size: 0.72rem; color: var(--text-secondary, #94a3b8);">
              Sims-style live 3D customizer: changes to shaders, geometry, materials, and themes update immediately.
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button
              type="button"
              id="header-dice-randomize-btn"
              class="action-btn"
              style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(139, 92, 246, 0.3)); border: 1px solid rgba(56, 189, 248, 0.5); color: #38bdf8; font-weight: 700; padding: 3px 10px; border-radius: 6px; font-size: 0.74rem; display: flex; align-items: center; gap: 4px; cursor: pointer; box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);"
              @click=${() => randomizeVisualizerSettings(host)}
            >
              <span style="font-size: 0.85rem;">🎲</span>
              <span>Randomize Style</span>
            </button>
            <div class="settings-header-badge" style="font-size: 0.7rem; padding: 2px 7px;">
              Theme: ${THEMES[host.activeTheme as keyof typeof THEMES]?.name || 'Custom'}
            </div>
          </div>
        </div>

        <!-- 🎮 LIVE 3D VISUALIZER STUDIO PREVIEW (THE SIMS STYLE LIVE CUSTOMIZATION STUDIO) -->
        <div
          class="visualizer-studio-container"
          id="visualizer-studio-preview-card"
          style="margin-bottom: 0; background: linear-gradient(180deg, rgba(13, 19, 33, 0.95), rgba(6, 9, 17, 0.98)); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 14px ${themeGlowColor}20; position: relative;"
        >
          <!-- Studio Top Toolbar -->
          <div
            class="studio-top-toolbar"
            style="padding: 3px 10px; background: rgba(0, 0, 0, 0.45); border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: nowrap; overflow-x: auto;"
          >
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <div style="display: flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 1px 6px; border-radius: 9999px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; animation: pulse 1.8s infinite;"></span>
                <span style="font-size: 0.66rem; font-weight: 700; color: #34d399; letter-spacing: 0.04em; text-transform: uppercase;">Live 3D Studio Preview</span>
              </div>

              ${host.lastRandomPresetToast ? html`
                <div style="display: flex; align-items: center; gap: 4px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); padding: 1px 6px; border-radius: 9999px; font-size: 0.68rem; font-weight: 600; color: #c084fc; animation: fadeIn 0.2s ease-out;">
                  <span>${host.lastRandomPresetToast}</span>
                </div>
              ` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
              <!-- 🎲 Primary Randomize / Dice Button -->
              <button
                type="button"
                id="studio-dice-randomize-btn"
                title="Generate randomized combination of compatible visualizer settings"
                style="background: linear-gradient(135deg, #0284c7, #7c3aed); border: 1px solid rgba(255,255,255,0.3); color: #ffffff; font-weight: 700; font-size: 0.7rem; padding: 2px 7px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 3px; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);"
                @click=${() => randomizeVisualizerSettings(host)}
              >
                <span style="font-size: 0.78rem;">🎲</span>
                <span>Randomize</span>
              </button>

              <!-- Audio Reactivity Simulation Toggle -->
              <button
                type="button"
                id="studio-audio-pulse-sim-toggle"
                title="Toggle simulated audio reactivity pulses to test shape morphing"
                style="background: ${host.previewSimulateAudio !== false ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.06)'}; border: 1px solid ${host.previewSimulateAudio !== false ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.12)'}; color: ${host.previewSimulateAudio !== false ? '#38bdf8' : '#94a3b8'}; font-weight: 600; font-size: 0.7rem; padding: 2px 6px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 3px;"
                @click=${() => {
                  host.previewSimulateAudio = host.previewSimulateAudio === false;
                  soundFX.playToggle(host.previewSimulateAudio);
                  host.requestUpdate();
                }}
              >
                <span>${host.previewSimulateAudio !== false ? '🔊 Pulsing' : '🔈 Idle'}</span>
              </button>

              <!-- Camera Reset Button -->
              <button
                type="button"
                id="studio-reset-camera-btn"
                title="Reset camera rotation and zoom"
                style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; font-weight: 600; font-size: 0.7rem; padding: 2px 6px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 3px;"
                @click=${() => {
                  host.cameraRotX = 0;
                  host.cameraRotY = 0;
                  host.cameraZoomMult = 1.0;
                  host.cameraLocked = false;
                  soundFX.playClick();
                  host.requestUpdate();
                }}
              >
                <span>🎥 Reset</span>
              </button>

              <!-- Viewport Size Switcher -->
              <div style="display: flex; align-items: center; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 5px; padding: 1px;">
                <button
                  type="button"
                  title="Compact Viewport (85px)"
                  style="background: ${host.previewViewportSize === 'compact' ? 'rgba(56, 189, 248, 0.25)' : 'transparent'}; border: none; color: ${host.previewViewportSize === 'compact' ? '#38bdf8' : '#94a3b8'}; padding: 1px 5px; border-radius: 3px; font-size: 0.66rem; font-weight: 700; cursor: pointer;"
                  @click=${() => {
                    host.previewViewportSize = 'compact';
                    soundFX.playClick();
                    host.requestUpdate();
                  }}
                >S</button>
                <button
                  type="button"
                  title="Standard Viewport (125px)"
                  style="background: ${(host.previewViewportSize === 'standard' || !host.previewViewportSize) ? 'rgba(56, 189, 248, 0.25)' : 'transparent'}; border: none; color: ${(host.previewViewportSize === 'standard' || !host.previewViewportSize) ? '#38bdf8' : '#94a3b8'}; padding: 1px 5px; border-radius: 3px; font-size: 0.66rem; font-weight: 700; cursor: pointer;"
                  @click=${() => {
                    host.previewViewportSize = 'standard';
                    soundFX.playClick();
                    host.requestUpdate();
                  }}
                >M</button>
                <button
                  type="button"
                  title="Expanded Viewport (175px)"
                  style="background: ${host.previewViewportSize === 'expanded' ? 'rgba(56, 189, 248, 0.25)' : 'transparent'}; border: none; color: ${host.previewViewportSize === 'expanded' ? '#38bdf8' : '#94a3b8'}; padding: 1px 5px; border-radius: 3px; font-size: 0.66rem; font-weight: 700; cursor: pointer;"
                  @click=${() => {
                    host.previewViewportSize = 'expanded';
                    soundFX.playClick();
                    host.requestUpdate();
                  }}
                >L</button>
              </div>
            </div>
          </div>

          <!-- Interactive 3D Canvas Stage -->
          <div
            class="studio-canvas-stage"
            style="height: ${activeViewportHeight}; min-height: 75px; width: 100%; position: relative; background: radial-gradient(circle at center, rgba(15, 23, 42, 0.4) 0%, rgba(3, 7, 18, 0.95) 100%); overflow: hidden;"
          >
            <gdm-live-audio-visuals-3d
              .isActive=${true}
              .isSpeaking=${host.previewSimulateAudio !== false}
              .inputNode=${host.inputNode}
              .outputNode=${host.outputNode}
              .particleSize=${host.particleSize}
              .particleFormationScale=${host.particleFormationScale || 1.0}
              .particleSpeed=${host.particleSpeed}
              .particleShape=${host.particleShape}
              .visualizerShape=${host.visualizerShape}
              .visualizerSize=${host.visualizerSize}
              .visualizerSpeed=${host.visualizerSpeed}
              .showParticles=${host.showParticles}
              .showMainVisualizer=${host.showMainVisualizer}
              .globalScale=${host.globalScale}
              .bloomIntensity=${host.bloomIntensity}
              .bloomRadius=${host.bloomRadius}
              .bloomThreshold=${host.bloomThreshold}
              .themeGlowColors=${host.activeTheme === 'custom' ? (host.separateCustomColors ? [host.customMainColor] : host.customThemeColors) : [THEMES[host.activeTheme as keyof typeof THEMES]?.['--glow-color'] || '#00aaff']}
              .themeParticleColors=${host.activeTheme === 'custom' && host.separateCustomColors ? [host.customParticleColor] : []}
              .backdropTextureUrl=${null}
              .afterimageEnabled=${host.afterimageEnabled}
              .afterimageStrength=${host.afterimageStrength}
              .chromaticAberrationEnabled=${host.chromaticAberrationEnabled}
              .chromaticAberrationIntensity=${host.chromaticAberrationIntensity}
              .morphingEnabled=${host.morphingEnabled}
              .morphingIntensity=${host.morphingIntensity}
              .mercuryMetalEnabled=${host.mercuryMetalEnabled}
              .mercuryFluidity=${host.mercuryFluidity}
              .mercurySheen=${host.mercurySheen}
              .gradientBevelEnabled=${host.gradientBevelEnabled}
              .bevelRingWidth=${host.bevelRingWidth}
              .bevelSheen=${host.bevelSheen}
              .bevelShadowEnabled=${host.bevelShadowEnabled}
              .filmGrainEnabled=${host.filmGrainEnabled}
              .filmGrainIntensity=${host.filmGrainIntensity}
              .scanlinesEnabled=${host.scanlinesEnabled}
              .scanlinesIntensity=${host.scanlinesIntensity}
              .scanlinesDensity=${host.scanlinesDensity}
              .vignetteEnabled=${host.vignetteEnabled}
              .vignetteDarkness=${host.vignetteDarkness}
              .vignetteOffset=${host.vignetteOffset}
              .glitchEnabled=${host.glitchEnabled}
              .glitchIntensity=${host.glitchIntensity}
              .anamorphicFlareEnabled=${host.anamorphicFlareEnabled}
              .flareIntensity=${host.flareIntensity}
              .flareThreshold=${host.flareThreshold}
              .colorGradingEnabled=${host.colorGradingEnabled}
              .colorGradingMode=${host.colorGradingMode}
              .colorGradingIntensity=${host.colorGradingIntensity}
              .glowPulseStrength=${host.glowPulseStrength}
              .themeTransitionSpeed=${host.themeTransitionSpeed}
              .metalness=${host.metalness}
              .roughness=${host.roughness}
              .rotationSpeed=${host.rotationSpeed}
              .rotationLocked=${host.rotationLocked}
              .autoPanEnabled=${host.autoPanEnabled}
              .autoPanSpeed=${host.autoPanSpeed}
              .directionalLightIntensity=${host.directionalLightIntensity}
              .ambientLightIntensity=${host.ambientLightIntensity}
              .cameraRotX=${host.cameraRotX}
              .cameraRotY=${host.cameraRotY}
              .cameraZoomMult=${host.cameraZoomMult}
              .cameraLocked=${host.cameraLocked}
              .envSource=${host.envSource}
              .envImageUrl=${host.envImageUrl}
              .envImageName=${host.envImageName}
              .envIntensity=${host.envIntensity}
              .envReflectionStrength=${host.envReflectionStrength}
              .envRotationY=${host.envRotationY}
              .geometrySource=${host.geometrySource}
              .customModelUrl=${host.customModelUrl}
              .customModelName=${host.customModelName}
              .customModelScale=${host.customModelScale}
              .customModelPosX=${host.customModelPosX}
              .customModelPosY=${host.customModelPosY}
              .customModelPosZ=${host.customModelPosZ}
              .customModelRotX=${host.customModelRotX}
              .customModelRotY=${host.customModelRotY}
              .customModelRotZ=${host.customModelRotZ}
              @custom-model-loaded=${(e: CustomEvent) => {
                host.customModelVertexCount = e.detail.vertexCount;
                host.customModelStatus = `Loaded (${e.detail.vertexCount.toLocaleString()} vertices)`;
                host.customModelError = null;
                host.requestUpdate();
              }}
              @custom-model-error=${(e: CustomEvent) => {
                host.customModelError = e.detail.error;
                host.customModelStatus = null;
                host.requestUpdate();
              }}
              @custom-env-loaded=${(e: CustomEvent) => {
                host.envImageStatus = `Active (${e.detail.fileName || 'Environment'})`;
                host.envImageError = null;
                host.requestUpdate();
              }}
              @custom-env-error=${(e: CustomEvent) => {
                host.envImageError = e.detail.error;
                host.envImageStatus = null;
                host.requestUpdate();
              }}
              @camera-update=${(e: CustomEvent) => {
                host.cameraRotX = e.detail.rotX;
                host.cameraRotY = e.detail.rotY;
                host.cameraZoomMult = e.detail.zoom;
                host.cameraLocked = e.detail.locked;
              }}
            ></gdm-live-audio-visuals-3d>

            <!-- Interactive 3D Orbit Helper Hint Overlay -->
            <div style="position: absolute; top: 6px; left: 8px; pointer-events: none; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 0.62rem; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.55); padding: 1px 5px; border-radius: 4px; backdrop-filter: blur(4px);">
                💡 Drag stage to orbit • Scroll to zoom
              </span>
            </div>
          </div>

          <!-- Studio Bottom Presets & Live HUD Status Bar -->
          <div
            class="studio-bottom-bar"
            style="padding: 3px 10px; background: rgba(0, 0, 0, 0.55); border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: nowrap; overflow-x: auto;"
          >
            <!-- Curated Archetype Quick Presets -->
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              <span style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; margin-right: 2px;">Signature Presets:</span>
              
              <button
                type="button"
                class="preset-chip"
                id="preset-chip-default"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(59, 130, 246, 0.18); border: 1px solid rgba(96, 165, 250, 0.45); color: #60a5fa; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'luminDefault')}
              >
                ✦ LUMIN Default
              </button>

              <button
                type="button"
                class="preset-chip"
                id="preset-chip-liquid-chrome"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'liquidChrome')}
              >
                🌟 Liquid Chrome
              </button>

              <button
                type="button"
                class="preset-chip"
                id="preset-chip-emerald-matrix"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34d399; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'emeraldMatrix')}
              >
                🪐 Emerald Matrix
              </button>

              <button
                type="button"
                class="preset-chip"
                id="preset-chip-solar-flare"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(251, 191, 36, 0.4); color: #fbbf24; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'solarFlare')}
              >
                ☀️ Solar Supernova
              </button>

              <button
                type="button"
                class="preset-chip"
                id="preset-chip-arcane-nova"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(192, 132, 252, 0.4); color: #c084fc; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'arcaneNova')}
              >
                🔮 Arcane Quantum
              </button>

              <button
                type="button"
                class="preset-chip"
                id="preset-chip-glacial-prism"
                style="padding: 1px 6px; border-radius: 4px; font-size: 0.66rem; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(34, 211, 238, 0.4); color: #22d3ee; cursor: pointer; font-weight: 600;"
                @click=${() => applyVisualizerPreset(host, 'glacialPrism')}
              >
                ❄️ Glacial Prism
              </button>
            </div>

            <!-- Live Active Engine HUD Badges -->
            <div style="display: flex; align-items: center; gap: 3px; font-size: 0.62rem; font-family: monospace; flex-shrink: 0;">
              <span style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                ${host.visualizerShape.toUpperCase()}
              </span>
              <span style="background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                ${host.morphingEnabled ? 'MORPH' : 'STATIC'}
              </span>
              <span style="background: rgba(244, 63, 94, 0.12); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                ${host.mercuryMetalEnabled ? 'MERCURY' : 'STANDARD'}
              </span>
              <span style="background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                ${host.afterimageEnabled ? 'TRAILS' : 'CLEAN'}
              </span>
              <span style="background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.15); padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                ${activeShadersCount} FX
              </span>
            </div>
          </div>
        </div>

        <!-- Sub-category Filter Pills -->
        <div class="settings-filter-pills" id="interface-filter-pills" style="margin-top: 2px; margin-bottom: 0; padding-bottom: 0; display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto;">
          ${filterTabs.map(tab => html`
            <button
              type="button"
              id="filter-pill-${tab.id.toLowerCase()}"
              class="settings-filter-pill ${filter === tab.id ? 'active' : ''}"
              style="padding: 3px 10px; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0;"
              @click=${() => {
                host.activeInterfaceFilter = tab.id;
                soundFX.playClick();
                host.requestUpdate();
              }}>
              <span>${tab.icon}</span>
              <span>${tab.label}</span>
            </button>
          `)}
        </div>
      </div>

      <!-- SCROLLABLE CONTROLS PANEL (Remaining viewport space, scrolls under pinned 3D preview) -->
      <div
        class="interface-controls-scroll-panel"
        id="interface-controls-scroll-panel"
        style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 18px 28px 18px; display: flex; flex-direction: column; gap: 14px; scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent;"
      >

    <!-- Section 1: Themes & Color Palette -->
    ${filter === 'ALL' || filter === 'THEMES' ? html`
      <div class="form-section" id="themes-palette-section">
        <div class="form-section-header">
          <h4 class="form-section-title">
            <span class="section-icon">🎨</span> Themes & Color Schemes
          </h4>
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Live Dynamic Swatches</span>
        </div>

        <div class="theme-selector" id="theme-selector-grid">
          ${Object.entries(THEMES).map(([key, theme]) => html`
            <div
              id="theme-card-${key}"
              class="theme-option ${host.activeTheme === key ? 'active' : ''}"
              @click=${() => {
                host.activeTheme = key;
                soundFX.playClick();
                host.requestUpdate();
              }}>
              <div
                class="theme-preview"
                style="background: ${theme['--glow-color']}; box-shadow: 0 0 10px ${theme['--glow-color']}40;"></div>
              <span class="theme-name">${theme.name}</span>
            </div>
          `)}
          
          <div
            id="theme-card-custom"
            class="theme-option ${host.activeTheme === 'custom' ? 'active' : ''}"
            @click=${() => {
              host.activeTheme = 'custom';
              soundFX.playClick();
              host.requestUpdate();
            }}>
            <div
              class="theme-preview"
              style="background: ${host.separateCustomColors 
                ? `linear-gradient(135deg, ${host.customMainColor || '#00aaff'}, ${host.customParticleColor || '#ff00aa'})` 
                : ((host.customThemeColors && host.customThemeColors.length > 1) 
                  ? `linear-gradient(135deg, ${host.customThemeColors.join(', ')})` 
                  : (host.customThemeColors && host.customThemeColors[0] ? host.customThemeColors[0] : '#00aaff'))}; box-shadow: 0 0 10px rgba(0, 170, 255, 0.4);"></div>
            <span class="theme-name">Custom Palette</span>
          </div>
        </div>

        ${host.activeTheme === 'custom' ? html`
          <div class="custom-theme-picker" id="custom-theme-picker-panel" style="background: rgba(18, 22, 34, 0.85); border: 1px solid rgba(0, 170, 255, 0.25); border-radius: 12px; padding: 16px; margin-top: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px;">
              <div>
                <h5 style="margin: 0; color: #ffffff; font-size: 0.92rem; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                  <span>🎨 Custom Color Palette Designer</span>
                  <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 9999px; background: rgba(0, 170, 255, 0.18); color: #38bdf8; border: 1px solid rgba(0, 170, 255, 0.35); font-weight: 600;">
                    ${host.separateCustomColors ? 'Dual Channels' : (host.customThemeColors.length === 1 ? '1 Color (Solid)' : `${host.customThemeColors.length} Colors Cycle`)}
                  </span>
                </h5>
                <span class="setting-desc" style="font-size: 0.76rem; margin-top: 2px; margin-bottom: 0;">Configure single solid colors or multi-color harmonic sequences.</span>
              </div>
            </div>
            
            <div class="form-field-toggle" style="margin-bottom: 14px; background: rgba(0, 0, 0, 0.25); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="sep-colors-toggle" style="font-weight: 600; font-size: 0.85rem;">Separate Dual Channels (Mesh vs Particles)</label>
                <span class="setting-desc" style="font-size: 0.72rem; margin-bottom: 0;">Assign dedicated independent static colors to the 3D center geometry and outer particle field.</span>
              </div>
              <input
                id="sep-colors-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.separateCustomColors}
                @change=${(e: Event) => {
                  host.separateCustomColors = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>

            ${host.separateCustomColors ? html`
              <!-- Dual Channels Mode -->
              <div class="form-grid-2">
                <div class="form-field" style="background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <label for="custom-main-color" style="font-weight: 600;">Center Mesh Neon Glow</label>
                    <span style="font-family: monospace; font-size: 0.75rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 1px 6px; border-radius: 4px;">${host.customMainColor || '#00aaff'}</span>
                  </div>
                  <span class="setting-desc" style="font-size: 0.72rem; margin-bottom: 8px;">Main color tone for the central 3D visualizer polygon geometry.</span>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <input
                      id="custom-main-color"
                      type="color"
                      style="width: 48px; height: 36px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;"
                      .value=${host.customMainColor || '#00aaff'}
                      @input=${(e: Event) => {
                        host.customMainColor = (e.target as HTMLInputElement).value;
                        host.requestUpdate();
                      }} />
                    <input
                      type="text"
                      style="flex: 1; height: 36px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; padding: 0 10px; font-family: monospace; font-size: 0.85rem;"
                      .value=${host.customMainColor || '#00aaff'}
                      @change=${(e: Event) => {
                        const val = (e.target as HTMLInputElement).value;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          host.customMainColor = val;
                          host.requestUpdate();
                        }
                      }} />
                  </div>
                </div>

                <div class="form-field" style="background: rgba(0, 0, 0, 0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <label for="custom-particle-color" style="font-weight: 600;">Particle Starfield Color</label>
                    <span style="font-family: monospace; font-size: 0.75rem; color: #f43f5e; background: rgba(244, 63, 94, 0.1); padding: 1px 6px; border-radius: 4px;">${host.customParticleColor || '#ff00aa'}</span>
                  </div>
                  <span class="setting-desc" style="font-size: 0.72rem; margin-bottom: 8px;">Accent hue for orbital particle stars and audio point clouds.</span>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <input
                      id="custom-particle-color"
                      type="color"
                      style="width: 48px; height: 36px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;"
                      .value=${host.customParticleColor || '#ff00aa'}
                      @input=${(e: Event) => {
                        host.customParticleColor = (e.target as HTMLInputElement).value;
                        host.requestUpdate();
                      }} />
                    <input
                      type="text"
                      style="flex: 1; height: 36px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; padding: 0 10px; font-family: monospace; font-size: 0.85rem;"
                      .value=${host.customParticleColor || '#ff00aa'}
                      @change=${(e: Event) => {
                        const val = (e.target as HTMLInputElement).value;
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          host.customParticleColor = val;
                          host.requestUpdate();
                        }
                      }} />
                  </div>
                </div>
              </div>
            ` : html`
              <!-- Variable Multi-Color Sequence Mode (1, 2, 3, 4+ Colors) -->
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 0.82rem; font-weight: 600; color: #e2e8f0;">
                    ${host.customThemeColors.length === 1 ? 'Solid Single Color Palette' : `Multi-Color Palette Sequence (${host.customThemeColors.length} Active Colors)`}
                  </span>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 4px 12px; font-size: 0.76rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; background: rgba(0, 170, 255, 0.15); border: 1px solid rgba(0, 170, 255, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer;"
                    ?disabled=${host.customThemeColors.length >= 8}
                    @click=${() => {
                      if (host.customThemeColors.length < 8) {
                        const defaultPool = ['#00e5ff', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6'];
                        const nextColor = defaultPool[host.customThemeColors.length % defaultPool.length];
                        host.customThemeColors = [...host.customThemeColors, nextColor];
                        soundFX.playClick();
                        host.requestUpdate();
                      }
                    }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    <span>Add Color (${host.customThemeColors.length}/8)</span>
                  </button>
                </div>

                <!-- Palette Color Slots -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
                  ${host.customThemeColors.map((color: string, index: number) => html`
                    <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; position: relative;">
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.72rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">
                          Slot ${index + 1}
                        </span>
                        ${host.customThemeColors.length > 1 ? html`
                          <button
                            type="button"
                            title="Remove this color slot"
                            style="background: transparent; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; padding: 2px 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; line-height: 1;"
                            @click=${() => {
                              host.customThemeColors = host.customThemeColors.filter((_: string, i: number) => i !== index);
                              soundFX.playClick();
                              host.requestUpdate();
                            }}>
                            ✕
                          </button>
                        ` : ''}
                      </div>

                      <div style="display: flex; align-items: center; gap: 8px;">
                        <input
                          id="custom-palette-color-${index}"
                          type="color"
                          style="width: 36px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;"
                          .value=${color || '#00aaff'}
                          @input=${(e: Event) => {
                            const newColors = [...host.customThemeColors];
                            newColors[index] = (e.target as HTMLInputElement).value;
                            host.customThemeColors = newColors;
                            host.requestUpdate();
                          }} />
                        <span style="font-family: monospace; font-size: 0.78rem; color: #fff; font-weight: 600;">${color.toUpperCase()}</span>
                      </div>
                    </div>
                  `)}
                </div>

                <!-- Palette Quick Presets -->
                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                  <span style="font-size: 0.72rem; color: var(--text-secondary, #94a3b8); font-weight: 600; margin-right: 4px;">Quick Presets:</span>
                  
                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(0, 229, 255, 0.12); border: 1px solid rgba(0, 229, 255, 0.35); color: #00e5ff; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#00e5ff'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    1-Color Solid Cyan
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#ef4444'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    1-Color Solid Crimson
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#10b981'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    1-Color Matrix Emerald
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#00aaff', '#ff00aa'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    2-Color Cyber Duo
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#f59e0b', '#ec4899', '#8b5cf6'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    3-Color Sunset Triad
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); color: #60a5fa; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    4-Color Aurora Quad
                  </button>

                  <button
                    type="button"
                    class="preset-chip"
                    style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(236, 72, 153, 0.12); border: 1px solid rgba(236, 72, 153, 0.35); color: #f472b6; cursor: pointer; font-weight: 600;"
                    @click=${() => {
                      host.customThemeColors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899'];
                      soundFX.playClick();
                      host.requestUpdate();
                    }}>
                    6-Color Prism Spectrum
                  </button>
                </div>
              </div>
            `}
          </div>
        ` : ''}

        <div class="form-field" style="margin-top: 8px;">
          <label for="theme-transition-slider">
            Theme Transition Speed
            <span class="slider-val-badge">${(host.themeTransitionSpeed || 0.5).toFixed(1)}s</span>
          </label>
          <div class="slider-container">
            <input
              id="theme-transition-slider"
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              .value=${String(host.themeTransitionSpeed || 0.5)}
              @input=${(e: Event) => {
                host.themeTransitionSpeed = parseFloat((e.target as HTMLInputElement).value);
                host.requestUpdate();
              }} />
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Section 2: 3D Visualizer Geometry & Particles -->
    ${filter === 'ALL' || filter === 'GEOMETRY' ? html`
      <div class="form-section" id="geometry-particles-section">
        <div class="form-section-header">
          <h4 class="form-section-title">
            <span class="section-icon">🪐</span> 3D Geometry & Particle Field Engine
          </h4>
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">WebGL 3D Mesh</span>
        </div>

        <!-- Geometry Mode Selector -->
        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">📐</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">Geometry Source Mode</span>
            </div>
            <div style="display: flex; background: rgba(0, 0, 0, 0.4); padding: 3px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <button
                type="button"
                id="geo-source-builtin-btn"
                style="padding: 4px 12px; font-size: 0.76rem; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${host.geometrySource === 'builtin' ? 'background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5);' : 'background: transparent; color: #94a3b8;'}"
                @click=${() => {
                  host.geometrySource = 'builtin';
                  soundFX.playToggle();
                  host.requestUpdate();
                }}>
                Built-in Shapes
              </button>
              <button
                type="button"
                id="geo-source-custom-btn"
                style="padding: 4px 12px; font-size: 0.76rem; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${host.geometrySource === 'custom' ? 'background: rgba(168, 85, 247, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.5);' : 'background: transparent; color: #94a3b8;'}"
                @click=${() => {
                  host.geometrySource = 'custom';
                  soundFX.playToggle();
                  host.requestUpdate();
                }}>
                Custom 3D Model
              </button>
            </div>
          </div>

          ${host.geometrySource === 'custom' ? html`
            <div style="background: rgba(168, 85, 247, 0.05); border: 1px dashed rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.8rem; font-weight: 600; color: #e9d5ff;">Import Custom 3D Model (.glb, .gltf, .obj)</span>
                ${host.customModelUrl ? html`
                  <button
                    type="button"
                    id="reset-custom-model-btn"
                    style="padding: 2px 8px; font-size: 0.72rem; color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 4px; cursor: pointer;"
                    @click=${() => {
                      host.resetCustomModel();
                      soundFX.playToggle();
                    }}>
                    Remove Model
                  </button>
                ` : ''}
              </div>
              <span class="setting-desc" style="font-size: 0.74rem; margin-bottom: 10px; display: block;">
                "Bring your geometry into LUMIN — LUMIN makes it look like LUMIN." Geometry is extracted and automatically illuminated with LUMIN's reactive shaders, themes, and glow.
              </span>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <label
                    for="custom-model-file-input"
                    id="custom-model-upload-label"
                    style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 6px; color: #fff; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    <span>📁 Choose 3D File</span>
                    <input
                      id="custom-model-file-input"
                      type="file"
                      accept=".glb,.gltf,.obj"
                      style="display: none;"
                      @change=${(e: Event) => {
                        const input = e.target as HTMLInputElement;
                        if (input.files && input.files[0]) {
                          host.handleCustomModelUpload(input.files[0]);
                        }
                      }} />
                  </label>
                  <span style="font-size: 0.75rem; color: #cbd5e1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">
                    ${host.customModelName || 'No custom model selected'}
                  </span>
                </div>

                ${host.customModelStatus ? html`
                  <div style="font-size: 0.75rem; color: #4ade80; background: rgba(74, 222, 128, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(74, 222, 128, 0.2);">
                    ✓ ${host.customModelStatus}
                  </div>
                ` : ''}

                ${host.customModelError ? html`
                  <div style="font-size: 0.75rem; color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(248, 113, 113, 0.2);">
                    ⚠️ ${host.customModelError}
                  </div>
                ` : ''}

                <!-- Transform Controls for Custom Model -->
                <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px; margin-top: 4px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: #c084fc;">Model Transform Offsets</span>
                    <button
                      type="button"
                      id="reset-model-transforms-btn"
                      style="padding: 2px 8px; font-size: 0.7rem; color: #94a3b8; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer;"
                      @click=${() => {
                        host.resetCustomModelTransforms();
                        soundFX.playToggle();
                      }}>
                      Reset Transforms
                    </button>
                  </div>

                  <div class="form-field" style="margin-bottom: 8px;">
                    <label for="custom-model-scale-slider" style="font-size: 0.75rem;">
                      Scale Factor
                      <span class="slider-val-badge">${(host.customModelScale || 1.0).toFixed(2)}x</span>
                    </label>
                    <div class="slider-container">
                      <input
                        id="custom-model-scale-slider"
                        type="range"
                        min="0.1"
                        max="4.0"
                        step="0.05"
                        .value=${String(host.customModelScale || 1.0)}
                        @input=${(e: Event) => {
                          host.customModelScale = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div>
                      <label for="custom-model-pos-x" style="font-size: 0.72rem; color: #94a3b8;">Pos X: ${(host.customModelPosX || 0).toFixed(2)}</label>
                      <input
                        id="custom-model-pos-x"
                        type="range"
                        min="-3.0"
                        max="3.0"
                        step="0.05"
                        .value=${String(host.customModelPosX || 0)}
                        @input=${(e: Event) => {
                          host.customModelPosX = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                    <div>
                      <label for="custom-model-pos-y" style="font-size: 0.72rem; color: #94a3b8;">Pos Y: ${(host.customModelPosY || 0).toFixed(2)}</label>
                      <input
                        id="custom-model-pos-y"
                        type="range"
                        min="-3.0"
                        max="3.0"
                        step="0.05"
                        .value=${String(host.customModelPosY || 0)}
                        @input=${(e: Event) => {
                          host.customModelPosY = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                    <div>
                      <label for="custom-model-pos-z" style="font-size: 0.72rem; color: #94a3b8;">Pos Z: ${(host.customModelPosZ || 0).toFixed(2)}</label>
                      <input
                        id="custom-model-pos-z"
                        type="range"
                        min="-3.0"
                        max="3.0"
                        step="0.05"
                        .value=${String(host.customModelPosZ || 0)}
                        @input=${(e: Event) => {
                          host.customModelPosZ = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <div>
                      <label for="custom-model-rot-x" style="font-size: 0.72rem; color: #94a3b8;">Rot X: ${Math.round(host.customModelRotX || 0)}°</label>
                      <input
                        id="custom-model-rot-x"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        .value=${String(host.customModelRotX || 0)}
                        @input=${(e: Event) => {
                          host.customModelRotX = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                    <div>
                      <label for="custom-model-rot-y" style="font-size: 0.72rem; color: #94a3b8;">Rot Y: ${Math.round(host.customModelRotY || 0)}°</label>
                      <input
                        id="custom-model-rot-y"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        .value=${String(host.customModelRotY || 0)}
                        @input=${(e: Event) => {
                          host.customModelRotY = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                    <div>
                      <label for="custom-model-rot-z" style="font-size: 0.72rem; color: #94a3b8;">Rot Z: ${Math.round(host.customModelRotZ || 0)}°</label>
                      <input
                        id="custom-model-rot-z"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        .value=${String(host.customModelRotZ || 0)}
                        @input=${(e: Event) => {
                          host.customModelRotZ = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} style="width: 100%;" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="form-grid-2">
          ${host.geometrySource === 'builtin' ? html`
            <div class="form-field">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <label for="vis-shape-select">Main Visualizer Mesh Geometry</label>
              </div>
              <span class="setting-desc">
                3D polygon mesh centered in the audio stage.
              </span>
              <select
                id="vis-shape-select"
                .value=${host.visualizerShape}
                @change=${(e: Event) => {
                  host.visualizerShape = (e.target as HTMLSelectElement).value;
                  host.requestUpdate();
                }}>
                <option value="sphere">Sphere (Icosahedral Geodesic Mesh)</option>
                <option value="cube">Cube (Chamfered Hyper-Cube)</option>
                <option value="torus">Torus (Cosmic Vortex Ring)</option>
                <option value="cylinder">Cylinder (Audio Beacon Pillar)</option>
                <option value="pyramid">Pyramid (Prismatic Quad Core)</option>
                <option value="torusKnot">Torus Knot (Parametric Nexus Loop)</option>
              </select>
            </div>
          ` : html`
            <div class="form-field" style="opacity: 0.6;">
              <label>Active Geometry</label>
              <span class="setting-desc">Using imported custom 3D model geometry.</span>
              <div style="padding: 8px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.8rem; color: #c084fc; font-family: monospace;">
                ${host.customModelName || 'Custom Model'}
              </div>
            </div>
          `}

          <div class="form-field">
            <label for="particle-shape-select">Particle Cloud Formation</label>
            <span class="setting-desc">Outer particle field mathematical manifold.</span>
            <select
              id="particle-shape-select"
              .value=${host.particleShape}
              @change=${(e: Event) => {
                host.particleShape = (e.target as HTMLSelectElement).value;
                host.requestUpdate();
              }}>
              <option value="saturn">Saturn (Astrodynamic Accretion Belt)</option>
              <option value="sphere">Sphere (Dual Concentric Orbital Shells)</option>
              <option value="cube">Cube (3D Voxel Lattice Matrix)</option>
              <option value="cylinder">Cylinder (Vertical Harmonic Sound Column)</option>
              <option value="torus">Torus (Ring Manifold)</option>
              <option value="trefoil">Trefoil Knot</option>
              <option value="lissajous">Lissajous</option>
              <option value="flowerOfLife">Flower of Life</option>
              <option value="vesicaPiscis">Vesica Piscis</option>
              <option value="triangle">Triangle (Triangular Orbital Circuit)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2" style="margin-top: 4px;">
          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="show-main-vis-toggle">Show Main Center Visualizer</label>
              <span class="setting-desc">Render central 3D audio-reactive geometric mesh.</span>
            </div>
            <input
              id="show-main-vis-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.showMainVisualizer}
              @change=${(e: Event) => {
                host.showMainVisualizer = (e.target as HTMLInputElement).checked;
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>

          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="show-particles-toggle">Show Ambient Particle Field</label>
              <span class="setting-desc">Render orbital particle cloud responding to audio dynamics.</span>
            </div>
            <input
              id="show-particles-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.showParticles}
              @change=${(e: Event) => {
                host.showParticles = (e.target as HTMLInputElement).checked;
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>
        </div>

        <div class="form-grid-2" style="margin-top: 6px;">
          <div class="form-field">
            <label for="vis-size-slider">
              Visualizer Scale
              <span class="slider-val-badge">${(host.visualizerSize || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="vis-size-slider"
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                .value=${String(host.visualizerSize || 1.0)}
                @input=${(e: Event) => {
                  host.visualizerSize = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="particle-formation-scale-slider">
              Particle Formation Scale
              <span class="slider-val-badge">${(host.particleFormationScale || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="particle-formation-scale-slider"
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                .value=${String(host.particleFormationScale || 1.0)}
                @input=${(e: Event) => {
                  host.particleFormationScale = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="vis-speed-slider">
              Visualizer Reaction Speed
              <span class="slider-val-badge">${(host.visualizerSpeed || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="vis-speed-slider"
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                .value=${String(host.visualizerSpeed || 1.0)}
                @input=${(e: Event) => {
                  host.visualizerSpeed = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="particle-size-slider">
              Particle Point Size
              <span class="slider-val-badge">${(host.particleSize || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="particle-size-slider"
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                .value=${String(host.particleSize || 1.0)}
                @input=${(e: Event) => {
                  host.particleSize = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="particle-speed-slider">
              Particle Orbit Speed
              <span class="slider-val-badge">${(host.particleSpeed || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="particle-speed-slider"
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                .value=${String(host.particleSpeed || 1.0)}
                @input=${(e: Event) => {
                  host.particleSpeed = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field" style="grid-column: 1 / -1;">
            <label for="global-scale-slider">
              Global 3D Canvas Zoom Scale
              <span class="slider-val-badge">${(host.globalScale || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="global-scale-slider"
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                .value=${String(host.globalScale || 1.0)}
                @input=${(e: Event) => {
                  host.globalScale = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Section 3: Glow & Shaders -->
    ${filter === 'ALL' || filter === 'POST_PROCESSING' ? html`
      <div class="form-section" id="glow-shaders-section">
        <div class="form-section-header">
          <h4 class="form-section-title">
            <span class="section-icon">💫</span> WebGL Glow Shaders & Post-Processing
          </h4>
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Bloom & Cinematic FX</span>
        </div>

        <div class="form-grid-2">
          <div class="form-field">
            <label for="bloom-intensity-slider">
              Bloom Glow Intensity
              <span class="slider-val-badge">${(host.bloomIntensity || 1.5).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="bloom-intensity-slider"
                type="range"
                min="0.0"
                max="4.0"
                step="0.05"
                .value=${String(host.bloomIntensity || 1.5)}
                @input=${(e: Event) => {
                  host.bloomIntensity = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="bloom-radius-slider">
              Bloom Blur Radius
              <span class="slider-val-badge">${(host.bloomRadius || 0.4).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="bloom-radius-slider"
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                .value=${String(host.bloomRadius || 0.4)}
                @input=${(e: Event) => {
                  host.bloomRadius = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="bloom-threshold-slider">
              Bloom Cutoff Threshold
              <span class="slider-val-badge">${(host.bloomThreshold || 0.85).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="bloom-threshold-slider"
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                .value=${String(host.bloomThreshold || 0.85)}
                @input=${(e: Event) => {
                  host.bloomThreshold = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="glow-pulse-slider">
              Audio Pulse Reactivity
              <span class="slider-val-badge">${(host.glowPulseStrength || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="glow-pulse-slider"
                type="range"
                min="0.0"
                max="3.0"
                step="0.1"
                .value=${String(host.glowPulseStrength || 1.0)}
                @input=${(e: Event) => {
                  host.glowPulseStrength = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 12px;">
          <!-- Morphing -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="morphing-toggle" style="font-weight: 700;">Audio Shape Morphing</label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Dynamic vertex distortion reacting to sound</span>
              </div>
              <input
                id="morphing-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.morphingEnabled}
                @change=${(e: Event) => {
                  host.morphingEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.morphingEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="morph-intensity-slider">
                  Morph Intensity
                  <span class="slider-val-badge">${(host.morphingIntensity || 0.5).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="morph-intensity-slider"
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    .value=${String(host.morphingIntensity || 0.5)}
                    @input=${(e: Event) => {
                      host.morphingIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Liquid Mercury Metal Morph -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="mercury-metal-toggle" style="font-weight: 700;">Liquid Mercury Metal</label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Reflective liquid-metal morphing with fluid surface dynamics</span>
              </div>
              <input
                id="mercury-metal-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.mercuryMetalEnabled}
                @change=${(e: Event) => {
                  host.mercuryMetalEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.mercuryMetalEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="mercury-fluidity-slider">
                  Fluidity & Morph Dynamics
                  <span class="slider-val-badge">${(host.mercuryFluidity || 1.0).toFixed(2)}x</span>
                </label>
                <div class="slider-container">
                  <input
                    id="mercury-fluidity-slider"
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    .value=${String(host.mercuryFluidity || 1.0)}
                    @input=${(e: Event) => {
                      host.mercuryFluidity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
              <div class="form-field" style="margin-top: 10px;">
                <label for="mercury-sheen-slider">
                  Metallic Specular Sheen
                  <span class="slider-val-badge">${(host.mercurySheen || 1.5).toFixed(2)}x</span>
                </label>
                <div class="slider-container">
                  <input
                    id="mercury-sheen-slider"
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    .value=${String(host.mercurySheen || 1.5)}
                    @input=${(e: Event) => {
                      host.mercurySheen = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Motion Blur / Afterimage -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="afterimage-toggle" style="font-weight: 700;">Motion Blur / Afterimage</label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Optical persistent phosphor glow trail</span>
              </div>
              <input
                id="afterimage-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.afterimageEnabled}
                @change=${(e: Event) => {
                  host.afterimageEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.afterimageEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="afterimage-strength-slider">
                  Trail Persistence
                  <span class="slider-val-badge">${(host.afterimageStrength || 0.85).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="afterimage-strength-slider"
                    type="range"
                    min="0.5"
                    max="0.98"
                    step="0.01"
                    .value=${String(host.afterimageStrength || 0.85)}
                    @input=${(e: Event) => {
                      host.afterimageStrength = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Chromatic Aberration -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="chroma-toggle" style="font-weight: 700;">Chromatic Aberration</label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Lens prism RGB color shift</span>
              </div>
              <input
                id="chroma-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.chromaticAberrationEnabled}
                @change=${(e: Event) => {
                  host.chromaticAberrationEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.chromaticAberrationEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="chroma-intensity-slider">
                  Prism Fringe Intensity
                  <span class="slider-val-badge">${(host.chromaticAberrationIntensity || 0.005).toFixed(4)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="chroma-intensity-slider"
                    type="range"
                    min="0.001"
                    max="0.03"
                    step="0.001"
                    .value=${String(host.chromaticAberrationIntensity || 0.005)}
                    @input=${(e: Event) => {
                      host.chromaticAberrationIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Film Grain -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="grain-toggle" style="font-weight: 700;">Cinematic Film Grain</label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Analog noise grain overlay</span>
              </div>
              <input
                id="grain-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.filmGrainEnabled}
                @change=${(e: Event) => {
                  host.filmGrainEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.filmGrainEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="grain-noise-slider">
                  Grain Noise
                  <span class="slider-val-badge">${(host.filmGrainIntensity || 0.15).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="grain-noise-slider"
                    type="range"
                    min="0.02"
                    max="0.5"
                    step="0.02"
                    .value=${String(host.filmGrainIntensity || 0.15)}
                    @input=${(e: Event) => {
                      host.filmGrainIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- CRT Raster Scanlines -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="scanlines-toggle" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
                  <span>CRT Raster Scanlines</span>
                </label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Cathode-ray tube horizontal phosphor raster scanlines</span>
              </div>
              <input
                id="scanlines-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.scanlinesEnabled}
                @change=${(e: Event) => {
                  host.scanlinesEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.scanlinesEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="scanlines-intensity-slider">
                  Scanline Opacity
                  <span class="slider-val-badge">${(host.scanlinesIntensity || 0.35).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="scanlines-intensity-slider"
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    .value=${String(host.scanlinesIntensity || 0.35)}
                    @input=${(e: Event) => {
                      host.scanlinesIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
              <div class="form-field" style="margin-top: 10px;">
                <label for="scanlines-density-slider">
                  Line Frequency Density
                  <span class="slider-val-badge">${Math.round(host.scanlinesDensity || 600)} lines</span>
                </label>
                <div class="slider-container">
                  <input
                    id="scanlines-density-slider"
                    type="range"
                    min="200"
                    max="1200"
                    step="50"
                    .value=${String(host.scanlinesDensity || 600)}
                    @input=${(e: Event) => {
                      host.scanlinesDensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Optic Lens Vignette & Depth -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="vignette-toggle" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
                  <span>Optic Lens Vignette</span>
                </label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Anamorphic peripheral lens falloff darkening for focal depth</span>
              </div>
              <input
                id="vignette-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.vignetteEnabled}
                @change=${(e: Event) => {
                  host.vignetteEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.vignetteEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="vignette-darkness-slider">
                  Vignette Darkness
                  <span class="slider-val-badge">${(host.vignetteDarkness || 1.4).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="vignette-darkness-slider"
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    .value=${String(host.vignetteDarkness || 1.4)}
                    @input=${(e: Event) => {
                      host.vignetteDarkness = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
              <div class="form-field" style="margin-top: 10px;">
                <label for="vignette-offset-slider">
                  Falloff Radius
                  <span class="slider-val-badge">${(host.vignetteOffset || 1.1).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="vignette-offset-slider"
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    .value=${String(host.vignetteOffset || 1.1)}
                    @input=${(e: Event) => {
                      host.vignetteOffset = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Audio Cybernetic Glitch -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="glitch-toggle" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
                  <span>Cybernetic Audio Glitch</span>
                </label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Audio-driven block displacement and digital glitch artifacts</span>
              </div>
              <input
                id="glitch-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.glitchEnabled}
                @change=${(e: Event) => {
                  host.glitchEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.glitchEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="glitch-intensity-slider">
                  Glitch Amplitude
                  <span class="slider-val-badge">${(host.glitchIntensity || 0.35).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="glitch-intensity-slider"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    .value=${String(host.glitchIntensity || 0.35)}
                    @input=${(e: Event) => {
                      host.glitchIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Anamorphic Lens Flare & Bloom -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="flare-toggle" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
                  <span>Anamorphic Streak Flare</span>
                </label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Horizontal Hollywood sci-fi anamorphic optical light streak</span>
              </div>
              <input
                id="flare-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.anamorphicFlareEnabled}
                @change=${(e: Event) => {
                  host.anamorphicFlareEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.anamorphicFlareEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="flare-intensity-slider">
                  Streak Flare Intensity
                  <span class="slider-val-badge">${(host.flareIntensity || 0.8).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="flare-intensity-slider"
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.05"
                    .value=${String(host.flareIntensity || 0.8)}
                    @input=${(e: Event) => {
                      host.flareIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
              <div class="form-field" style="margin-top: 10px;">
                <label for="flare-threshold-slider">
                  Luminance Trigger Threshold
                  <span class="slider-val-badge">${(host.flareThreshold || 0.75).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="flare-threshold-slider"
                    type="range"
                    min="0.3"
                    max="0.95"
                    step="0.02"
                    .value=${String(host.flareThreshold || 0.75)}
                    @input=${(e: Event) => {
                      host.flareThreshold = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Color Grading Matrix & LUT -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 16px; border-radius: 12px;">
            <div class="form-field-toggle" style="padding: 0; background: transparent; border: none; min-height: auto;">
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
                <label for="color-grading-toggle" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
                  <span>Color Grading Matrix</span>
                </label>
                <span class="setting-desc" style="font-size: 0.75rem; margin-bottom: 0;">Studio film tone mapping, LUT curves, and spectral grade</span>
              </div>
              <input
                id="color-grading-toggle"
                type="checkbox"
                role="switch"
                .checked=${host.colorGradingEnabled}
                @change=${(e: Event) => {
                  host.colorGradingEnabled = (e.target as HTMLInputElement).checked;
                  soundFX.playToggle();
                  host.requestUpdate();
                }} />
            </div>
            ${host.colorGradingEnabled ? html`
              <div class="form-field" style="margin-top: 12px;">
                <label for="color-grading-mode-select">Grading LUT Profile</label>
                <select
                  id="color-grading-mode-select"
                  .value=${host.colorGradingMode || 'cyberpunk'}
                  @change=${(e: Event) => {
                    host.colorGradingMode = (e.target as HTMLSelectElement).value;
                    host.requestUpdate();
                  }}>
                  <option value="cyberpunk">Cyberpunk Neon (Teal & Orange Grade)</option>
                  <option value="matrix">Matrix Emerald (Digital Green Phosphor)</option>
                  <option value="solar">Solar Infrared (Amber & Hyper-Gold)</option>
                  <option value="noir">Cinema Noir (High-Contrast Monochromatic)</option>
                  <option value="thermal">Thermal Spectrum (FLIR Heat Map)</option>
                </select>
              </div>
              <div class="form-field" style="margin-top: 10px;">
                <label for="color-grading-intensity-slider">
                  LUT Blend Strength
                  <span class="slider-val-badge">${(host.colorGradingIntensity || 0.85).toFixed(2)}</span>
                </label>
                <div class="slider-container">
                  <input
                    id="color-grading-intensity-slider"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    .value=${String(host.colorGradingIntensity || 0.85)}
                    @input=${(e: Event) => {
                      host.colorGradingIntensity = parseFloat((e.target as HTMLInputElement).value);
                      host.requestUpdate();
                    }} />
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Section 4: Camera & Lighting -->
    ${filter === 'ALL' || filter === 'CAMERA' ? html`
      <div class="form-section" id="camera-lighting-section">
        <div class="form-section-header">
          <h4 class="form-section-title">
            <span class="section-icon">🎥</span> Camera Orbit & Material Lighting
          </h4>
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Stage Viewport</span>
        </div>

        <div class="form-grid-2">
          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="rot-lock-toggle">Lock 3D Auto-Rotation</label>
              <span class="setting-desc">Pause stage spin to lock the camera angle.</span>
            </div>
            <input
              id="rot-lock-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.rotationLocked}
              @change=${(e: Event) => {
                host.rotationLocked = (e.target as HTMLInputElement).checked;
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>

          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="autopan-toggle">Cinematic Camera Auto-Pan</label>
              <span class="setting-desc">Gentle drifting camera rotation across axes.</span>
            </div>
            <input
              id="autopan-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.autoPanEnabled}
              @change=${(e: Event) => {
                host.autoPanEnabled = (e.target as HTMLInputElement).checked;
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>
        </div>

        <!-- 3D Lighting Colors -->
        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px; margin-top: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">💡</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">Camera & Stage Lighting Color Tint</span>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-field">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <label for="dir-light-color" style="font-weight: 600;">Directional Key Light Color</label>
                <span style="font-family: monospace; font-size: 0.75rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 1px 6px; border-radius: 4px;">${host.lightColor || '#ffffff'}</span>
              </div>
              <span class="setting-desc" style="font-size: 0.72rem; margin-bottom: 8px;">Color of the primary orbital spotlight hitting mesh highlights.</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input
                  id="dir-light-color"
                  type="color"
                  style="width: 46px; height: 34px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;"
                  .value=${host.lightColor || '#ffffff'}
                  @input=${(e: Event) => {
                    host.lightColor = (e.target as HTMLInputElement).value;
                    host.requestUpdate();
                  }} />
                <input
                  type="text"
                  style="flex: 1; height: 34px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; padding: 0 10px; font-family: monospace; font-size: 0.82rem;"
                  .value=${host.lightColor || '#ffffff'}
                  @change=${(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                      host.lightColor = val;
                      host.requestUpdate();
                    }
                  }} />
              </div>
            </div>

            <div class="form-field">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <label for="ambient-light-color" style="font-weight: 600;">Ambient Fill Light Color</label>
                <span style="font-family: monospace; font-size: 0.75rem; color: #a78bfa; background: rgba(167, 139, 250, 0.1); padding: 1px 6px; border-radius: 4px;">${host.ambientLightColor || '#ffffff'}</span>
              </div>
              <span class="setting-desc" style="font-size: 0.72rem; margin-bottom: 8px;">Base environmental omnidirectional ambient fill illumination.</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input
                  id="ambient-light-color"
                  type="color"
                  style="width: 46px; height: 34px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;"
                  .value=${host.ambientLightColor || '#ffffff'}
                  @input=${(e: Event) => {
                    host.ambientLightColor = (e.target as HTMLInputElement).value;
                    host.requestUpdate();
                  }} />
                <input
                  type="text"
                  style="flex: 1; height: 34px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; padding: 0 10px; font-family: monospace; font-size: 0.82rem;"
                  .value=${host.ambientLightColor || '#ffffff'}
                  @change=${(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                      host.ambientLightColor = val;
                      host.requestUpdate();
                    }
                  }} />
              </div>
            </div>
          </div>

          <!-- Quick Lighting Presets -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
            <span style="font-size: 0.72rem; color: var(--text-secondary, #94a3b8); font-weight: 600; margin-right: 4px;">Lighting Presets:</span>
            
            <button
              type="button"
              class="preset-chip"
              style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; cursor: pointer; font-weight: 600;"
              @click=${() => {
                host.lightColor = '#ffffff';
                host.ambientLightColor = '#ffffff';
                soundFX.playClick();
                host.requestUpdate();
              }}>
              Neutral Studio
            </button>

            <button
              type="button"
              class="preset-chip"
              style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(0, 229, 255, 0.12); border: 1px solid rgba(0, 229, 255, 0.35); color: #00e5ff; cursor: pointer; font-weight: 600;"
              @click=${() => {
                host.lightColor = '#00e5ff';
                host.ambientLightColor = '#003366';
                soundFX.playClick();
                host.requestUpdate();
              }}>
              Cyber Neon
            </button>

            <button
              type="button"
              class="preset-chip"
              style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; cursor: pointer; font-weight: 600;"
              @click=${() => {
                host.lightColor = '#ffbb44';
                host.ambientLightColor = '#4a2500';
                soundFX.playClick();
                host.requestUpdate();
              }}>
              Golden Sunset
            </button>

            <button
              type="button"
              class="preset-chip"
              style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc; cursor: pointer; font-weight: 600;"
              @click=${() => {
                host.lightColor = '#e066ff';
                host.ambientLightColor = '#240046';
                soundFX.playClick();
                host.requestUpdate();
              }}>
              Arcane Violet
            </button>

            <button
              type="button"
              class="preset-chip"
              style="padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; cursor: pointer; font-weight: 600;"
              @click=${() => {
                host.lightColor = '#ff3344';
                host.ambientLightColor = '#3b0008';
                soundFX.playClick();
                host.requestUpdate();
              }}>
              Crimson Core
            </button>
          </div>
        </div>

        <div class="form-grid-2" style="margin-top: 8px;">
          <div class="form-field">
            <label for="rot-speed-slider">
              Rotation Speed
              <span class="slider-val-badge">${(host.rotationSpeed || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="rot-speed-slider"
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                .value=${String(host.rotationSpeed || 1.0)}
                @input=${(e: Event) => {
                  host.rotationSpeed = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="autopan-speed-slider">
              Auto-Pan Drift Speed
              <span class="slider-val-badge">${(host.autoPanSpeed || 1.0).toFixed(2)}x</span>
            </label>
            <div class="slider-container">
              <input
                id="autopan-speed-slider"
                type="range"
                min="0.1"
                max="4.0"
                step="0.1"
                .value=${String(host.autoPanSpeed || 1.0)}
                @input=${(e: Event) => {
                  host.autoPanSpeed = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="metalness-slider">
              Surface Metalness
              <span class="slider-val-badge">${(host.metalness || 0.2).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="metalness-slider"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                .value=${String(host.metalness || 0.2)}
                @input=${(e: Event) => {
                  host.metalness = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="roughness-slider">
              Surface Roughness
              <span class="slider-val-badge">${(host.roughness || 0.3).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="roughness-slider"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                .value=${String(host.roughness || 0.3)}
                @input=${(e: Event) => {
                  host.roughness = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="dir-light-slider">
              Directional Key Light
              <span class="slider-val-badge">${(host.directionalLightIntensity || 1.5).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="dir-light-slider"
                type="range"
                min="0.0"
                max="4.0"
                step="0.1"
                .value=${String(host.directionalLightIntensity || 1.5)}
                @input=${(e: Event) => {
                  host.directionalLightIntensity = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field">
            <label for="ambient-light-slider">
              Ambient Fill Light
              <span class="slider-val-badge">${(host.ambientLightIntensity || 0.5).toFixed(2)}</span>
            </label>
            <div class="slider-container">
              <input
                id="ambient-light-slider"
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                .value=${String(host.ambientLightIntensity || 0.5)}
                @input=${(e: Event) => {
                  host.ambientLightIntensity = parseFloat((e.target as HTMLInputElement).value);
                  host.requestUpdate();
                }} />
            </div>
          </div>
        </div>

        <!-- Custom Environment Reflection Map (IBL) Panel -->
        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px; margin-top: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">🌆</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: #fff;">Environment Reflections & Image-Based Lighting (IBL)</span>
            </div>
            <div style="display: flex; background: rgba(0, 0, 0, 0.4); padding: 3px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <button
                type="button"
                id="env-source-default-btn"
                style="padding: 4px 12px; font-size: 0.76rem; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${host.envSource === 'default' ? 'background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5);' : 'background: transparent; color: #94a3b8;'}"
                @click=${() => {
                  host.envSource = 'default';
                  soundFX.playToggle();
                  host.requestUpdate();
                }}>
                Default Lighting
              </button>
              <button
                type="button"
                id="env-source-custom-btn"
                style="padding: 4px 12px; font-size: 0.76rem; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${host.envSource === 'custom' ? 'background: rgba(56, 189, 248, 0.25); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.5);' : 'background: transparent; color: #94a3b8;'}"
                @click=${() => {
                  host.envSource = 'custom';
                  soundFX.playToggle();
                  host.requestUpdate();
                }}>
                Custom Reflection Map
              </button>
            </div>
          </div>

          ${host.envSource === 'custom' ? html`
            <div style="background: rgba(56, 189, 248, 0.05); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 14px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.8rem; font-weight: 600; color: #bae6fd;">Custom Panoramic Reflection Source (PNG, JPEG, WebP, HDR)</span>
                ${host.envImageUrl ? html`
                  <button
                    type="button"
                    id="reset-custom-env-btn"
                    style="padding: 2px 8px; font-size: 0.72rem; color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 4px; cursor: pointer;"
                    @click=${() => {
                      host.resetCustomEnv();
                      soundFX.playToggle();
                    }}>
                    Reset Environment
                  </button>
                ` : ''}
              </div>
              <span class="setting-desc" style="font-size: 0.74rem; margin-bottom: 10px; display: block;">
                Upload a panoramic environment texture to reflect across metallic materials, glossy bevels, and liquid mercury surfaces.
              </span>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <label
                    for="custom-env-file-input"
                    id="custom-env-upload-label"
                    style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; color: #fff; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    <span>🖼️ Choose Image</span>
                    <input
                      id="custom-env-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,.hdr"
                      style="display: none;"
                      @change=${(e: Event) => {
                        const input = e.target as HTMLInputElement;
                        if (input.files && input.files[0]) {
                          host.handleCustomEnvUpload(input.files[0]);
                        }
                      }} />
                  </label>
                  <span style="font-size: 0.75rem; color: #cbd5e1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;">
                    ${host.envImageName || 'No environment image selected'}
                  </span>
                </div>

                ${host.envImageStatus ? html`
                  <div style="font-size: 0.75rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.2);">
                    ✓ ${host.envImageStatus}
                  </div>
                ` : ''}

                ${host.envImageError ? html`
                  <div style="font-size: 0.75rem; color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(248, 113, 113, 0.2);">
                    ⚠️ ${host.envImageError}
                  </div>
                ` : ''}

                <div class="form-grid-2" style="margin-top: 4px;">
                  <div class="form-field">
                    <label for="env-intensity-slider" style="font-size: 0.75rem;">
                      Environment Illumination Intensity
                      <span class="slider-val-badge">${(host.envIntensity || 1.0).toFixed(2)}</span>
                    </label>
                    <div class="slider-container">
                      <input
                        id="env-intensity-slider"
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.05"
                        .value=${String(host.envIntensity || 1.0)}
                        @input=${(e: Event) => {
                          host.envIntensity = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} />
                    </div>
                  </div>

                  <div class="form-field">
                    <label for="env-reflection-slider" style="font-size: 0.75rem;">
                      Material Reflection Strength
                      <span class="slider-val-badge">${(host.envReflectionStrength || 1.0).toFixed(2)}</span>
                    </label>
                    <div class="slider-container">
                      <input
                        id="env-reflection-slider"
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.05"
                        .value=${String(host.envReflectionStrength || 1.0)}
                        @input=${(e: Event) => {
                          host.envReflectionStrength = parseFloat((e.target as HTMLInputElement).value);
                          host.requestUpdate();
                        }} />
                    </div>
                  </div>
                </div>

                <div class="form-field" style="margin-top: 4px;">
                  <label for="env-rotation-slider" style="font-size: 0.75rem;">
                    Environment Map Rotation Y
                    <span class="slider-val-badge">${Math.round(host.envRotationY || 0)}°</span>
                  </label>
                  <div class="slider-container">
                    <input
                      id="env-rotation-slider"
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      .value=${String(host.envRotationY || 0)}
                      @input=${(e: Event) => {
                        host.envRotationY = parseFloat((e.target as HTMLInputElement).value);
                        host.requestUpdate();
                      }} />
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Section 5: Workspace & Typography -->
    ${filter === 'ALL' || filter === 'WORKSPACE' ? html`
      <div class="form-section" id="workspace-typography-section">
        <div class="form-section-header">
          <h4 class="form-section-title">
            <span class="section-icon">💻</span> Workspace Layout & Typography
          </h4>
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Layout Customization</span>
        </div>

        <div class="form-grid-2">
          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="enable-term-toggle">Show Terminal Workspace Pane</label>
              <span class="setting-desc">Live agent execution logs and interactive command shell.</span>
            </div>
            <input
              id="enable-term-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.isTerminalEnabled}
              @change=${(e: Event) => {
                host.toggleTerminal((e.target as HTMLInputElement).checked);
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>

          <div class="form-field">
            <label for="term-pos-select">Terminal Dock Position</label>
            <span class="setting-desc">Choose where the terminal pane anchors in the viewport.</span>
            <select
              id="term-pos-select"
              .value=${host.terminalPosition || 'bottom'}
              @change=${(e: Event) => {
                host.handleTerminalDockChange((e.target as HTMLSelectElement).value);
                host.requestUpdate();
              }}>
              <option value="right">Right Sidebar Dock</option>
              <option value="left">Left Sidebar Dock</option>
              <option value="bottom">Bottom Dock (Standard)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2" style="margin-top: 8px;">
          <div class="form-field">
            <label for="chat-font-size-slider">
              Chat Transcript Font Size
              <span class="slider-val-badge">${host.chatFontSize === 'smaller' ? 'Smaller (13px)' : host.chatFontSize === 'larger' ? 'Larger (18px)' : 'Default (15px)'}</span>
            </label>
            <div class="slider-container">
              <input
                id="chat-font-size-slider"
                type="range"
                min="0"
                max="2"
                step="1"
                .value=${host.chatFontSize === 'smaller' ? '0' : host.chatFontSize === 'larger' ? '2' : '1'}
                @input=${(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  host.chatFontSize = val === '0' ? 'smaller' : val === '2' ? 'larger' : 'default';
                  localStorage.setItem('project_lumin_chat_font_size', host.chatFontSize);
                  host.requestUpdate();
                }} />
            </div>
          </div>

          <div class="form-field-toggle">
            <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
              <label for="chat-bold-toggle">Bold Chat Typography</label>
              <span class="setting-desc">Higher weight for chat bubbles</span>
            </div>
            <input
              id="chat-bold-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.chatFontBold}
              @change=${(e: Event) => {
                host.chatFontBold = (e.target as HTMLInputElement).checked;
                localStorage.setItem('project_lumin_chat_font_bold', String(host.chatFontBold));
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>
        </div>
      </div>
    ` : ''}
      </div>
    </div>
  `;
}

