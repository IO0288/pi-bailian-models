import type { OAuthCredentials } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { DEFAULT_DYNAMIC_MODEL, MODEL_CAPABILITIES, type BailianModel } from "./models.ts";

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

type ModelListResponse = {
	data?: Array<{ id?: unknown; object?: unknown }>;
};

const availableModelIdsCache = new Map<string, Promise<string[] | undefined>>();

function createApiKeyCredentials(apiKey: string): OAuthCredentials {
	return {
		access: apiKey,
		refresh: apiKey,
		expires: Date.now() + TEN_YEARS_MS,
	};
}

function createDefaultModelCapability(id: string): BailianModel {
	return {
		id,
		name: id,
		...DEFAULT_DYNAMIC_MODEL,
	};
}

function getKnownModelMap(): Map<string, BailianModel> {
	return new Map(MODEL_CAPABILITIES.map((model) => [model.id, model]));
}

async function fetchAvailableModelIds(baseUrl: string, apiKey: string): Promise<string[] | undefined> {
	const cacheKey = `${baseUrl}:${apiKey}`;
	const cached = availableModelIdsCache.get(cacheKey);
	if (cached) return cached;

	const request = (async () => {
		const response = await fetch(`${baseUrl}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) return undefined;

		const payload = (await response.json()) as ModelListResponse;
		const ids = payload.data
			?.map((model) => model.id)
			.filter((id): id is string => typeof id === "string" && id.length > 0);

		return ids && ids.length > 0 ? ids : undefined;
	})();

	availableModelIdsCache.set(cacheKey, request);
	return request;
}

async function refreshProviderModels(models: BailianModel[], baseUrl: string, apiKey: string): Promise<void> {
	try {
		const availableIds = await fetchAvailableModelIds(baseUrl, apiKey);
		if (!availableIds) return;

		const knownModels = getKnownModelMap();
		const availableModels = availableIds.map((id) => knownModels.get(id) ?? createDefaultModelCapability(id));

		if (availableModels.length > 0) {
			models.splice(0, models.length, ...availableModels);
		}
	} catch {
		// Keep the built-in capability list when the provider does not expose /models.
	}
}

function registerBailianProvider(pi: ExtensionAPI, name: string, baseUrl: string): void {
	const models = [...MODEL_CAPABILITIES];

	pi.registerProvider(name, {
		baseUrl,
		// apiKey: "DASHSCOPE_API_KEY",
		api: "openai-completions",
		models,
		oauth: {
			name,

			async login(callbacks): Promise<OAuthCredentials> {
				const apiKey = await callbacks.onPrompt({
					message: "Enter your DashScope API key:",
					placeholder: "sk-...",
				});

				const trimmed = apiKey.trim();
				if (trimmed.length === 0) {
					throw new Error("API key is required.");
				}

				await refreshProviderModels(models, baseUrl, trimmed);

				return createApiKeyCredentials(trimmed);
			},

			async refreshToken(credentials) {
				return credentials;
			},

			getApiKey(credentials) {
				return credentials.access;
			},
		},
	});
}

export default function registerModelStudioProvider(pi: ExtensionAPI): void {
	registerBailianProvider(pi, "百炼 coding-plan", "https://coding.dashscope.aliyuncs.com/v1");
	registerBailianProvider(pi, "百炼 按量付费", "https://dashscope.aliyuncs.com/compatible-mode/v1");
}
