#!/usr/bin/env node

/**
 * Fetch Alibaba Cloud BaiLian model catalog from GET /api/v1/models
 * and emit models.ts-compatible BailianModel records.
 *
 * Docs: https://help.aliyun.com/zh/model-studio/list-models
 */

import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/models";
const DEFAULT_OUT = fileURLToPath(new URL("../models.ts", import.meta.url));
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_LANGUAGE = "zh-CN";
const DEFAULT_FEATURES = ["function-calling"];
const DEFAULT_CAPABILITIES = ["Reasoning"];
const DEFAULT_PROVIDERS = ["qwen", "zhipu-ai", "mini-max", "moonshot-ai", "deepseek"];
const ALLOWED_INPUT = new Set(["text", "image"]);
const AUTH_CANDIDATES = ["BaiLian", "BaiLian Pay-as-you-go", "百炼 按量付费"];
const PI_AUTH_FILE = resolve(homedir(), ".pi/agent/auth.json");

const QWEN_COMPAT = {
	supportsDeveloperRole: false,
	supportsReasoningEffort: false,
	maxTokensField: "max_tokens",
	requiresToolResultName: true,
	requiresMistralToolIds: true,
	thinkingFormat: "qwen",
};

const PRICE_PRIORITY = {
	input: ["input_token", "thinking_input_token"],
	output: ["output_token", "thinking_output_token"],
	cacheRead: [
		"input_token_cache",
		"thinking_input_token_cache",
		"input_token_cache_read",
		"thinking_input_token_cache_read",
	],
	cacheWrite: ["input_token_cache_creation_5m", "thinking_input_token_cache_creation_5m"],
};

function printHelp() {
	process.stdout.write(`Fetch BaiLian models from the official List Models API.

Usage:
  node scripts/fetch-bailian-models.mjs [options]

Auth:
  DASHSCOPE_API_KEY, --api-key, or Pi auth.json (BaiLian)

Options:
  --endpoint <url>         List Models URL (default: ${DEFAULT_ENDPOINT})
  --workspace-id <id>      Use https://<id>.cn-beijing.maas.aliyuncs.com/api/v1/models
  --api-key <key>          BaiLian API key (default: $DASHSCOPE_API_KEY)
  --language <code>        zh-CN or en-US (default: ${DEFAULT_LANGUAGE})
  --page-size <n>          Page size (default: ${DEFAULT_PAGE_SIZE})
  --capability <name>      Repeatable filter, default Reasoning
  --feature <name>         Repeatable filter, default function-calling
  --provider <name>        Repeatable filter, default qwen,zhipu-ai,mini-max,moonshot-ai,deepseek
  --source <path>          Local JSON dump instead of HTTP
  --out <path>             Output path (default: models.ts)
  --format <ts|json>       Output format (default: from --out extension, else ts)
  --stdout                 Write to stdout instead of a file
  -h, --help               Show this help

Docs: https://help.aliyun.com/zh/model-studio/list-models
`);
}

function parseArgs(argv) {
	const options = {
		endpoint: DEFAULT_ENDPOINT,
		workspaceId: null,
		apiKey: null,
		language: DEFAULT_LANGUAGE,
		pageSize: DEFAULT_PAGE_SIZE,
		capabilities: [],
		features: [],
		providers: [],
		source: null,
		out: DEFAULT_OUT,
		format: null,
		stdout: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "-h" || arg === "--help") {
			options.help = true;
			continue;
		}
		if (arg === "--stdout") {
			options.stdout = true;
			continue;
		}
		const valueArgs = [
			"--endpoint",
			"--workspace-id",
			"--api-key",
			"--language",
			"--page-size",
			"--capability",
			"--feature",
			"--provider",
			"--source",
			"--out",
			"--format",
		];
		if (valueArgs.includes(arg)) {
			const value = argv[i + 1];
			if (!value || value.startsWith("-")) {
				throw new Error(`${arg} requires a value`);
			}
			i += 1;
			if (arg === "--endpoint") options.endpoint = value;
			if (arg === "--workspace-id") options.workspaceId = value;
			if (arg === "--api-key") options.apiKey = value;
			if (arg === "--language") options.language = value;
			if (arg === "--page-size") options.pageSize = Number(value);
			if (arg === "--capability") options.capabilities.push(...splitCsv(value));
			if (arg === "--feature") options.features.push(...splitCsv(value));
			if (arg === "--provider") options.providers.push(...splitCsv(value));
			if (arg === "--source") options.source = value;
			if (arg === "--out") options.out = value;
			if (arg === "--format") options.format = value;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	if (options.format && options.format !== "ts" && options.format !== "json") {
		throw new Error(`Unknown format: ${options.format}`);
	}
	if (!Number.isInteger(options.pageSize) || options.pageSize < 1) {
		throw new Error(`Invalid --page-size: ${options.pageSize}`);
	}
	if (options.capabilities.length === 0) {
		options.capabilities = [...DEFAULT_CAPABILITIES];
	}
	if (options.features.length === 0) {
		options.features = [...DEFAULT_FEATURES];
	}
	if (options.providers.length === 0) {
		options.providers = [...DEFAULT_PROVIDERS];
	}

	return options;
}

function resolveFormat(options) {
	if (options.format) return options.format;
	return extname(String(options.out)).toLowerCase() === ".json" ? "json" : "ts";
}

function resolveEndpoint(options) {
	if (options.workspaceId) {
		return `https://${options.workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/models`;
	}
	return options.endpoint;
}

async function readPiAuthKey() {
	try {
		const auth = JSON.parse(await readFile(PI_AUTH_FILE, "utf8"));
		for (const name of AUTH_CANDIDATES) {
			const entry = auth?.[name];
			if (entry?.type === "api_key" && typeof entry.key === "string" && entry.key) {
				return entry.key;
			}
		}
	} catch (error) {
		if (error && error.code === "ENOENT") return null;
		throw error;
	}
	return null;
}

async function resolveApiKey(options) {
	if (options.apiKey) return options.apiKey;
	if (process.env.DASHSCOPE_API_KEY) return process.env.DASHSCOPE_API_KEY;
	const stored = await readPiAuthKey();
	if (stored) return stored;
	throw new Error(
		"Missing BaiLian API key. Set DASHSCOPE_API_KEY, pass --api-key, or log in with Pi.",
	);
}

function numberOrZero(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function extractModels(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.output?.models)) return payload.output.models;
	if (Array.isArray(payload?.models)) return payload.models;
	throw new Error("JSON does not contain output.models");
}

async function loadLocalModels(source) {
	const filePath = source.startsWith("file:")
		? fileURLToPath(source)
		: resolve(source);
	return extractModels(JSON.parse(await readFile(filePath, "utf8")));
}

function splitCsv(value) {
	return String(value)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function setCsvParam(url, key, values) {
	if (values.length > 0) {
		url.searchParams.set(key, values.join(","));
	}
}

function buildListUrl(endpoint, options, pageNo) {
	const url = new URL(endpoint);
	setCsvParam(url, "features", options.features);
	setCsvParam(url, "capabilities", options.capabilities);
	setCsvParam(url, "providers", options.providers);
	url.searchParams.set("page_size", String(options.pageSize));
	url.searchParams.set("page_no", String(pageNo));
	return url;
}

async function fetchPage(url, apiKey) {
	const response = await fetch(url, {
		headers: {
			authorization: `Bearer ${apiKey}`,
			accept: "application/json",
			"content-type": "application/json",
		},
	});
	const text = await response.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		throw new Error(`Invalid JSON from ${url.origin}${url.pathname}: HTTP ${response.status}`);
	}
	if (!response.ok || body.success === false) {
		const detail = body.message || body.code || response.statusText;
		throw new Error(`List models failed (${response.status}): ${detail}`);
	}
	return body;
}

async function fetchRemoteModels(options, apiKey) {
	const endpoint = resolveEndpoint(options);
	const models = [];
	let pageNo = 1;
	let total = Infinity;

	while (models.length < total) {
		const url = buildListUrl(endpoint, options, pageNo);
		const body = await fetchPage(url, apiKey);
		const output = body.output ?? {};
		const batch = output.models ?? [];
		total = Number(output.total ?? models.length + batch.length);
		models.push(...batch);
		if (batch.length === 0) break;
		pageNo += 1;
		if (pageNo > 100) {
			throw new Error("Stopped after 100 pages; check page_size / API pagination");
		}
	}

	return { endpoint, models, request: buildListUrl(endpoint, options, 1).toString() };
}

function mapInput(raw) {
	const values = raw?.inference_metadata?.request_modality ?? [];
	const input = [];
	for (const value of values) {
		const mapped = String(value).toLowerCase();
		if (ALLOWED_INPUT.has(mapped) && !input.includes(mapped)) {
			input.push(mapped);
		}
	}
	return input;
}

function firstNumber(...values) {
	for (const value of values) {
		if (value == null || value === "") continue;
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return 0;
}

function parseTokenSize(token) {
	const match = String(token)
		.trim()
		.toLowerCase()
		.match(/^(\d+(?:\.\d+)?)([km])?$/);
	if (!match) return null;
	const amount = Number(match[1]);
	if (match[2] === "k") return Math.round(amount * 1_000);
	if (match[2] === "m") return Math.round(amount * 1_000_000);
	return Math.round(amount);
}

function parseInputTokensAbove(rangeName) {
	if (!rangeName || rangeName === "Default") return 0;
	const match = String(rangeName).match(/^(\d+(?:\.\d+)?[kmKM]?)\s*<\s*(?:输入|Input)\s*<=/i);
	if (!match) return 0;
	return parseTokenSize(match[1]) ?? 0;
}

function standardPriceItems(items) {
	return (items ?? []).filter((item) => {
		const band = item?.time_band;
		return band == null || band === "standard";
	});
}

function itemsToCost(items) {
	const byType = new Map();
	for (const item of items) {
		const type = String(item?.type ?? "");
		if (type && !byType.has(type)) {
			byType.set(type, numberOrZero(item.price));
		}
	}
	const cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
	for (const [field, types] of Object.entries(PRICE_PRIORITY)) {
		for (const type of types) {
			if (byType.has(type)) {
				cost[field] = byType.get(type);
				break;
			}
		}
	}
	return cost;
}

function mapCost(raw) {
	const tiers = Array.isArray(raw?.prices) ? raw.prices : [];
	const mapped = [];
	for (const tier of tiers) {
		mapped.push({
			...itemsToCost(standardPriceItems(tier?.prices)),
			inputTokensAbove: parseInputTokensAbove(tier?.range_name),
			rangeName: tier?.range_name ?? "",
		});
	}
	if (mapped.length === 0) {
		return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
	}

	const base =
		mapped.find((tier) => tier.rangeName === "Default") ??
		mapped.find((tier) => tier.inputTokensAbove === 0) ??
		mapped[0];
	const extras = mapped
		.filter((tier) => tier !== base && tier.inputTokensAbove > 0)
		.sort((a, b) => a.inputTokensAbove - b.inputTokensAbove)
		.map(({ input, output, cacheRead, cacheWrite, inputTokensAbove }) => ({
			input,
			output,
			cacheRead,
			cacheWrite,
			inputTokensAbove,
		}));

	const cost = {
		input: base.input,
		output: base.output,
		cacheRead: base.cacheRead,
		cacheWrite: base.cacheWrite,
	};
	if (extras.length > 0) cost.tiers = extras;
	return cost;
}

function mapModel(raw) {
	const id = raw?.model;
	if (!id) return { skip: "missing model id" };

	const input = mapInput(raw);
	if (!input.includes("text")) {
		return { skip: "missing text input" };
	}

	const info = raw?.model_info ?? {};
	const capabilities = raw?.capabilities ?? [];
	const displayName = typeof raw?.name === "string" ? raw.name.trim() : "";

	return {
		model: {
			id,
			name: displayName || id,
			reasoning: capabilities.includes("Reasoning"),
			input,
			cost: mapCost(raw),
			contextWindow: firstNumber(
				info.context_window,
				info.max_input_tokens,
				info.reasoning_max_input_tokens,
			),
			maxTokens: firstNumber(
				info.max_output_tokens,
				info.reasoning_max_output_tokens,
				info.max_reasoning_tokens,
			),
			compat: { ...QWEN_COMPAT },
		},
	};
}

function toBailianModels(rawModels) {
	const models = [];
	const skipped = [];
	const seen = new Set();

	for (const raw of rawModels) {
		const mapped = mapModel(raw);
		if (mapped.skip) {
			skipped.push({ id: raw?.model ?? "(unknown)", reason: mapped.skip });
			continue;
		}
		if (seen.has(mapped.model.id)) {
			skipped.push({ id: mapped.model.id, reason: "duplicate id" });
			continue;
		}
		seen.add(mapped.model.id);
		models.push(mapped.model);
	}

	models.sort((a, b) => a.id.localeCompare(b.id));
	return { models, skipped };
}

function formatInt(value) {
	const n = Math.round(numberOrZero(value));
	const sign = n < 0 ? "-" : "";
	return sign + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "_");
}

function formatCost(value) {
	const n = numberOrZero(value);
	if (Number.isInteger(n)) return String(n);
	return String(Number(n.toPrecision(10)));
}

function renderCostTs(cost) {
	const base = `{ input: ${formatCost(cost.input)}, output: ${formatCost(cost.output)}, cacheRead: ${formatCost(cost.cacheRead)}, cacheWrite: ${formatCost(cost.cacheWrite)}`;
	if (!Array.isArray(cost.tiers) || cost.tiers.length === 0) {
		return base + " }";
	}
	const tiers = cost.tiers
		.map(
			(tier) =>
				`{ input: ${formatCost(tier.input)}, output: ${formatCost(tier.output)}, cacheRead: ${formatCost(tier.cacheRead)}, cacheWrite: ${formatCost(tier.cacheWrite)}, inputTokensAbove: ${formatInt(tier.inputTokensAbove)} }`,
		)
		.join(", ");
	return base + `, tiers: [${tiers}] }`;
}

function renderModelTs(model) {
	const input = model.input.map((value) => JSON.stringify(value)).join(", ");
	return [
		"\t{",
		`\t\tid: ${JSON.stringify(model.id)},`,
		`\t\tname: ${JSON.stringify(model.name)},`,
		`\t\treasoning: ${model.reasoning},`,
		`\t\tinput: [${input}] as const,`,
		`\t\tcost: ${renderCostTs(model.cost)},`,
		`\t\tcontextWindow: ${formatInt(model.contextWindow)},`,
		`\t\tmaxTokens: ${formatInt(model.maxTokens)},`,
		"\t\tcompat: QWEN_COMPAT,",
		"\t},",
	].join("\n");
}

function renderModelsTs(models, meta) {
	return `// Generated by scripts/fetch-bailian-models.mjs
// Source: ${meta.source}
// Fetched: ${meta.fetchedAt}

export type BailianModel = {
	id: string;
	name: string;
	reasoning: boolean;
	input: readonly ("text" | "image")[];
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		tiers?: readonly {
			input: number;
			output: number;
			cacheRead: number;
			cacheWrite: number;
			inputTokensAbove: number;
		}[];
	};
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
${models.map(renderModelTs).join("\n")}
];
`;
}

function existingModelIds(source) {
	const matches = source.matchAll(/^\t\tid: "([^"]+)",$/gm);
	return [...matches].map((match) => match[1]);
}

async function warnDroppedIds(outPath, nextIds) {
	try {
		const previous = await readFile(outPath, "utf8");
		if (!previous.includes("export const MODEL_CAPABILITIES")) return;
		const next = new Set(nextIds);
		const dropped = existingModelIds(previous).filter((id) => !next.has(id));
		if (dropped.length > 0) {
			process.stderr.write(`dropped existing models.ts ids: ${dropped.join(", ")}\n`);
		}
	} catch (error) {
		if (error && error.code === "ENOENT") return;
		throw error;
	}
}

function printSummary(source, models, skipped) {
	const skipText =
		skipped.length > 0
			? `skipped: ${skipped.length} (${skipped
					.slice(0, 8)
					.map((item) => `${item.id}: ${item.reason}`)
					.join(", ")}${skipped.length > 8 ? ", ..." : ""})`
			: null;
	process.stderr.write(
		[`source: ${source}`, `models: ${models.length}`, skipText].filter(Boolean).join("\n") + "\n",
	);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const format = resolveFormat(options);
	let source;
	let rawModels;

	if (options.source) {
		source = options.source;
		rawModels = await loadLocalModels(options.source);
	} else {
		const apiKey = await resolveApiKey(options);
		const fetched = await fetchRemoteModels(options, apiKey);
		source = fetched.request ?? fetched.endpoint;
		rawModels = fetched.models;
	}

	const { models, skipped } = toBailianModels(rawModels);
	const meta = {
		source,
		fetchedAt: new Date().toISOString(),
	};

	printSummary(source, models, skipped);

	const output =
		format === "json"
			? `${JSON.stringify(models, null, 2)}\n`
			: renderModelsTs(models, meta);

	if (options.stdout) {
		process.stdout.write(output);
		return;
	}

	const outPath = resolve(options.out);
	if (format === "ts") {
		await warnDroppedIds(
			outPath,
			models.map((model) => model.id),
		);
	}
	await writeFile(outPath, output, "utf8");
	process.stderr.write(`wrote: ${outPath}\n`);
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
	process.exit(1);
});
