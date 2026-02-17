import { describe, it, expect, vi, afterEach } from "vitest"
import { compressPlanToUrl, decompressPlanFromUrl } from "../share-service"
import LZString from "lz-string"
import type { IPlan, IPlanContent } from "@visualizer/interfaces"

// Polyfill window for environments where it is not defined (e.g. bun test without jsdom)
if (typeof window === "undefined") {
  global.window = {
    location: {
      origin: "http://localhost",
      pathname: "/",
    } as Location,
  } as Window & typeof globalThis
}

describe("share-service", () => {
  const originalLocation = window.location

  afterEach(() => {
    vi.unstubAllEnvs()
    Object.defineProperty(window, "location", {
      configurable: true,
      enumerable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  const setupBase = (base: string) => {
    vi.stubEnv("BASE_URL", base)
  }

  const setupLocation = (pathname: string) => {
    Object.defineProperty(window, "location", {
      configurable: true,
      enumerable: true,
      value: {
        origin: "http://test.com",
        pathname: pathname,
      },
    })
  }

  const plan: [string, string, string, string] = [
    "name",
    "source",
    "query",
    new Date().toISOString(),
  ]

  describe("compressPlanToUrl", () => {
    it("handles root path", () => {
      setupBase("/")
      setupLocation("/")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/plan#plan=")
    })

    it("handles subdirectory path", () => {
      setupBase("/subdir/")
      setupLocation("/subdir/")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/plan#plan=")
    })

    it("handles subdirectory path without trailing slash", () => {
      setupBase("/subdir")
      setupLocation("/subdir")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/plan#plan=")
    })

    it("handles index.html path", () => {
      setupBase("/dist/index.html")
      setupLocation("/dist/index.html")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/dist/index.html#plan=")
    })

    it("strips path from root", () => {
      setupBase("/")
      setupLocation("/plan/123")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/plan#plan=")
    })

    it("strips path from subdirectory", () => {
      setupBase("/subdir/")
      setupLocation("/subdir/plan/123")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/plan#plan=")
    })

    it("strips /compare route", () => {
      setupBase("/subdir/")
      setupLocation("/subdir/compare/1/2")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/plan#plan=")
    })

    it("strips /about route", () => {
      setupBase("/subdir/")
      setupLocation("/subdir/about")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/plan#plan=")
    })

    it("does NOT strip partial matches like /planning", () => {
      setupBase("/planning/")
      setupLocation("/planning")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/planning/plan#plan=")
    })

    it("does NOT strip partial matches in subdirectory like /subdir/planning", () => {
      setupBase("/subdir/planning/")
      setupLocation("/subdir/planning")
      const url = compressPlanToUrl(plan)
      expect(url).toContain("http://test.com/subdir/planning/plan#plan=")
    })
  })

  describe("decompressPlanFromUrl", () => {
    it("decompresses a valid plan URL correctly", () => {
      setupBase("/")
      setupLocation("/")
      const url = compressPlanToUrl(plan)
      const decompressed = decompressPlanFromUrl(url)
      expect(decompressed).toEqual(plan)
    })

    it("returns null if URL does not contain #plan=", () => {
      const result = decompressPlanFromUrl("http://test.com/plan")
      expect(result).toBeNull()
    })

    it("returns null and logs error if decompression fails (invalid JSON)", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      // Create a compressed string that decompresses to invalid JSON
      const invalidJsonCompressed = LZString.compressToEncodedURIComponent("not json")
      const result = decompressPlanFromUrl(`http://test.com/plan#plan=${invalidJsonCompressed}`)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith("Failed to decompress plan", expect.anything())
    })

    it("returns null if hash is empty after #plan=", () => {
       const result = decompressPlanFromUrl("http://test.com/plan#plan=")
       expect(result).toBeNull()
    })

    it("returns null if decompression returns null (invalid LZString data)", () => {
       const result = decompressPlanFromUrl("http://test.com/plan#plan=invalid-lz-string-data")
       expect(result).toBeNull()
    })
  })
})
