import type { getQueueSummary } from "@/lib/ingest-queue"

export type IngestQueueSummary = ReturnType<typeof getQueueSummary>

/** A stopped task has finished running, but has not successfully ingested. */
export function getIngestQueueStatus(summary: IngestQueueSummary) {
  const state = summary.blockedOnLlmConfig ? "blocked"
    : summary.userPaused ? "paused"
    : summary.processing > 0 ? "processing"
    : summary.pending > 0 ? "queued"
    : summary.failed + summary.cancelled > 0 ? "stopped"
    : "done"
  const total = Math.max(summary.total, 1)
  return {
    state,
    active: state === "processing" || state === "queued",
    completedPercent: summary.completed / total * 100,
    failedPercent: summary.failed / total * 100,
    cancelledPercent: summary.cancelled / total * 100,
  }
}
