export interface OllamaModelInfo {
  name: string; // e.g. "llama3.2:3b"
  tag: string; // e.g. "3b" or "latest"
  displayName: string; // e.g. "Llama 3.2 3B"
  size: string; // e.g. "2.0 GB"
  sizeBytes?: number;
  parameterSize: string; // e.g. "3.2B"
  quantization: string; // e.g. "Q4_K_M"
  family: string; // e.g. "llama", "qwen2", "deepseek", "mistral", "phi", "gemma", "llava"
  category: 'fast' | 'reasoning' | 'coding' | 'vision' | 'general';
  recommendedUse: string; // e.g. "Best for Fast Chat & Voice Commands"
  description: string;
  speedRating: 'Ultra-Fast' | 'Fast' | 'Balanced' | 'Heavy';
  contextWindow: string; // e.g. "128K tokens"
  isLoadedInVram?: boolean;
  isInstalled: boolean;
  modifiedAt?: string;
  badgeColor?: string;
}

export interface ModelSelectorState {
  activeModel: string; // e.g. "llama3.2:3b" or "auto"
  isAutoRouting: boolean;
  ollamaRunning: boolean;
  ollamaHost: string;
  models: OllamaModelInfo[];
  runningModels: string[];
}
