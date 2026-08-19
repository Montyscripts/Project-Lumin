/**
 * Structured Status Schema for Agent Execution, Tool Results, and Errors.
 */

export interface AgentStatusSchema {
  status?: 'running' | 'completed' | 'failed' | 'thinking' | string;
  completed?: string[] | number;
  failed?: string[] | number;
  remaining?: string[] | number;
  next_action?: string;
  output?: string;
  error?: string;
  tool_name?: string;
  args?: Record<string, any>;
}

/**
 * Attempts to parse a structured status object from raw message text or tool output.
 */
export function parseStructuredStatus(text: string): AgentStatusSchema | null {
  if (!text) return null;

  // 1. Direct JSON parse attempt
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if ('status' in parsed || 'completed' in parsed || 'failed' in parsed || 'remaining' in parsed || 'next_action' in parsed || 'output' in parsed || 'error' in parsed) {
          return parsed as AgentStatusSchema;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Embedded JSON block attempt (e.g. ```json ... ```)
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (typeof parsed === 'object' && parsed !== null) {
        if ('status' in parsed || 'completed' in parsed || 'failed' in parsed || 'remaining' in parsed || 'next_action' in parsed || 'output' in parsed || 'error' in parsed) {
          return parsed as AgentStatusSchema;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Embedded [STATUS: ...] or [TOOL_RESULT: ...] pattern
  const statusPatternMatch = text.match(/\[STATUS:\s*(\{[\s\S]*?\})\]/i);
  if (statusPatternMatch && statusPatternMatch[1]) {
    try {
      const parsed = JSON.parse(statusPatternMatch[1]);
      return parsed as AgentStatusSchema;
    } catch (e) {
      // ignore
    }
  }

  return null;
}
