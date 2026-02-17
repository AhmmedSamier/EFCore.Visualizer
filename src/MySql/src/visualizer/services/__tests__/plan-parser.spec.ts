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

describe("PlanParser regex parsing", () => {
  const parser = new PlanParser()

  test("parses cost range correctly", () => {
    // using fromText which uses the regex
    const input = `
-> Limit: 5 row(s)  (cost=0.00..10.00 rows=5)
`
    const output = parser.fromText(input)
    const node = output.Plan
    expect(node["Startup Cost"]).toBe(0.00)
    expect(node["Total Cost"]).toBe(10.00)
    expect(node["Plan Rows"]).toBe(5)
  })

  test("parses single cost correctly", () => {
    const input = `
-> Limit: 5 row(s)  (cost=10.00 rows=5)
`
    const output = parser.fromText(input)
    const node = output.Plan
    expect(node["Startup Cost"]).toBeUndefined()
    expect(node["Total Cost"]).toBe(10.00)
    expect(node["Plan Rows"]).toBe(5)
  })

  test("parses scientific notation correctly", () => {
    const input = `
-> Limit: 5 row(s)  (cost=1e3..2e3 rows=5)
`
    const output = parser.fromText(input)
    const node = output.Plan
    expect(node["Startup Cost"]).toBe(1000)
    expect(node["Total Cost"]).toBe(2000)
  })
})
