import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { MODEL_CAPABILITIES } from "./models.ts";

function registerBailianProvider(pi: ExtensionAPI, name: string, baseUrl: string): void {
	pi.registerProvider(name, {
		baseUrl,
		apiKey: "DASHSCOPE_API_KEY",
		api: "openai-completions",
		models: MODEL_CAPABILITIES,
	});
}

export default function registerModelStudioProvider(pi: ExtensionAPI): void {
	registerBailianProvider(pi, "BaiLian Pay-as-you-go", "https://dashscope.aliyuncs.com/compatible-mode/v1");
}
