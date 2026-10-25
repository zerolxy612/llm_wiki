/** Audits real files produced by the desktop app. Does not call an LLM. */
import { describe, expect, it, vi } from "vitest"
import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { realFs } from "@/test-helpers/fs-temp"

// Only replace the desktop filesystem transport; use real on-disk content and
// the application's actual frontmatter, cache and graph implementations.
vi.mock("@/commands/fs", () => realFs)

import { buildWikiGraph } from "@/lib/wiki-graph"
import { parseFrontmatter } from "@/lib/frontmatter"
import { checkIngestCache } from "@/lib/ingest-cache"

describe.skipIf(process.env.RUN_INTERVIEW_AUDIT !== "1")("native experiment artifacts", () => {
  it("covers all eight sources, preserves provenance and builds the real graph", async () => {
    const project = path.resolve("experiment/knowledge-base")
    const sources = (await fs.readdir(`${project}/raw/sources`)).filter((name) => name.endsWith(".md")).sort()
    const entries = JSON.parse(await fs.readFile(`${project}/.llm-wiki/ingest-cache.json`, "utf8")).entries
    const sourceChecks = []
    for (const name of sources) {
      const content = await fs.readFile(`${project}/raw/sources/${name}`, "utf8")
      const cached = await checkIngestCache(project, name, content)
      sourceChecks.push({ name, hash: createHash("sha256").update(content).digest("hex"), cachedOutputs: cached?.length ?? 0, ingestedAt: entries[name]?.timestamp })
    }

    const graph = await buildWikiGraph(project)
    const pages = []
    const pendingFiles = [...await realFs.listDirectory(`${project}/wiki`)]
    while (pendingFiles.length > 0) {
      const file = pendingFiles.pop()!
      if (file.is_dir) {
        pendingFiles.push(...file.children ?? [])
        continue
      }
      if (!file.name.endsWith(".md")) continue
      const content = await fs.readFile(file.path, "utf8")
      const frontmatter = parseFrontmatter(content).frontmatter ?? {}
      pages.push({ path: path.relative(project, file.path), type: frontmatter.type ?? "other", sources: frontmatter.sources ?? [] })
    }
    const structural = new Set(["wiki/index.md", "wiki/log.md", "wiki/overview.md"])
    const withoutProvenance = pages.filter((page) => !structural.has(page.path) && (!Array.isArray(page.sources) || page.sources.length === 0))
    const danglingSourceReferences = pages.flatMap((page) =>
      (Array.isArray(page.sources) ? page.sources : []).filter((source) => !sources.includes(source.replace(/^raw\/sources\//, ""))).map((source) => ({ page: page.path, source })),
    )
    const report = {
      checkedAt: new Date().toISOString(),
      scope: "Real desktop-generated files; Node replaces only filesystem IPC. Graph and cache code are unchanged production modules. This is not a model-answer quality test.",
      sources: sourceChecks,
      graph: { nodes: graph.nodes.length, edges: graph.edges.length, communities: graph.communities.length, types: Object.fromEntries([...new Set(graph.nodes.map((node) => node.type))].map((type) => [type, graph.nodes.filter((node) => node.type === type).length])) },
      pagesWithoutProvenance: withoutProvenance,
      danglingSourceReferences,
      pages,
    }
    await fs.writeFile("experiment/evidence/artifact-audit.json", JSON.stringify(report, null, 2) + "\n")
    expect(sources).toHaveLength(8)
    expect(sourceChecks.filter((source) => source.cachedOutputs > 0)).toHaveLength(8)
    expect(graph.nodes.length).toBeGreaterThan(8)
    expect(graph.edges.length).toBeGreaterThan(0)
    expect(withoutProvenance).toEqual([])
    expect(danglingSourceReferences).toEqual([])
  }, 30_000)
})
