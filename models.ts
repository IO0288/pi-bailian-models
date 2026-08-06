export type BailianModel = {
	id: string;
	name: string;
	reasoning: boolean;
	input: readonly ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	compat: {
		supportsDeveloperRole: boolean;
		supportsReasoningEffort: boolean;
		maxTokensField: "max_tokens";
		requiresToolResultName: boolean;
		requiresMistralToolIds: boolean;
		thinkingFormat: "qwen";
	};
};

export const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

export const QWEN_COMPAT = {
	supportsDeveloperRole: false,
	supportsReasoningEffort: false,
	maxTokensField: "max_tokens",
	requiresToolResultName: true,
	requiresMistralToolIds: true,
	thinkingFormat: "qwen",
} as const;

export const MODEL_CAPABILITIES: BailianModel[] = [
	{
		id: "qwen3.8-max",
		name: "qwen3.8-max",
		reasoning: true,
		input: ["text", "image"] as const,
		cost: { input: 12, output: 36, cacheRead: 1.5, cacheWrite: 15 },
		contextWindow: 1_000_000,
		maxTokens: 131_072,
		compat: QWEN_COMPAT,
	},
	// deepseek 用官方的会更便宜
	// {
	// 	id: "deepseek-v4-flash",
	// 	name: "deepseek-v4-flash",
	// 	reasoning: true,
	// 	input: ["text"] as const,
	// 	cost: { input: 1, output: 2, cacheRead: 0.2, cacheWrite: 0 },
	// 	contextWindow: 1_000_000,
	// 	maxTokens: 393_216,
	// 	compat: QWEN_COMPAT,
	// },
	// {
	// 	id: "deepseek-v4-pro",
	// 	name: "deepseek-v4-pro",
	// 	reasoning: true,
	// 	input: ["text"] as const,
	// 	cost: { input: 12, output: 24, cacheRead: 1, cacheWrite: 0 },
	// 	contextWindow: 1_000_000,
	// 	maxTokens: 393_216,
	// 	compat: QWEN_COMPAT,
	// },
	{
		id: "kimi/kimi-k3",
		name: "kimi/kimi-k3",
		reasoning: true,
		input: ["text", "image"] as const,
		cost: { input: 20, output: 100, cacheRead: 2, cacheWrite: 0 },
		contextWindow: 1_048_576,
		maxTokens: 1_048_576,
		compat: QWEN_COMPAT,
	},
	// {
	// 	id: "MiniMax/MiniMax-M2.7",
	// 	name: "MiniMax/MiniMax-M2.7",
	// 	reasoning: true,
	// 	input: ["text"] as const,
	// 	cost: { input: 2.1, output: 8.4, cacheRead: 0.42, cacheWrite: 0 },
	// 	contextWindow: 204_800,
	// 	maxTokens: 131_072,
	// 	compat: QWEN_COMPAT,
	// },
	{
		id: "glm-5.2",
		name: "glm-5.2",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 8, output: 28, cacheRead: 2, cacheWrite: 0 },
		contextWindow: 1_048_576,
		maxTokens: 131_072,
		compat: QWEN_COMPAT,
	},
];
