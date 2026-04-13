import { z } from "zod";
import { ReviewGraphState, type SpanRecord } from "../state.js";
import { createLLMFromPromptConfig, globalTokenTracker } from "../../utils/llmFactory.js";
import { STANDARD_IMPUTATION_WORKER_PROMPT } from "../../prompts/catalog.js";

const llm = createLLMFromPromptConfig(STANDARD_IMPUTATION_WORKER_PROMPT.modelConfig);

export const imputationWorkerNode = async (state: typeof ReviewGraphState.State) => {
    console.log("Imputation Worker: inferring missing score...");
    const { text } = state.reviewPayload;

    const imputationSchema = z.object({
        inferredScore: z.number().int().min(1).max(5).describe("The calculated star rating from 1 to 5."),
        reasoning: z.string().describe("Explanation of how the score was deduced from the text sentiment.")
    });

    const structuredImputationLlm = llm.withStructuredOutput(imputationSchema, {
        method: "functionCalling",     
    });

    const prompt = String(STANDARD_IMPUTATION_WORKER_PROMPT.template).replace("{{text}}", text ?? "");

    const tokensBefore = { input: globalTokenTracker.inputTokens, output: globalTokenTracker.outputTokens };
    const spanStart = Date.now();
    const result = await structuredImputationLlm.invoke(prompt);
    const spanEnd = Date.now();

    const spanRecord: SpanRecord = {
        name: "imputationWorker",
        spanType: "LLM",
        startTimeMs: spanStart,
        endTimeMs: spanEnd,
        inputs: JSON.stringify({ prompt }),
        outputs: JSON.stringify(result),
        inputTokens: globalTokenTracker.inputTokens - tokensBefore.input,
        outputTokens: globalTokenTracker.outputTokens - tokensBefore.output,
        model: STANDARD_IMPUTATION_WORKER_PROMPT.modelConfig?.model_name,
        statusCode: "OK",
    };

    return { 
        reasoningLogs: [`[Imputation Worker] Inferred Score: ${result.inferredScore}. Reason: ${result.reasoning}`],
        executedPrompts: [{ name: STANDARD_IMPUTATION_WORKER_PROMPT.name }],
        inferredScore: result.inferredScore,
        spanRecords: [spanRecord],
    };
};