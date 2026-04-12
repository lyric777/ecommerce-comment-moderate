import "dotenv/config";
import { reviewModerationGraph } from "../../src/graph/index.js";

interface PromptfooExecContext {
  vars?: {
    reviewPayload?: Record<string, unknown>;
  };
}

function redirectConsoleToStderr(): void {
  const write = (method: "log" | "warn" | "error") => (...args: unknown[]) => {
    const serialized = args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" ");
    process.stderr.write(`[promptfoo:${method}] ${serialized}\n`);
  };

  console.log = write("log");
  console.warn = write("warn");
  console.error = write("error");
}

async function main(): Promise<void> {
  redirectConsoleToStderr();

  const contextArg = process.argv[4];
  const parsedContext: PromptfooExecContext = contextArg ? JSON.parse(contextArg) : {};
  const reviewPayload = parsedContext.vars?.reviewPayload;

  if (!reviewPayload || typeof reviewPayload !== "object") {
    throw new Error("promptfoo runner requires vars.reviewPayload in the test case context");
  }

  const result = await reviewModerationGraph.invoke({
    reviewPayload,
  });

  process.stdout.write(JSON.stringify(result));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[promptfoo:error] ${message}\n`);
  process.exit(1);
});