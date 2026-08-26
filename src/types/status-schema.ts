/**
 * Structured Status Schema for Agent Execution, Tool Results, and Errors.
 */

export interface AgentStatusSchema {
  type?: 'tool_start' | 'tool_end' | 'agent_thinking' | 'progress' | 'status' | 'model_missing' | 'starter_model' | string;
  status?: 'running' | 'completed' | 'succeeded' | 'failed' | 'blocked' | 'thinking' | 'needs_user' | string;
  completed?: string[] | number;
  failed?: string[] | number;
  remaining?: string[] | number;
  next_action?: string;
  output?: string;
  error?: string;
  tool_name?: string;
  args?: Record<string, any>;
  step?: number;
  max_steps?: number;
  model?: string;
  model_size?: string;
  display_name?: string;
  prompt_user?: boolean;
  action?: 'pull_model' | 'confirm_tool' | 'authorize' | string;
  is_first_run?: boolean;
  reason?: string;
  message?: string;
}

/**
 * Attempts to parse a structured status object from raw message text, stdout stream, or tool output.
 */
export function parseStructuredStatus(text: string): AgentStatusSchema | null {
  if (!text) return null;

  // 1. Direct JSON parse attempt
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if ('status' in parsed || 'type' in parsed || 'tool_name' in parsed || 'completed' in parsed || 'failed' in parsed || 'remaining' in parsed || 'next_action' in parsed || 'output' in parsed || 'error' in parsed || 'model' in parsed || 'prompt_user' in parsed) {
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
        if ('status' in parsed || 'type' in parsed || 'tool_name' in parsed || 'completed' in parsed || 'failed' in parsed || 'remaining' in parsed || 'next_action' in parsed || 'output' in parsed || 'error' in parsed || 'model' in parsed || 'prompt_user' in parsed) {
          return parsed as AgentStatusSchema;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Embedded [PROGRESS] {...}, [STATUS: {...}], [MODEL_MISSING: {...}], [TOOL_START: {...}], [TOOL_END: {...}] patterns
  const structuredPrefixMatch = text.match(/\[(?:STATUS|PROGRESS|MODEL_MISSING|MISSING_MODEL|STARTER_MODEL|TOOL_START|TOOL_END)[:\s]\s*(\{[\s\S]*?\})\]/i) ||
                                text.match(/\[(?:PROGRESS|STATUS)\]\s*(\{[\s\S]*?\})/i);
  if (structuredPrefixMatch && structuredPrefixMatch[1]) {
    try {
      const parsed = JSON.parse(structuredPrefixMatch[1]);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as AgentStatusSchema;
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
}

