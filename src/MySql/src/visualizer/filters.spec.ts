import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { duration } from "./filters"

describe("duration filter", () => {
  beforeEach(() => {
    // Mock toLocaleString to be deterministic across locales
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
    ) {
      return this.toString()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("formats positive duration correctly", () => {
    expect(duration(123)).toBe("123ms")
    expect(duration(1234)).toBe("1s 234ms")
    expect(duration(60000)).toBe("1m 0ms")
    expect(duration(3600000)).toBe("1h 0ms")
    expect(duration(86400000)).toBe("1d 0ms")
  })

  it("returns - for undefined", () => {
    expect(duration(undefined)).toBe("-")
  })

  it("handles negative duration by logging a warning and returning a simple string", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const result = duration(-100)
    expect(consoleSpy).toHaveBeenCalled()
    expect(result).toBe("-100ms")
    consoleSpy.mockRestore()
  })

  it("handles edge cases and exact boundaries", () => {
    expect(duration(0)).toBe("0ms")
    expect(duration(1000)).toBe("1s 0ms")
    expect(duration(60000)).toBe("1m 0ms")
    // Decimal/float milliseconds
    expect(duration(1234.56)).toBe("1s 235ms")
  })
})
