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
   * Futuristic Interface Tone: Computer Wake / Listening Activated (A).
   * Clean, ascending two-stage futuristic affirmation tone (~180ms).
   */
  public playComputerActivate(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      
      // Part 1: Initial crisp presence tone (880Hz -> 1175Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, t + 0.05); // D6
      
      const vol1 = 0.06 * this.masterVolume;
      gain1.gain.setValueAtTime(0.001, t);
      gain1.gain.linearRampToValueAtTime(vol1, t + 0.006);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.09);

      // Part 2: Higher harmonic confirmation pulse (1320Hz -> 1760Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, t + 0.045); // E6
      osc2.frequency.setValueAtTime(1760.00, t + 0.07); // A6

      const vol2 = 0.065 * this.masterVolume;
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.setValueAtTime(0.0001, t + 0.045);
      gain2.gain.linearRampToValueAtTime(vol2, t + 0.055);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.045);
      osc2.stop(t + 0.18);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Futuristic Interface Tone: Computer Processing / Working (B).
   * Very subtle, soft lowpass filtered acknowledgement blip (~80ms).
   */
  public playComputerProcessing(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, t); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.03); // G5

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, t);

      const vol = 0.035 * this.masterVolume;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Futuristic Interface Tone: Turn Complete / Ready for User Input (C).
   * Warm, distinct two-tone resolution indicating LUMIN finished speaking (~160ms).
   */
  public playComputerReady(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // Pulse 1 (C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, t); // C6

      const vol1 = 0.045 * this.masterVolume;
      gain1.gain.setValueAtTime(0.001, t);
      gain1.gain.linearRampToValueAtTime(vol1, t + 0.006);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.07);

      // Pulse 2 (A5 with warm decay)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, t + 0.05); // A5

      const vol2 = 0.05 * this.masterVolume;
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.setValueAtTime(0.0001, t + 0.05);
      gain2.gain.linearRampToValueAtTime(vol2, t + 0.058);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.16);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  /**
   * Futuristic Interface Tone: Sleep / Standby Disengaged (D).
   * Gentle, descending futuristic deactivation tone (~180ms).
   */
  public playComputerStandby(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      // Pulse 1: High-to-mid step (D6 -> A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1174.66, t); // D6
      osc1.frequency.exponentialRampToValueAtTime(880.00, t + 0.06); // A5

      const vol1 = 0.055 * this.masterVolume;
      gain1.gain.setValueAtTime(0.001, t);
      gain1.gain.linearRampToValueAtTime(vol1, t + 0.006);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.08);

      // Pulse 2: Mid-to-low soft decay (587Hz -> 392Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const filter2 = ctx.createBiquadFilter();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, t + 0.055); // D5
      osc2.frequency.exponentialRampToValueAtTime(392.00, t + 0.15); // G4

      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(850, t + 0.055);

      const vol2 = 0.05 * this.masterVolume;
      gain2.gain.setValueAtTime(0.0001, t);
      gain2.gain.setValueAtTime(0.0001, t + 0.055);
      gain2.gain.linearRampToValueAtTime(vol2, t + 0.065);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(t + 0.055);
      osc2.stop(t + 0.18);
    } catch {
      // Ignore audio synthesis errors
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

  /**
   * Sci-fi prompt or command acknowledge chime.
   */
  public playCommandAcknowledge(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, t); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, t + 0.06); // B5

      const vol = 0.045 * this.masterVolume;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Snappy playful dice roll / randomize arpeggio chime.
   */
  public playDiceRoll(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = i === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (Math.random() * 20 - 10), t + i * 0.035);
        
        const vol = (i === notes.length - 1 ? 0.06 : 0.04) * this.masterVolume;
        gain.gain.setValueAtTime(0.0001, t + i * 0.035);
        gain.gain.linearRampToValueAtTime(vol, t + i * 0.035 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.035 + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(t + i * 0.035);
        osc.stop(t + i * 0.035 + 0.12);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Resonant triumph / unlock chime for Easter egg unlock and high-priority milestones.
   */
  public playSuccess(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6 (Bright D Major)

      notes.forEach((freq, idx) => {
        const startTime = t + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const vol = 0.06 * this.masterVolume;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Deep harmonic resonance sweep for system boot or power cycles.
   */
  public playBoot(): void {
    if (!this.isEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.18);

      const vol = 0.07 * this.masterVolume;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundFX = new SoundFXManager();
