import { describe, expect, test } from "vitest"
import { PlanParser } from "../plan-parser"

describe("PlanParser cleanupSource translations", () => {
  const parser = new PlanParser()

  test("removes standard English row count", () => {
    const input = `
Some Plan
(8 rows)
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("(8 rows)")
    expect(output.trim()).toBe("Some Plan")
  })

  test("removes French row count", () => {
    const input = `
Some Plan
(8 lignes)
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("(8 lignes)")
    expect(output.trim()).toBe("Some Plan")
  })

  test("removes Spanish row count", () => {
    const input = `
Some Plan
(8 filas)
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("(8 filas)")
    expect(output.trim()).toBe("Some Plan")
  })

  test("removes German row count", () => {
    const input = `
Some Plan
(8 Zeilen)
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("(8 Zeilen)")
    expect(output.trim()).toBe("Some Plan")
  })

  test("removes mixed case row count", () => {
    const input = `
Some Plan
(8 ROWS)
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("(8 ROWS)")
    expect(output.trim()).toBe("Some Plan")
  })
})

describe("PlanParser cleanupSource redundant checks", () => {
  const parser = new PlanParser()

  test("removes separator lines correctly", () => {
    const input = `
+---+
| id |
+---+
|  1 |
+---+
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("+---+")
    expect(output.trim()).toBe("id \n  1")
  })

  test("removes separator lines with dashes", () => {
      const input = `
-----------------
Some Plan
-----------------
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("-----------------")
    expect(output.trim()).toBe("Some Plan")
  })

  test("removes complex borders", () => {
      const input = `
┌─────────┐
│ Plan    │
└─────────┘
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("┌─────────┐")
    expect(output).not.toContain("└─────────┘")
    // Strips │ as well
    expect(output.trim()).toBe("Plan")
  })

  test("removes double plus lines", () => {
    const input = `
+--------+
+--------+
Content
`
    const output = parser.cleanupSource(input)
    expect(output).not.toContain("+--------+")
    expect(output.trim()).toBe("Content")
  })
})
