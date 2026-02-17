import { describe, it, expect } from "vitest"
import { hslToRgb, numberToColorHsl, durationPercentToClass, hue2rgb } from "../color-service"

describe("color-service", () => {
  describe("hslToRgb", () => {
    it("converts achromatic colors correctly", () => {
      expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0])
      expect(hslToRgb(0, 0, 0.5)).toEqual([127, 127, 127])
      expect(hslToRgb(0, 0, 1)).toEqual([255, 255, 255])
    })

    it("converts red correctly", () => {
      expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0])
    })

    it("converts green correctly", () => {
      expect(hslToRgb(120 / 360, 1, 0.5)).toEqual([0, 255, 0])
    })

    it("converts blue correctly", () => {
      expect(hslToRgb(240 / 360, 1, 0.5)).toEqual([0, 0, 255])
    })

    it("converts various HSL combinations", () => {
      // Light blue
      expect(hslToRgb(200 / 360, 0.5, 0.5)).toEqual([63, 148, 191])
      // Dark brown
      expect(hslToRgb(30 / 360, 1, 0.2)).toEqual([102, 51, 0])
    })
  })

  describe("numberToColorHsl", () => {
    it("returns correct rgb string for 0", () => {
      // hue = (100 * 1.2) / 360 = 120 / 360 = 1/3
      // s = 0.9, l = 0.4
      // hslToRgb(1/3, 0.9, 0.4) -> q = 0.4 * 1.9 = 0.76, p = 0.8 - 0.76 = 0.04
      // r = hue2rgb(0.04, 0.76, 1/3 + 1/3) = hue2rgb(0.04, 0.76, 2/3) = 0.04
      // g = hue2rgb(0.04, 0.76, 1/3) = 0.76
      // b = hue2rgb(0.04, 0.76, 1/3 - 1/3) = hue2rgb(0.04, 0.76, 0) = 0.04
      // rgb = [0.04 * 255, 0.76 * 255, 0.04 * 255] = [10, 193, 10]
      expect(numberToColorHsl(0)).toBe("rgb(10,193,10)")
    })

    it("returns correct rgb string for 100", () => {
      // hue = 0
      // hslToRgb(0, 0.9, 0.4) -> q = 0.76, p = 0.04
      // r = hue2rgb(0.04, 0.76, 1/3) = 0.76
      // g = hue2rgb(0.04, 0.76, 0) = 0.04
      // b = hue2rgb(0.04, 0.76, -1/3) = hue2rgb(0.04, 0.76, 2/3) = 0.04
      // rgb = [193, 10, 10]
      expect(numberToColorHsl(100)).toBe("rgb(193,10,10)")
    })

    it("returns correct rgb string for 50", () => {
      // hue = (50 * 1.2) / 360 = 60 / 360 = 1/6
      expect(numberToColorHsl(50)).toBe("rgb(193,193,10)")
    })
  })

  describe("durationPercentToClass", () => {
    it("returns class 1 for i <= 10", () => {
      expect(durationPercentToClass(0)).toBe(1)
      expect(durationPercentToClass(5)).toBe(1)
      expect(durationPercentToClass(10)).toBe(1)
    })

    it("returns class 2 for 10 < i <= 40", () => {
      expect(durationPercentToClass(11)).toBe(2)
      expect(durationPercentToClass(25)).toBe(2)
      expect(durationPercentToClass(40)).toBe(2)
    })

    it("returns class 3 for 40 < i <= 90", () => {
      expect(durationPercentToClass(41)).toBe(3)
      expect(durationPercentToClass(65)).toBe(3)
      expect(durationPercentToClass(90)).toBe(3)
    })

    it("returns class 4 for i > 90", () => {
      expect(durationPercentToClass(91)).toBe(4)
      expect(durationPercentToClass(100)).toBe(4)
    })
  })

  describe("hue2rgb", () => {
    it("handles t < 0", () => {
      expect(hue2rgb(0, 1, -0.1)).toBeCloseTo(hue2rgb(0, 1, 0.9))
    })

    it("handles t > 1", () => {
      expect(hue2rgb(0, 1, 1.1)).toBeCloseTo(hue2rgb(0, 1, 0.1))
    })

    it("handles t < 1/6", () => {
      expect(hue2rgb(0, 1, 1 / 12)).toBeCloseTo(0.5)
    })

    it("handles t < 1/2", () => {
      expect(hue2rgb(0, 1, 1 / 3)).toBeCloseTo(1)
    })

    it("handles t < 2/3", () => {
      expect(hue2rgb(0, 1, 7 / 12)).toBeCloseTo(0.5)
    })

    it("handles t >= 2/3", () => {
      expect(hue2rgb(0, 1, 3 / 4)).toBeCloseTo(0)
    })
  })
})
