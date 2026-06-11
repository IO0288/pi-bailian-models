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
		id: "qwen3.7-max",
		name: "qwen3.7-max",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 12, output: 36, cacheRead: 2.4, cacheWrite: 15 },
		contextWindow: 1_000_000,
		maxTokens: 65_536,
		compat: QWEN_COMPAT,
	},
	{
		id: "qwen3.7-max-preview",
		name: "qwen3.7-max-preview",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 12, output: 36, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1_000_000,
		maxTokens: 65_536,
		compat: QWEN_COMPAT,
	},
	{
		id: "qwen3.7-plus",
		name: "qwen3.7-plus",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 2, output: 8, cacheRead: 0.4, cacheWrite: 2.5 },
		contextWindow: 1_000_000,
		maxTokens: 65_536,
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
		id: "kimi-k2.6",
		name: "kimi-k2.6",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 6.5, output: 27, cacheRead: 1.3, cacheWrite: 8.125 },
		contextWindow: 262_144,
		maxTokens: 16_384,
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
		id: "glm-5.1",
		name: "glm-5.1",
		reasoning: true,
		input: ["text"] as const,
		cost: { input: 8, output: 28, cacheRead: 1.6, cacheWrite: 10 },
		contextWindow: 206_848,
		maxTokens: 131_072,
		compat: QWEN_COMPAT,
	},
];
