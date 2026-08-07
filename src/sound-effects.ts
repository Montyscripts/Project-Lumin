/**
 * LUMIN AI Agent — Web Audio UI Sound Effects Synthesizer
 * High-precision, zero-latency organic audio feedback system using Web Audio API.
 * Features organic pitch variation, non-intrusive volume scaling, and debounced hover triggers.
 */

class SoundFXManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.35;
  private lastHoverTime: number = 0;
  private hoverDebounceMs: number = 35;

  constructor() {
    // Load persisted settings
    try {
      const storedEnabled = localStorage.getItem('lumin_sound_fx_enabled');
      if (storedEnabled !== null) {
        this.isEnabled = storedEnabled === 'true';
      }
      const storedVol = localStorage.getItem('lumin_sound_fx_volume');
      if (storedVol !== null) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(storedVol)));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('lumin_sound_fx_enabled', String(enabled));
    } catch {
      // Ignore storage errors
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.isEnabled);
    if (this.isEnabled) {
      this.playToggleOn();
    }
    return this.isEnabled;
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('lumin_sound_fx_volume', String(this.masterVolume));
    } catch {
      // Ignore storage errors
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Hover sounds disabled for buttons to keep UI interaction silent and clean.
   */
  public playHover(): void {
    // Disabled per user request
  }

  /**
   * Refined tactile mechanical click on button press.
   */
  public playClick(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // High to low frequency sweep for tactile click sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580 + Math.random() * 40, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.035);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);

      const vol = 0.08 * this.masterVolume;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.04);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Soft, organic tactile switch toggle ON.
   * Replaces high-pitched two-tone chimes with a warm, lowpass-filtered physical switch flip.
   */
  public playToggleOn(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Gentle pitch shift from 280Hz to 520Hz with soft lowpass
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.025);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, t);

      const vol = 0.04 * this.masterVolume;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Soft, organic tactile switch toggle OFF.
   * Gentle downward release tick.
   */
  public playToggleOff(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Soft downward release tick from 480Hz down to 220Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.025);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, t);

      const vol = 0.035 * this.masterVolume;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Helper to play appropriate toggle state sound
   */
  public playToggle(isOn?: boolean): void {
    if (isOn) {
      this.playToggleOn();
    } else {
      this.playToggleOff();
    }
  }

  /**
   * Smooth glass pop for tab switching or view switching.
   */
  public playTabSwitch(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.05); // G5

      const vol = 0.04 * this.masterVolume;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Warm ascending triad chime for Voice Recording / Continuous Mode activation.
   */
  public playVoiceStart(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const startTime = t + idx * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const vol = 0.06 * this.masterVolume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.setValueAtTime(vol, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Soft descending chime for stopping Voice Recording or exiting Continuous Mode.
   */
  public playVoiceStop(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [783.99, 659.25, 523.25]; // G5, E5, C5

      notes.forEach((freq, idx) => {
        const startTime = t + idx * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const vol = 0.05 * this.masterVolume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.setValueAtTime(vol, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Gentle double chime for incoming AI responses or completed tasks.
   */
  public playMessageReceived(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t); // A5
      gain1.gain.setValueAtTime(0.04 * this.masterVolume, t);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      // Pulse 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, t + 0.07); // D6
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.setValueAtTime(0.05 * this.masterVolume, t + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.09);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.07);
      osc2.stop(t + 0.2);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Gentle double thud for non-intrusive alert/error feedback.
   */
  public playError(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      [0, 0.08].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t + offset);
        osc.frequency.exponentialRampToValueAtTime(90, t + offset + 0.06);

        const vol = 0.07 * this.masterVolume;
        gain.gain.setValueAtTime(vol, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + offset);
        osc.stop(t + offset + 0.06);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Crisp futuristic shimmer for theme changes or major mode toggles.
   */
  public playModeSwitch(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

      const vol = 0.05 * this.masterVolume;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundFX = new SoundFXManager();
