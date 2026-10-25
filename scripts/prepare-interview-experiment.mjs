import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { randomUUID } from "node:crypto"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const project = path.join(root, "experiment/knowledge-base")
for (const dir of ["raw/sources", "raw/assets", "wiki/entities", "wiki/concepts", "wiki/sources", "wiki/queries", "wiki/comparisons", "wiki/synthesis", ".llm-wiki"]) {
  await fs.mkdir(path.join(project, dir), { recursive: true })
}
async function createMissing(file, content) {
  try { await fs.writeFile(path.join(project, file), content, { flag: "wx" }) }
  catch (error) { if (error.code !== "EEXIST") throw error }
}
for (const name of (await fs.readdir(path.join(root, "experiment/corpus"))).filter((name) => name.endsWith(".md")).sort()) {
  await createMissing(`raw/sources/${name}`, await fs.readFile(path.join(root, "experiment/corpus", name)))
}
await createMissing("schema.md", `# Wiki Schema

## Page Types
| Type | Directory | Purpose |
| --- | --- | --- |
| entity | wiki/entities/ | 命名对象 |
| concept | wiki/concepts/ | 技术与原理 |
| source | wiki/sources/ | 来源摘要 |
| query | wiki/queries/ | 待解决问题 |
| comparison | wiki/comparisons/ | 方案比较 |
| synthesis | wiki/synthesis/ | 跨来源综合 |

所有知识页使用 YAML frontmatter，包含 type、title、sources、tags、related、created、updated。
sources 使用 raw/sources/ 下的相对路径。页面使用 [[wikilink]] 建立关系。
index.md 维护目录；overview.md 维护概览；log.md 记录操作。
所有演示资料均为实验资料，不可写成真实上线结果。历史政策和当前政策必须保留适用日期，不能混淆。
`)
await createMissing("purpose.md", `# AI 应用架构实验

## Goal
理解知识编译与 RAG 如何结合，核验来源、跨文档关联、历史冲突和任务恢复。

## Key Questions
1. raw、wiki、查询索引分别是什么？
2. Two-Step Ingest 有何收益、代价和失败边界？
3. 当前与历史策略如何区分？证据不足时是否拒绝推断？
4. 暂停、取消、失败与成功如何准确展示？

## Scope
八份原创实验文档；不含真实用户数据，不代表生产效果。
回答请使用中文，保留来源引用，区分来源事实、推断和待验证结论。
`)
await createMissing("wiki/index.md", "# Wiki Index\n\n## Entities\n\n## Concepts\n\n## Sources\n\n## Queries\n\n## Comparisons\n\n## Synthesis\n")
await createMissing("wiki/log.md", "# 实验日志\n\n- 初始化原始语料；尚未运行真实模型导入。\n")
await createMissing("wiki/overview.md", "---\ntype: overview\ntitle: AI 应用架构实验\nsources: []\n---\n\n# 实验知识库\n\n等待真实模型导入。此文件是初始化骨架。\n")
await createMissing(".llm-wiki/project.json", JSON.stringify({ id: randomUUID(), createdAt: Date.now() }, null, 2))
console.log(`实验知识库已准备：${project}\n已有文件保持原样。打开项目后配置 OpenRouter，再执行导入。`)
