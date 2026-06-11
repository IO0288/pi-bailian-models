# Pi BaiLian Models / Pi 百炼模型扩展

Adds Alibaba Cloud BaiLian models to Pi through the DashScope OpenAI-compatible API.

通过 DashScope OpenAI 兼容接口，为 Pi 添加阿里云百炼模型支持。

<table>
<tr>
<td><img src="./screenshot.png" width="400" alt="Pi model selector with BaiLian models"/></td>
<td><img src="./screenshot-login.png" width="400" alt="Pi login provider list"/></td>
</tr>
</table>

## Features / 功能

- Registers the `BaiLian Pay-as-you-go` provider in Pi.
- Uses DashScope compatible mode: `https://dashscope.aliyuncs.com/compatible-mode/v1`.
- Reads the API key from Pi's login flow as `DASHSCOPE_API_KEY`.
- Supports text-only reasoning models from Qwen, DeepSeek, Kimi, MiniMax, and GLM.
- Provides model metadata for context window, max output tokens, cache pricing, and compatibility flags.

## Available Models / 可用模型

| Model | Context Window | Max Output | Reasoning | Input |
| --- | ---: | ---: | :---: | :---: |
| `deepseek-v4-flash` | 1,000,000 | 393,216 | Yes | Text |
| `deepseek-v4-pro` | 1,000,000 | 393,216 | Yes | Text |
| `kimi-k2.6` | 262,144 | 16,384 | Yes | Text |
| `MiniMax/MiniMax-M2.7` | 204,800 | 131,072 | Yes | Text |
| `qwen3.7-max` | 1,000,000 | 65,536 | Yes | Text |
| `qwen3.7-max-preview` | 1,000,000 | 65,536 | Yes | Text |
| `qwen3.7-plus` | 1,000,000 | 65,536 | Yes | Text |
| `glm-5.1` | 206,848 | 131,072 | Yes | Text |

## Installation / 安装

Install from npm:

```bash
pi install npm:pi-bailian-models
```

Install from source:

```bash
pi install git:github.com/rUrU516/pi-bailian-models
```

## Update / 更新

```bash
pi update
```

## Usage / 使用方法

1. Start Pi.
2. Type `/login` in the chat.
3. Select `BaiLian Pay-as-you-go`.
4. Enter your BaiLian/DashScope API key. The key is stored by Pi as `DASHSCOPE_API_KEY`.
5. Pick one of the BaiLian models from the model selector.

中文步骤：

1. 启动 Pi。
2. 在对话框中输入 `/login`。
3. 选择 `BaiLian Pay-as-you-go`。
4. 输入你的百炼/DashScope API Key，Pi 会按 `DASHSCOPE_API_KEY` 保存。
5. 在模型选择器中选择需要使用的百炼模型。

Get an API key from the [Alibaba Cloud BaiLian console](https://bailian.console.aliyun.com/).

## Development / 开发

This package is a Pi extension. The entry point is `index.ts`, which registers the provider and loads model metadata from `models.ts`.

```text
index.ts    Provider registration
models.ts   Model capability metadata
```

Release order is documented in `AGENTS.md`: commit functional or documentation changes first, then bump `package.json` and `package-lock.json`, publish to npm, and commit the version bump.

## License / 许可证

MIT
