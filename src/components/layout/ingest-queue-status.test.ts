import { describe, expect, it } from "vitest"
import { getIngestQueueStatus, type IngestQueueSummary } from "./ingest-queue-status"

const base: IngestQueueSummary = {
  pending: 0, processing: 0, failed: 0, cancelled: 0, completed: 0,
  total: 0, paused: false, userPaused: false, blockedOnLlmConfig: false,
}

describe("ingest queue presentation", () => {
  it("does not present failures and cancellations as successful ingestion", () => {
    const status = getIngestQueueStatus({ ...base, total: 8, completed: 3, failed: 2, cancelled: 1, pending: 2 })
    expect(status).toMatchObject({ completedPercent: 37.5, failedPercent: 25, cancelledPercent: 12.5, active: true })
  })

  it("does not animate a queue blocked on missing configuration", () => {
    expect(getIngestQueueStatus({ ...base, total: 2, pending: 2, blockedOnLlmConfig: true }))
      .toMatchObject({ state: "blocked", active: false })
  })

  it("shows pause immediately even while an aborted worker is settling", () => {
    expect(getIngestQueueStatus({ ...base, total: 2, processing: 1, pending: 1, userPaused: true, paused: true }))
      .toMatchObject({ state: "paused", active: false })
  })

  it.each([
    [{ total: 1, processing: 1 }, "processing", true],
    [{ total: 1, pending: 1 }, "queued", true],
    [{ total: 1, failed: 1 }, "stopped", false],
    [{ total: 1, cancelled: 1 }, "stopped", false],
    [{ total: 1, completed: 1 }, "done", false],
  ] as const)("derives status from queue facts: %j", (counts, state, active) => {
    expect(getIngestQueueStatus({ ...base, ...counts })).toMatchObject({ state, active })
  })

  it("handles an empty queue without invalid percentages", () => {
    expect(getIngestQueueStatus(base)).toMatchObject({ completedPercent: 0, failedPercent: 0, cancelledPercent: 0, active: false })
  })
})
