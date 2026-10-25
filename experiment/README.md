# 三天面试级实验

上游：[nashsu/llm_wiki](https://github.com/nashsu/llm_wiki)，基线版本 `0.6.13`、提交 `e08cfce65aad8b76b13546a081c1a8d4422b70c3`。本地分支 `experiment/ingest-progress`。

## 当前验收边界

- 已安装前端与 MCP 依赖，准备 8 份原创实验语料和 8 个带预期要点的问题。
- 已实现进度结果分离、停止原因展开及暂停/恢复订阅通知修复。
- 已保留修复前失败测试、修复后回归测试、离线全套测试和构建日志。
- **已完成真实模型 Ingest → Wiki → Graph → Query。** 8 份来源全部导入，得到 50 个 Markdown 页面，默认图显示 38 个页面与 128 条链接；8 个固定问题和 1 个原文模式对照已执行。保留了 Agent 协议失败与回答遗漏，详见《D1-验收记录.md》，不声称全部问答通过。
- Rust 编译、macOS 打包和原生窗口验证已完成。最终打包日志见 `evidence/desktop-bundle-final.log`；实际语料审计见 `evidence/artifact-audit.json`，原始问答见 `evidence/qa-results.json`。

## 启动

本机已生成可直接在访达中双击打开的应用：`src-tauri/target/debug/bundle/macos/LLM Wiki.app`。它包含本次前端改进与 MCP 资源。“OpenRouter 实验”配置已由用户完成，凭据保存在本机应用设置中，项目仓库不包含 Key。聊天中的文件链接可能打开应用包内容，因此请通过访达启动。

需要从源码重新启动时：

```sh
npm ci
npm --prefix mcp-server ci
npm run mcp:build
node scripts/prepare-interview-experiment.mjs
npm run tauri dev
```

macOS 需要 Xcode 命令行工具、Rust >=1.88、Protobuf 编译器。当前机器已安装 protobuf。首次 Rust 依赖下载与编译耗时不计为模型延迟。

本次使用浅克隆和稀疏检出，跳过 README 截图及其他操作系统的 PDF 库。需要完整仓库时执行 `git sparse-checkout disable`，会继续下载文件。Markdown 演示无需 PDF 解析器。

打开项目目录：`experiment/knowledge-base`。初始化脚本只创建缺失文件，重复运行不覆盖 Wiki 或修改后的来源。

## OpenRouter 设置

在设置中启用 Custom，协议选择 OpenAI / Chat Completions：

| 项目 | 值 |
| --- | --- |
| Base URL | `https://openrouter.ai/api/v1` |
| 模型 | `qwen/qwen3.5-flash-02-23`，或你已授权使用的其他支持工具调用模型 |
| API Key | 由用户在应用中填写，不发到聊天、不写入提交 |
| 上下文预算 | 先设 32768，保持实验前后相同 |
| 导入并发 | 1，先降低变量数量 |
| 输出语言 | Chinese |
| Embedding | D1 初次演示可关闭；可选本地 `bge-m3`，启用后另做向量实验 |

模型 ID 于 2026-10-21 从 OpenRouter 模型目录核实。模型可用性和价格会变化，请按实际账户确认。接口依据：[OpenRouter 官方文档](https://openrouter.ai/docs/quickstart)。原项目把模型设置持久化在应用数据目录，避免分享含 Key 的配置文件。

上表是初始化建议。本次真实验收使用用户自行选择的 `deepseek/deepseek-v4-pro-0813`，保持 32768 上下文预算。原始来源模式的单题定性对照也使用同一模型。

## D1：端到端，约 2 小时

1. 实验项目已包含 8 份来源，开启自动监控时可能全部入队。可先暂停队列，仅处理 01 文档，再继续其余任务；或在新空项目只导入 01 试运行。观察“读取 → 分析 → 生成 → 写入”，检查 sources 前置元数据和原始文件。
2. 展示图：找到跨来源概念，打开相邻页面，核对链接是否有依据。记录实际节点、边数，不预设目标数量。
3. 用 `questions.json` 提问，重点演示 Q2 跨来源综合、Q6 历史政策、Q7 证据不足、Q8 共享页面边界。
4. 每题记录实际回答、引用路径、是否覆盖预期要点、是否存在无依据陈述。不因答案流畅就判通过。
5. 同样问题切换 Read Sources Only。比较证据完整性和解释质量，固定模型与预算。启用向量后再测，不能把关键词模式称作已验证 Hybrid Search。

交付门槛已达到：8 个来源已处理，图与真实问答已运行，并保留逐题人工复核。实际失败不等于整个应用未启动，但也不能被写成问答全部成功。

## D2：源码，约 3 小时

按根目录《导学-知识架构.md》读：导入编排 → 写入与缓存 → Rust 检索 → Agent 上下文 → 图。README 介绍存在简化与历史信息，应以当前调用链为准。整理 raw / wiki / index 的关系，避免把 schema 当作查询索引。

## D3：工程改进，约 3–4 小时

详见 `D3-工程改进.md`。展示问题、失败测试、修复和边界，而不是把原有取消/重试功能说成新开发。验证命令：

```sh
npm run test:mocks
npm run mcp:test
npm run build
```

定向测试：

```sh
npx vitest run src/components/layout/ingest-queue-status.test.ts src/lib/ingest-queue.test.ts src/lib/ingest-queue.integration.test.ts src/i18n/i18n-parity.test.ts
```

## 演示顺序（约 5 分钟）

1. 30 秒：证据层、知识层、索引层，交代上游与个人改动边界。
2. 90 秒：原文 → 生成页 → sources 引用 → 图 → Q6 回答。
3. 90 秒：展示进度误报场景、暂停和恢复；对照失败测试与修复结果。
4. 60 秒：知识编译的成本前移、生成错误与陈旧知识风险；传统 RAG 作为来源回查路径。
5. 30 秒：说明已测内容及仍未量化的质量、成本与取消延迟。

## 记录模板

| 日期 | 基线提交 | 模型 | 检索模式 | 语料版本 | 问题 | 实际答案/引用 | 人工判断 | 耗时 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 待测 | e08cfce | 待填 | 待填 | corpus 当前提交 | Q1–Q8 | 待填 | 待填 | 待填 |

本次逐题结果见 `D1-验收记录.md`。测试日志见 `evidence/`；本轮没有验证通用召回率和成本收益。

本机本地嵌入服务已单独通过接口探测：`bge-m3` 返回 1024 维向量，记录见 `evidence/embedding-probe.json`。这只确认服务可用，不代表 LanceDB 写入与应用内向量召回已验收。
