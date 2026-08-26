# Pi 百炼模型扩展

给 Pi 加上阿里云百炼模型。调用走国内 DashScope 的 OpenAI 兼容接口，模型清单来自百炼官方「查询模型列表」接口。

<table>
<tr>
<td><img src="./screenshot.png" width="400" alt="Pi 模型选择器中的百炼模型"/></td>
<td><img src="./screenshot-login.png" width="400" alt="Pi 登录页中的百炼提供商"/></td>
</tr>
</table>

## 这个扩展做什么

- 在 Pi 里注册提供商 `BaiLian`。
- 对话请求发到 `https://dashscope.aliyuncs.com/compatible-mode/v1`。
- API Key 使用 `DASHSCOPE_API_KEY`（Pi 登录时填写）。
- `models.ts` 里保存上下文长度、最大输出、缓存价格和兼容标志。
- 用官方 [查询模型列表](https://help.aliyun.com/zh/model-studio/list-models) 接口刷新这份清单。

## 安装

从 npm 安装：

```bash
pi install npm:pi-bailian-models
```

从源码安装：

```bash
pi install git:github.com/io0288/pi-models-bailian
```

更新：

```bash
pi update
```

## 使用

1. 启动 Pi。
2. 在对话框输入 `/login`。
3. 选择 `BaiLian`。
4. 填入百炼 API Key。Pi 会把它存成 `DASHSCOPE_API_KEY`。
5. 在模型选择器里挑选要使用的百炼模型。

API Key 在 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 申请。

## 模型清单

当前可用模型写在 `models.ts` 的 `MODEL_CAPABILITIES` 里。刷新清单：

```bash
npm run fetch-models
```

脚本默认请求：

```text
GET https://dashscope.aliyuncs.com/api/v1/models
  ?features=function-calling
  &capabilities=Reasoning
  &providers=qwen,zhipu-ai,mini-max,moonshot-ai,deepseek
  &page_size=100
```

也就是：只要支持函数调用、具备深度思考，且来自千问 / 智谱 / MiniMax / Kimi / DeepSeek 的模型。没有文本输入的条目会被跳过。

另外有一份内置模型 ID 正则黑名单，命中的条目不会写入 `models.ts`。比对前会把模型 ID 转成小写：

```text
deepseek-v3.*
deepseek-r1.*
kimi-k2.*
minimax-M2.*
glm-4.*
glm-5
glm-5.1
qwen-flash.*
qwen-plus.*
qwen3-.*
qwen3.5-.*
```

需要再排除时，可追加 `--exclude-id <regex>`。

写入 `models.ts` 时尽量用接口原值：

- `name` 用接口展示名
- `contextWindow` / `maxTokens` 用 `model_info` 里的官方字段；`max_output_tokens` 为空时再退到思考输出上限
- 价格用官方 `input_token` / `output_token` / 缓存价；没有普通 token 价时用 `thinking_*` 价
- 有分档计价时写入 `cost.tiers`
- Pi 只认 `text` / `image` 输入，所以会丢掉 `Video` / `Audio`
- `compat` 仍是 Pi 运行时需要的固定配置，接口没有这个字段

密钥读取顺序：

1. 环境变量 `DASHSCOPE_API_KEY`
2. 命令行 `--api-key`
3. Pi 已登录的 `BaiLian` Key（`~/.pi/agent/auth.json`）

## 开发

这是一个 Pi 扩展。入口是 `index.ts`，它会注册提供商，并读取 `models.ts` 里的模型元数据。

```text
index.ts                          注册百炼提供商
models.ts                         生成后的模型清单
scripts/fetch-bailian-models.mjs  拉取官方目录并重写 models.ts
AGENTS.md                         发布顺序
```

常用命令：

```bash
npm run fetch-models
node scripts/fetch-bailian-models.mjs --help
```

可选参数：

| 参数 | 作用 |
| --- | --- |
| `--workspace-id <id>` | 改用业务空间专属域名 |
| `--format json` | 输出同样结构的 JSON |
| `--stdout` | 打印到终端，不写文件 |
| `--source <path>` | 用本地 JSON，不发网络请求 |

发布顺序见 `AGENTS.md`：先提交功能和文档，再改版本号，然后 `npm publish`，最后把版本提交并推送。

## 许可证

MIT
