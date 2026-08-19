import { parseStructuredStatus } from '../types/status-schema';
import { SettingsManager, THEMES } from '../services/settings-manager';

export function runTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`TEST FAILED: ${message}`);
    }
  }

  // 1. Structured Status Schema Parser Tests
  const raw = JSON.stringify({
    status: 'completed',
    completed: ['task-1', 'task-2'],
    failed: [],
    next_action: 'done',
  });
  const parsed = parseStructuredStatus(raw);
  assert(parsed !== null, 'Structured status should be parsed');
  assert(parsed?.status === 'completed', 'Status should equal completed');
  assert(Array.isArray(parsed?.completed) && parsed?.completed.length === 2, 'Completed list should have 2 items');

  const plainText = 'Hello world';
  assert(parseStructuredStatus(plainText) === null, 'Plain text should return null status');

  // 2. Settings Manager Tests
  const settings = SettingsManager.loadSettings();
  assert(settings.terminalWidth === 420, 'Default terminal width should be 420');
  assert(settings.userName === 'You', 'Default username should be You');

  SettingsManager.saveSetting('userName', 'Alice');
  const updated = SettingsManager.loadSettings();
  assert(updated.userName === 'Alice', 'Updated username should persist');

  // 3. Theme Configuration Tests
  assert(THEMES.cyberware['--glow-color'] === '#00aaff', 'Cyberware glow color check');
  assert(Object.keys(THEMES).length === 10, 'Should have 10 default themes');

  return { passed, failed };
}
