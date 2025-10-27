declare interface LanguageModelSession {
  prompt(message: string, options?: { responseConstraint?: any }): Promise<string>;
  destroy(): void;
}

declare interface LanguageModelParams {
  defaultTemperature: number;
  defaultTopK: number;
}

declare interface LanguageModelMonitor {
  addEventListener(event: string, handler: (e: any) => void): void;
}

declare interface LanguageModelCreateOptions {
  temperature?: number;
  topK?: number;
  monitor?: (monitor: LanguageModelMonitor) => void;
  initialPrompts?: Array<{
    role: string;
    content: string;
  }>;
  expectedInputs?: Array<{
    type: string;
    languages: string[];
  }>;
  expectedOutputs?: Array<{
    type: string;
    languages: string[];
  }>;
  tools?: Array<{
    name: string;
    description: string;
    execute: () => Promise<string>;
  }>;
}

declare const LanguageModel: {
  availability(): Promise<'readily' | 'after-download' | 'downloading' | 'no'>;
  params(): Promise<LanguageModelParams>;
  create(options: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};
