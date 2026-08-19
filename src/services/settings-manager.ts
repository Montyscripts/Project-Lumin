/**
 * Centralized Settings and Theme Manager for LUMIN AI Agent.
 * Persists ONLY existing settings to localStorage without introducing extra demo state.
 */

export const THEMES = {
  cyberware: {
    name: 'Cyberware',
    '--glow-color': '#00aaff',
    '--glow-color-faded': 'rgba(0, 170, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e0e0e0',
    '--text-secondary': '#a0a0e0',
    '--border-color': 'rgba(255, 255, 255, 0.1)',
  },
  crimson: {
    name: 'Crimson Rogue',
    '--glow-color': '#ff2a2a',
    '--glow-color-faded': 'rgba(255, 42, 42, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#f0e0e0',
    '--text-secondary': '#b09090',
    '--border-color': 'rgba(255, 200, 200, 0.1)',
  },
  matrix: {
    name: 'Emerald Matrix',
    '--glow-color': '#00ff7f',
    '--glow-color-faded': 'rgba(0, 255, 127, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#d0f0d0',
    '--text-secondary': '#90b090',
    '--border-color': 'rgba(200, 255, 200, 0.1)',
  },
  solar: {
    name: 'Solar Flare',
    '--glow-color': '#ffae00',
    '--glow-color-faded': 'rgba(255, 174, 0, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#fff0d0',
    '--text-secondary': '#b0a080',
    '--border-color': 'rgba(255, 240, 200, 0.1)',
  },
  arcane: {
    name: 'Arcane Violet',
    '--glow-color': '#cc55ff',
    '--glow-color-faded': 'rgba(204, 85, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e8d8f8',
    '--text-secondary': '#a898b8',
    '--border-color': 'rgba(230, 210, 255, 0.1)',
  },
  glacial: {
    name: 'Glacial Ice',
    '--glow-color': '#7DF9FF',
    '--glow-color-faded': 'rgba(125, 249, 255, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#f0f8ff',
    '--text-secondary': '#a0b0c0',
    '--border-color': 'rgba(220, 240, 255, 0.1)',
  },
  golden: {
    name: 'Golden Age',
    '--glow-color': '#ffd700',
    '--glow-color-faded': 'rgba(255, 215, 0, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#fff5e0',
    '--text-secondary': '#bba888',
    '--border-color': 'rgba(255, 245, 220, 0.1)',
  },
  hotpink: {
    name: 'Hot Pink',
    '--glow-color': '#ff00c8',
    '--glow-color-faded': 'rgba(255, 0, 200, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#ffebf9',
    '--text-secondary': '#bb8bb0',
    '--border-color': 'rgba(255, 220, 250, 0.1)',
  },
  aqua: {
    name: 'Aquamarine',
    '--glow-color': '#00fca1',
    '--glow-color-faded': 'rgba(0, 252, 161, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#e0fff8',
    '--text-secondary': '#88bba8',
    '--border-color': 'rgba(200, 255, 240, 0.1)',
  },
  tungsten: {
    name: 'Tungsten',
    '--glow-color': '#cccccc',
    '--glow-color-faded': 'rgba(204, 204, 204, 0.5)',
    '--background-primary': '#000000',
    '--text-primary': '#ffffff',
    '--text-secondary': '#bbbbbb',
    '--border-color': 'rgba(255, 255, 255, 0.15)',
  },
} as const;

export type ThemeKey = keyof typeof THEMES | 'custom';

export interface LuminSettings {
  terminalAutoOpenHover: boolean;
  terminalWidth: number;
  terminalHeight: number;
  terminalFontSize: number;
  terminalIsBold: boolean;
  terminalPaneHeight: number;
  chatFontSize: 'smaller' | 'default' | 'larger';
  chatFontBold: boolean;
  userName: string;
  systemName: string;
  userAvatar: string;
  systemAvatar: string;
  autoLaunchWake: boolean;
  autoStopSleep: boolean;
  autoPlayTTS: boolean;
  ttsMode: 'full' | 'short' | 'off';
  activateWord: string;
  sleepCommandWord: string;
  enableMicrophone: boolean;
  enableDesktopAudio: boolean;
  selectedMicAudioDeviceId: string;
  selectedDesktopAudioDeviceId: string;
  isTerminalEnabled: boolean;
  isTerminalOpen: boolean;
  isTerminalTabActive: boolean;
  terminalOpacity: number;
  terminalPosition: 'left' | 'right' | 'top' | 'bottom';
  activeTheme: ThemeKey;
  unrestrictedMode: boolean;
}

export class SettingsManager {
  private static getItem(primaryKey: string, fallbackKey?: string): string | null {
    try {
      const val = localStorage.getItem(primaryKey);
      if (val !== null) return val;
      if (fallbackKey) return localStorage.getItem(fallbackKey);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return null;
  }

  private static setItem(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  public static loadSettings(): LuminSettings {
    const terminalAutoOpenHover = this.getItem('project_lumin_terminal_auto_open_hover') === 'true';
    const terminalWidth = Number(this.getItem('project_lumin_terminal_width') || '420');
    const terminalHeight = Number(this.getItem('project_lumin_terminal_height') || '320');
    const terminalFontSize = Number(this.getItem('project_lumin_terminal_font_size') || '14');
    const terminalIsBold = this.getItem('project_lumin_terminal_is_bold') !== 'false';
    const terminalPaneHeight = Number(this.getItem('project_lumin_terminal_pane_height') || '220');

    const chatFontSize = (this.getItem('project_lumin_chat_font_size') as any) || 'default';
    const chatFontBold = this.getItem('project_lumin_chat_font_bold') === 'true';
    const userName = this.getItem('project_lumin_user_name') || 'You';
    const systemName = this.getItem('project_lumin_system_name') || 'LUMIN';
    const userAvatar = this.getItem('project_lumin_user_avatar') || 'U';
    const systemAvatar = this.getItem('project_lumin_system_avatar') || 'S';

    const autoLaunchWake = this.getItem('project_lumin_auto_launch_wake') === 'true';
    const autoStopSleep = this.getItem('project_lumin_auto_stop_sleep') === 'true';
    const autoPlayTTS = this.getItem('project_lumin_auto_play_tts') === 'true';
    const ttsMode = (this.getItem('project_lumin_tts_mode') as any) || 'full';

    const activateWord = this.getItem('project_lumin_activate_word', 'synthra_activate_word') || 'computer';
    const sleepCommandWord = this.getItem('project_lumin_sleep_word', 'synthra_sleep_word') || 'standby';

    const enableMicrophone = this.getItem('project_lumin_enable_microphone', 'synthra_enable_microphone') === 'true';
    const enableDesktopAudio = this.getItem('project_lumin_enable_desktop_audio', 'synthra_enable_desktop_audio') === 'true';
    const selectedMicAudioDeviceId = this.getItem('project_lumin_selected_mic_device', 'synthra_selected_mic_device') || '';
    const selectedDesktopAudioDeviceId = this.getItem('project_lumin_selected_desktop_device', 'synthra_selected_desktop_device') || '';

    const savedTerminalEnabled = this.getItem('project_lumin_terminal_enabled');
    const isTerminalEnabled = savedTerminalEnabled !== null ? savedTerminalEnabled === 'true' : true;

    const savedTerminalOpen = this.getItem('project_lumin_terminal_open');
    const isTerminalOpen = savedTerminalOpen !== null ? savedTerminalOpen === 'true' : true;

    const savedTerminalTabActive = this.getItem('project_lumin_terminal_tab_active');
    const isTerminalTabActive = savedTerminalTabActive !== null ? savedTerminalTabActive === 'true' : true;

    const terminalOpacity = Number(this.getItem('project_lumin_terminal_opacity') || '0.5');

    const savedPos = this.getItem('project_lumin_terminal_position');
    const terminalPosition: 'left' | 'right' | 'top' | 'bottom' =
      savedPos === 'left' || savedPos === 'right' || savedPos === 'top' || savedPos === 'bottom'
        ? savedPos
        : 'right';

    const unrestrictedMode = this.getItem('project_lumin_unrestricted_mode') === 'true';

    return {
      terminalAutoOpenHover,
      terminalWidth,
      terminalHeight,
      terminalFontSize,
      terminalIsBold,
      terminalPaneHeight,
      chatFontSize,
      chatFontBold,
      userName,
      systemName,
      userAvatar,
      systemAvatar,
      autoLaunchWake,
      autoStopSleep,
      autoPlayTTS,
      ttsMode,
      activateWord,
      sleepCommandWord,
      enableMicrophone,
      enableDesktopAudio,
      selectedMicAudioDeviceId,
      selectedDesktopAudioDeviceId,
      isTerminalEnabled,
      isTerminalOpen,
      isTerminalTabActive,
      terminalOpacity,
      terminalPosition,
      activeTheme: 'cyberware',
      unrestrictedMode,
    };
  }

  public static saveSetting<K extends keyof LuminSettings>(key: K, value: LuminSettings[K]): void {
    const keyMap: Record<string, string> = {
      terminalAutoOpenHover: 'project_lumin_terminal_auto_open_hover',
      terminalWidth: 'project_lumin_terminal_width',
      terminalHeight: 'project_lumin_terminal_height',
      terminalFontSize: 'project_lumin_terminal_font_size',
      terminalIsBold: 'project_lumin_terminal_is_bold',
      terminalPaneHeight: 'project_lumin_terminal_pane_height',
      chatFontSize: 'project_lumin_chat_font_size',
      chatFontBold: 'project_lumin_chat_font_bold',
      userName: 'project_lumin_user_name',
      systemName: 'project_lumin_system_name',
      userAvatar: 'project_lumin_user_avatar',
      systemAvatar: 'project_lumin_system_avatar',
      autoLaunchWake: 'project_lumin_auto_launch_wake',
      autoStopSleep: 'project_lumin_auto_stop_sleep',
      autoPlayTTS: 'project_lumin_auto_play_tts',
      ttsMode: 'project_lumin_tts_mode',
      activateWord: 'project_lumin_activate_word',
      sleepCommandWord: 'project_lumin_sleep_word',
      enableMicrophone: 'project_lumin_enable_microphone',
      enableDesktopAudio: 'project_lumin_enable_desktop_audio',
      selectedMicAudioDeviceId: 'project_lumin_selected_mic_device',
      selectedDesktopAudioDeviceId: 'project_lumin_selected_desktop_device',
      isTerminalEnabled: 'project_lumin_terminal_enabled',
      isTerminalOpen: 'project_lumin_terminal_open',
      isTerminalTabActive: 'project_lumin_terminal_tab_active',
      terminalOpacity: 'project_lumin_terminal_opacity',
      terminalPosition: 'project_lumin_terminal_position',
      unrestrictedMode: 'project_lumin_unrestricted_mode',
    };

    const storageKey = keyMap[key as string];
    if (storageKey) {
      this.setItem(storageKey, String(value));
    }
  }

  public static applyThemeCss(themeKey: ThemeKey, element: HTMLElement = document.documentElement): void {
    if (themeKey === 'custom') return;
    const theme = THEMES[themeKey];
    if (!theme) return;
    for (const [prop, val] of Object.entries(theme)) {
      if (prop !== 'name') {
        element.style.setProperty(prop, val);
      }
    }
  }
}
