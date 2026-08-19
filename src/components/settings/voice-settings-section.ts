import { html, TemplateResult } from 'lit';
import { soundFX } from '../../sound-effects';

export function renderVoiceSettingsSection(host: any): TemplateResult {
  const audioInputDevices = (host.audioDevices || []).filter(
    (d: MediaDeviceInfo) => d.kind === 'audioinput'
  );

  const hasNamedDevices = audioInputDevices.some((d: MediaDeviceInfo) => !!d.label);
  const loopbackDevices = audioInputDevices.filter((d: MediaDeviceInfo) => {
    const label = (d.label || '').toLowerCase();
    return (
      label.includes('stereo mix') ||
      label.includes('what u hear') ||
      label.includes('cable') ||
      label.includes('loopback') ||
      label.includes('vb-audio') ||
      label.includes('blackhole') ||
      label.includes('soundflower') ||
      label.includes('virtual') ||
      label.includes('line in') ||
      label.includes('wave out')
    );
  });

  return html`
    <!-- Header Banner -->
    <div class="settings-tab-banner" id="voice-settings-banner">
      <div class="settings-tab-banner-info">
        <h3>
          <span class="section-icon">🎙️</span> Voice & Audio Architecture
        </h3>
        <p>
          Configure hardware audio capture, hands-free hotword recognition, neural TTS voice synthesis, and real-time DSP audio effects.
        </p>
      </div>
      <div class="settings-header-badge">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${host.isContinuousActive ? '#00e676' : 'var(--glow-color, #00aaff)'}; box-shadow: 0 0 8px ${host.isContinuousActive ? '#00e676' : 'var(--glow-color, #00aaff)'};"></span>
        ${host.isContinuousActive ? 'Voice Stream Live' : 'Push-to-Talk / Hotword Ready'}
      </div>
    </div>

    <!-- Section 1: Audio Input & Hardware Capture -->
    <div class="form-section" id="audio-hardware-section">
      <div class="form-section-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h4 class="form-section-title" style="margin: 0;">
          <span class="section-icon">🎧</span> Hardware Audio Capture & Device Routing
        </h4>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">
            ${audioInputDevices.length} input device(s) detected
          </span>
          <button
            type="button"
            class="config-btn"
            id="btn-refresh-audio-devices"
            @click=${() => host.requestMicrophonePermissionAndEnumerate(true)}
            title="Re-scan and refresh connected hardware audio devices"
            style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 0.75rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh Devices
          </button>
        </div>
      </div>

      <!-- Permission Guidance Notice (if no devices labeled or permission not yet active) -->
      ${(!hasNamedDevices || host.micPermissionState === 'denied' || audioInputDevices.length === 0) ? html`
        <div style="margin-bottom: 12px; padding: 12px 16px; background: rgba(255, 170, 0, 0.08); border: 1px solid rgba(255, 170, 0, 0.25); border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #ffb84d; font-weight: 600;">
            <span>⚠️</span>
            <span>
              ${host.micPermissionState === 'denied'
                ? 'Microphone permission is blocked or restricted in your browser.'
                : 'Microphone hardware permission needed to list and access connected devices.'}
            </span>
          </div>
          <p style="margin: 0; font-size: 0.76rem; color: var(--text-secondary, #cbd5e1); line-height: 1.45;">
            ${host.micPermissionState === 'denied'
              ? 'Please grant microphone access in your browser address bar (lock/camera icon) and click the button below to detect your hardware microphones.'
              : 'Web browsers protect privacy by hiding device names until microphone permission is granted once. Click below to request permission and populate your hardware list.'}
          </p>
          <button
            type="button"
            id="btn-request-microphone-permission"
            @click=${() => host.requestMicrophonePermissionAndEnumerate(true)}
            style="align-self: flex-start; margin-top: 2px; padding: 6px 14px; font-size: 0.78rem; font-weight: 600; background: var(--glow-color, #00aaff); color: #050b14; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            ${host.isRequestingMicPermission ? 'Detecting Audio Hardware...' : 'Request Microphone Access & Detect Devices'}
          </button>
        </div>
      ` : ''}

      <div class="form-grid">
        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="enable-mic-toggle">Microphone Capture Stream</label>
            <span class="setting-desc">Stream audio from your physical microphone for conversational AI voice commands, speech recognition, and reactive visualizer frequencies.</span>
          </div>
          <input
            id="enable-mic-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.enableMicrophone}
            @change=${(e: Event) => {
              host.enableMicrophone = (e.target as HTMLInputElement).checked;
              soundFX.playToggle();
              if (host.enableMicrophone) {
                host.requestMicrophonePermissionAndEnumerate(false);
              }
              host.requestUpdate();
            }} />
        </div>

        ${host.enableMicrophone ? html`
          <div class="form-field" style="margin: 0 0 4px 8px; padding: 14px 18px; background: rgba(0, 170, 255, 0.04); border-radius: 10px; border-left: 3px solid var(--glow-color, #00aaff); border-top: 1px solid rgba(255, 255, 255, 0.06); border-right: 1px solid rgba(255, 255, 255, 0.06); border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
            <label for="mic-device-select" style="margin-bottom: 2px;">Active Microphone Hardware</label>
            <span class="setting-desc">Select the preferred input hardware, headset mic, or USB condenser microphone.</span>
            <select
              id="mic-device-select"
              .value=${host.selectedMicAudioDeviceId}
              @change=${(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                host.selectedMicAudioDeviceId = val;
                localStorage.setItem('project_lumin_selected_mic_device', val);
                soundFX.playClick();
                // If microphone stream is actively running, restart it to switch hardware seamlessly
                if (host.mediaStream) {
                  host.initMicrophoneAndListeners();
                }
                host.requestUpdate();
              }}>
              <option value="" ?selected=${!host.selectedMicAudioDeviceId || host.selectedMicAudioDeviceId === 'default'}>System Default Microphone</option>
              ${audioInputDevices.map((d: MediaDeviceInfo, idx: number) => html`
                <option value=${d.deviceId} ?selected=${host.selectedMicAudioDeviceId === d.deviceId}>
                  ${d.label || `Microphone ${idx + 1} (${d.deviceId.slice(0, 8)}...)`}
                </option>
              `)}
            </select>
          </div>
        ` : ''}

        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="enable-desktop-audio-toggle">System & Desktop Audio Visualizer Loopback</label>
            <span class="setting-desc">Capture internal computer audio (music playback, YouTube, streaming audio) to power real-time 3D reactive animations without speaking.</span>
          </div>
          <input
            id="enable-desktop-audio-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.enableDesktopAudio}
            @change=${(e: Event) => {
              host.enableDesktopAudio = (e.target as HTMLInputElement).checked;
              soundFX.playToggle();
              if (host.enableDesktopAudio && host.selectedDesktopAudioDeviceId && host.selectedDesktopAudioDeviceId !== 'screen-share') {
                host.startDesktopDeviceAudio();
              } else if (!host.enableDesktopAudio) {
                host.stopDesktopDeviceAudio();
              }
              host.requestUpdate();
            }} />
        </div>

        ${host.enableDesktopAudio ? html`
          <div class="form-field" style="margin: 0 0 4px 8px; padding: 14px 18px; background: rgba(0, 170, 255, 0.04); border-radius: 10px; border-left: 3px solid var(--glow-color, #00aaff); border-top: 1px solid rgba(255, 255, 255, 0.06); border-right: 1px solid rgba(255, 255, 255, 0.06); border-bottom: 1px solid rgba(255, 255, 255, 0.06); display: flex; flex-direction: column; gap: 10px;">
            <div>
              <label for="desktop-audio-device-select" style="margin-bottom: 2px;">Audio Capture Method & Loopback Device</label>
              <span class="setting-desc">Browser security does not allow listening to arbitrary OS audio without an OS loopback device (Stereo Mix, VB-Cable, BlackHole) or via Tab/Screen audio sharing.</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
              <select
                id="desktop-audio-device-select"
                .value=${host.selectedDesktopAudioDeviceId}
                @change=${(e: Event) => {
                  const val = (e.target as HTMLSelectElement).value;
                  host.selectedDesktopAudioDeviceId = val;
                  localStorage.setItem('project_lumin_selected_desktop_device', val);
                  soundFX.playClick();
                  if (val && val !== 'screen-share') {
                    host.stopDesktopDeviceAudio();
                    host.startDesktopDeviceAudio();
                  } else {
                    host.stopDesktopDeviceAudio();
                  }
                  host.requestUpdate();
                }}>
                <option value="" ?selected=${!host.selectedDesktopAudioDeviceId}>Choose Loopback Device or Tab Share...</option>
                <option value="screen-share" ?selected=${host.selectedDesktopAudioDeviceId === 'screen-share'}>Option A: Tab / Screen Share Audio (Recommended)</option>
                ${loopbackDevices.length > 0 ? html`
                  <optgroup label="Detected OS Loopback Devices">
                    ${loopbackDevices.map((d: MediaDeviceInfo) => html`
                      <option value=${d.deviceId} ?selected=${host.selectedDesktopAudioDeviceId === d.deviceId}>
                        ${d.label || `Loopback Device (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    `)}
                  </optgroup>
                ` : ''}
                ${audioInputDevices.length > 0 ? html`
                  <optgroup label="All Audio Input Channels">
                    ${audioInputDevices.map((d: MediaDeviceInfo, idx: number) => html`
                      <option value=${d.deviceId} ?selected=${host.selectedDesktopAudioDeviceId === d.deviceId}>
                        ${d.label || `Input Channel ${idx + 1} (${d.deviceId.slice(0, 8)}...)`}
                      </option>
                    `)}
                  </optgroup>
                ` : ''}
              </select>

              <!-- Option A: Direct Tab / Screen Audio Share Button -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(0, 0, 0, 0.2); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <strong style="font-size: 0.8rem; color: var(--text-primary, #f1f5f9);">Tab / Screen Audio Capture</strong>
                  <span style="font-size: 0.74rem; color: var(--text-secondary, #94a3b8);">Share a browser tab (e.g. Spotify, YouTube) with "Also share tab audio" checked.</span>
                </div>
                ${host.isScreenSharingEnabled ? html`
                  <button
                    type="button"
                    id="btn-stop-screen-audio"
                    @click=${() => host.stopScreenShare()}
                    style="padding: 5px 12px; font-size: 0.76rem; font-weight: 600; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; cursor: pointer;">
                    ⏹️ Stop Capture
                  </button>
                ` : html`
                  <button
                    type="button"
                    id="btn-start-screen-audio"
                    @click=${() => host.startScreenShare()}
                    style="padding: 5px 12px; font-size: 0.76rem; font-weight: 600; background: rgba(0, 170, 255, 0.15); color: var(--glow-color, #00aaff); border: 1px solid rgba(0, 170, 255, 0.3); border-radius: 6px; cursor: pointer;">
                    🖥️ Share Tab Audio
                  </button>
                `}
              </div>

              ${loopbackDevices.length === 0 ? html`
                <div style="font-size: 0.74rem; color: var(--text-secondary, #94a3b8); line-height: 1.4; padding: 6px 8px; background: rgba(255, 255, 255, 0.02); border-radius: 6px;">
                  💡 <strong>Tip for Windows users:</strong> To capture all system sound directly without sharing a tab, enable <em>"Stereo Mix"</em> in Windows Sound Control Panel → Recording tab, then click Refresh Devices above.
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Section 2: Hands-Free Voice Activation & Wake Words -->
    <div class="form-section" id="voice-wake-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🗣️</span> Hands-Free Hotwords & Wake Activation
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Keyword Spotting</span>
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <label for="activate-word-input">Wake Phrase / Activation Keyword</label>
          <span class="setting-desc">Spoken phrase that instantly awakens LUMIN into hands-free listening mode (default: <code>"computer"</code>, customizable).</span>
          <input
            id="activate-word-input"
            type="text"
            placeholder="computer"
            .value=${host.activateWord || ''}
            @input=${(e: Event) => {
              host.activateWord = (e.target as HTMLInputElement).value;
            }}
            @change=${(e: Event) => {
              host.activateWord = (e.target as HTMLInputElement).value;
              localStorage.setItem('project_lumin_activate_word', host.activateWord);
              host.requestUpdate();
            }} />
        </div>

        <div class="form-field">
          <label for="sleep-word-input">Sleep & Standby Command Phrase</label>
          <span class="setting-desc">Spoken phrase to transition the voice listener into quiet standby (default: <code>"standby"</code>, customizable).</span>
          <input
            id="sleep-word-input"
            type="text"
            placeholder="standby"
            .value=${host.sleepCommandWord || ''}
            @input=${(e: Event) => {
              host.sleepCommandWord = (e.target as HTMLInputElement).value;
            }}
            @change=${(e: Event) => {
              host.sleepCommandWord = (e.target as HTMLInputElement).value;
              localStorage.setItem('project_lumin_sleep_word', host.sleepCommandWord);
              host.requestUpdate();
            }} />
        </div>
      </div>

      <div class="form-grid" style="margin-top: 4px;">
        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="auto-launch-wake-toggle">Auto-launch agent execution on wake word</label>
            <span class="setting-desc">When enabled, speaking the wake phrase automatically initiates the autonomous agent workspace. When disabled (default), wake word activates hands-free voice mode and 3D visualizer.</span>
          </div>
          <input
            id="auto-launch-wake-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.isAutoLaunchOnWakeWord}
            @change=${(e: Event) => host.handleAutoLaunchWakeToggle((e.target as HTMLInputElement).checked)} />
        </div>

        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="auto-stop-sleep-toggle">Auto-stop agent execution on sleep phrases</label>
            <span class="setting-desc">When enabled, saying sleep phrases (<code>"goodbye agent"</code>, <code>"end session"</code>, <code>"I'm done"</code>) halts active background sub-tasks.</span>
          </div>
          <input
            id="auto-stop-sleep-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.isAutoStopOnSleepWord}
            @change=${(e: Event) => host.handleAutoStopSleepToggle((e.target as HTMLInputElement).checked)} />
        </div>
      </div>
    </div>

    <!-- Section 3: Speech Synthesis (TTS) & Spoken Playback -->
    <div class="form-section" id="tts-settings-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🔊</span> Neural Speech Synthesis (TTS) & Voice Output
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">Audio Playback</span>
      </div>

      <div class="form-grid">
        <div class="form-field-toggle">
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <label for="auto-play-tts-toggle">Auto-Play Spoken Response Audio (Silent Agent Toggle)</label>
            <span class="setting-desc">
              When <strong>OFF (Silent Mode)</strong>, LUMIN responds cleanly in text so it will never speak over your working flow. You can tap the speaker icon on any message to listen on demand. When <strong>ON</strong>, LUMIN reads all responses aloud.
            </span>
          </div>
          <input
            id="auto-play-tts-toggle"
            type="checkbox"
            role="switch"
            .checked=${host.autoPlayTTS}
            @change=${(e: Event) => host.handleAutoPlayTTSToggle((e.target as HTMLInputElement).checked)} />
        </div>

        <div class="form-grid-2" style="margin-top: 4px;">
          <div class="form-field">
            <label for="tts-mode-select">Speech Output Verbosity Mode</label>
            <span class="setting-desc">Adjust spoken response verbosity during automated tool execution.</span>
            <select
              id="tts-mode-select"
              .value=${host.ttsMode}
              @change=${(e: Event) => {
                host.ttsMode = (e.target as HTMLSelectElement).value as any;
                localStorage.setItem('project_lumin_tts_mode', host.ttsMode);
                if (host.wsTerminal && host.wsTerminal.readyState === WebSocket.OPEN) {
                  host.wsTerminal.send(JSON.stringify({
                    type: 'input',
                    data: `tts mode ${host.ttsMode}`
                  }));
                }
                host.requestUpdate();
              }}>
              <option value="full">Full Spoken Responses (Read entire output text)</option>
              <option value="short">Short Confirmations (e.g., "Note saved.", "Task completed.")</option>
              <option value="off">Mute TTS Output (Silent Mode)</option>
            </select>
          </div>

          <div class="form-field">
            <label for="piper-voice-select">Neural Voice Profile (Edge-TTS & Neural)</label>
            <span class="setting-desc">High-fidelity neural speech synthesis voice for AI audio responses.</span>
            <select
              id="piper-voice-select"
              .value=${host.piperVoice || 'en-US-JennyNeural'}
              @change=${(e: Event) => {
                const selected = (e.target as HTMLSelectElement).value;
                host.piperVoice = selected;
                localStorage.setItem('project_lumin_piper_voice', selected);
                soundFX.playClick();
                if (host.wsTerminal && host.wsTerminal.readyState === WebSocket.OPEN) {
                  try {
                    host.wsTerminal.send(JSON.stringify({
                      type: 'input',
                      data: `voice set ${selected}`
                    }));
                  } catch (err) {}
                }
                host.requestUpdate();
              }}>
              <optgroup label="🇺🇸 English (US) — Recommended">
                <option value="en-US-JennyNeural">Jenny (en-US) — Warm & Conversational (Default)</option>
                <option value="en-US-GuyNeural">Guy (en-US) — Clear, Natural & Energetic</option>
                <option value="en-US-AriaNeural">Aria (en-US) — Expressive & Professional</option>
                <option value="en-US-DavisNeural">Davis (en-US) — Calm, Confident & Deep</option>
                <option value="en-US-AmberNeural">Amber (en-US) — Bright & Cheerful</option>
                <option value="en-US-AnaNeural">Ana (en-US) — Soft, Gentle & Friendly</option>
                <option value="en-US-AndrewNeural">Andrew (en-US) — Warm & Dynamic</option>
                <option value="en-US-ChristopherNeural">Christopher (en-US) — Authoritative & Narrative</option>
                <option value="en-US-EricNeural">Eric (en-US) — Casual & Relaxed</option>
                <option value="en-US-MichelleNeural">Michelle (en-US) — Polished & Engaging</option>
                <option value="en-US-RogerNeural">Roger (en-US) — News & Narrative</option>
                <option value="en-US-SteffanNeural">Steffan (en-US) — Articulate & Precise</option>
              </optgroup>
              
              <optgroup label="🇬🇧 English (United Kingdom)">
                <option value="en-GB-SoniaNeural">Sonia (en-GB) — Warm & Refined British</option>
                <option value="en-GB-RyanNeural">Ryan (en-GB) — Clear & Casual British</option>
                <option value="en-GB-LibbyNeural">Libby (en-GB) — Crisp & Expressive British</option>
                <option value="en-GB-ThomasNeural">Thomas (en-GB) — Formal & Narrative British</option>
              </optgroup>

              <optgroup label="🇦🇺 🇨🇦 🇮🇪 🇮🇳 English (Global Accents)">
                <option value="en-AU-NatashaNeural">Natasha (en-AU) — Melodic & Friendly Australian</option>
                <option value="en-AU-WilliamNeural">William (en-AU) — Natural & Crisp Australian</option>
                <option value="en-CA-ClaraNeural">Clara (en-CA) — Smooth & Clear Canadian</option>
                <option value="en-CA-LiamNeural">Liam (en-CA) — Energetic Canadian</option>
                <option value="en-IE-EmilyNeural">Emily (en-IE) — Expressive Irish Accent</option>
                <option value="en-IN-NeerjaNeural">Neerja (en-IN) — Melodic Indian English</option>
                <option value="en-IN-PrabhatNeural">Prabhat (en-IN) — Professional Indian English</option>
              </optgroup>

              <optgroup label="🌍 Multilingual Neural Voices">
                <option value="es-ES-ElviraNeural">Elvira (es-ES) — Spanish (Spain)</option>
                <option value="es-MX-DaliaNeural">Dalia (es-MX) — Spanish (Mexico)</option>
                <option value="fr-FR-DeniseNeural">Denise (fr-FR) — French (France)</option>
                <option value="fr-FR-HenriNeural">Henri (fr-FR) — French (France)</option>
                <option value="de-DE-KatjaNeural">Katja (de-DE) — German (Germany)</option>
                <option value="de-DE-KillianNeural">Killian (de-DE) — German (Germany)</option>
                <option value="it-IT-ElsaNeural">Elsa (it-IT) — Italian (Italy)</option>
                <option value="ja-JP-NanamiNeural">Nanami (ja-JP) — Japanese (Japan)</option>
                <option value="zh-CN-XiaoxiaoNeural">Xiaoxiao (zh-CN) — Chinese (Mandarin)</option>
              </optgroup>

              <optgroup label="⚡ Piper Local Fast Checkpoints">
                <option value="en_US-lessac-medium">Piper Lessac (en_US) — Ultra-Fast Low Latency</option>
                <option value="en_US-amy-medium">Piper Amy (en_US) — Compact Fast Model</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 4: Real-time Audio DSP FX Engine -->
    <div class="form-section" id="audio-dsp-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">🎛️</span> Real-time Audio DSP Effects Engine
        </h4>
        <span style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); font-weight: 500;">WebAudio Spatial Bus</span>
      </div>

      <div class="form-field-toggle">
        <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
          <label for="master-fx-toggle">Master Audio Effects Processing</label>
          <span class="setting-desc">Route synthesizers, TTS speech, and visualizer audio monitors through a high-fidelity real-time WebAudio DSP FX bus.</span>
        </div>
        <input
          id="master-fx-toggle"
          type="checkbox"
          role="switch"
          .checked=${host.masterEffectsEnabled}
          @change=${(e: Event) => {
            host.masterEffectsEnabled = (e.target as HTMLInputElement).checked;
            host.updateAudioEffects();
            soundFX.playToggle();
            host.requestUpdate();
          }} />
      </div>

      ${host.masterEffectsEnabled ? html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 4px;">
          <div class="form-field-toggle" style="background: rgba(0, 170, 255, 0.04); border-color: rgba(0, 170, 255, 0.18);">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <label for="reverb-toggle" style="font-size: 0.85rem;">Spatial Reverb</label>
              <span class="setting-desc" style="font-size: 0.74rem; margin-bottom: 0;">Acoustic room reflection</span>
            </div>
            <input
              id="reverb-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.isReverbEnabled}
              @change=${(e: Event) => {
                host.isReverbEnabled = (e.target as HTMLInputElement).checked;
                host.updateAudioEffects();
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>

          <div class="form-field-toggle" style="background: rgba(0, 170, 255, 0.04); border-color: rgba(0, 170, 255, 0.18);">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <label for="delay-toggle" style="font-size: 0.85rem;">Stereo Echo / Delay</label>
              <span class="setting-desc" style="font-size: 0.74rem; margin-bottom: 0;">Rhythmic stereo ping-pong</span>
            </div>
            <input
              id="delay-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.isDelayEnabled}
              @change=${(e: Event) => {
                host.isDelayEnabled = (e.target as HTMLInputElement).checked;
                host.updateAudioEffects();
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>

          <div class="form-field-toggle" style="background: rgba(0, 170, 255, 0.04); border-color: rgba(0, 170, 255, 0.18);">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <label for="flanger-toggle" style="font-size: 0.85rem;">Flanger Chorus</label>
              <span class="setting-desc" style="font-size: 0.74rem; margin-bottom: 0;">Modulated harmonic sweep</span>
            </div>
            <input
              id="flanger-toggle"
              type="checkbox"
              role="switch"
              .checked=${host.isFlangerEnabled}
              @change=${(e: Event) => {
                host.isFlangerEnabled = (e.target as HTMLInputElement).checked;
                host.updateAudioEffects();
                soundFX.playToggle();
                host.requestUpdate();
              }} />
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Section 5: Voice Commands Cheat Sheet -->
    <div class="form-section" id="voice-cheatsheet-section">
      <div class="form-section-header">
        <h4 class="form-section-title">
          <span class="section-icon">📖</span> Spoken Voice Commands Cheat Sheet
        </h4>
        <button
          type="button"
          class="config-btn"
          id="btn-download-commands-txt"
          @click=${() => host.downloadVoiceCommandsTxt()}
          title="Download complete voice command manual as .txt">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download .txt
        </button>
      </div>

      <p class="setting-desc" style="margin-bottom: 12px;">
        Speak naturally to control LUMIN's visualizer and agent tools. Start commands with action verbs like <strong>make</strong>, <strong>switch</strong>, <strong>turn</strong>, or <strong>"visualizer"</strong>:
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px;">
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 14px 16px; border-radius: 10px;">
          <strong style="color: var(--glow-color, #00aaff); font-size: 0.84rem; display: block; margin-bottom: 6px;">🎨 Themes & Colors</strong>
          <span style="font-size: 0.8rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;"><code>"switch to cyberware"</code>, <code>"make background emerald"</code>, <code>"turn color pink"</code></span>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 14px 16px; border-radius: 10px;">
          <strong style="color: var(--glow-color, #00aaff); font-size: 0.84rem; display: block; margin-bottom: 6px;">🪐 3D Geometry</strong>
          <span style="font-size: 0.8rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;"><code>"make shape a cube"</code>, <code>"set visualizer to pyramid"</code>, <code>"shape like infinity"</code></span>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 14px 16px; border-radius: 10px;">
          <strong style="color: var(--glow-color, #00aaff); font-size: 0.84rem; display: block; margin-bottom: 6px;">✨ Shaders & Post-FX</strong>
          <span style="font-size: 0.8rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;"><code>"turn on morphing"</code>, <code>"enable motion blur"</code>, <code>"add chromatic aberration"</code></span>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); padding: 14px 16px; border-radius: 10px;">
          <strong style="color: var(--glow-color, #00aaff); font-size: 0.84rem; display: block; margin-bottom: 6px;">👁️ Visibility & Stage</strong>
          <span style="font-size: 0.8rem; color: var(--text-secondary, #94a3b8); line-height: 1.45;"><code>"hide visualizer"</code>, <code>"turn off particles"</code>, <code>"bring them back"</code></span>
        </div>
      </div>
    </div>
  `;
}

