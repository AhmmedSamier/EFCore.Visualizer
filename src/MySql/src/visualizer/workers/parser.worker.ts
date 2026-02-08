import { PlanParser } from "@visualizer/services/plan-parser"

const parser = new PlanParser()

addEventListener("message", (event: MessageEvent<string>) => {
  const result = parser.parse(event.data)
  postMessage(result)
})
