import { z } from "zod";
import { ReviewGraphState } from "../state.js";
import { createLLM } from "../../utils/llmFactory.js";

const llm = createLLM("kimi-k2-0711-preview");

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

    const prompt = `
You are a customer sentiment analysis expert. 
The user forgot to leave a numeric star rating (1 to 5) for their order. 

Based strictly on the sentiment and descriptive words in the following review text, infer the most logical star rating.
Review Text: "${text}"

Rules:
- 5: Extremely satisfied, highly recommend, perfect.
- 4: Very good, minor flaws.
- 3: Average, neutral, okay.
- 2: Disappointed, below expectations.
- 1: Angry, completely broken, terrible experience.
`;

    const result = await structuredImputationLlm.invoke(prompt);

    return { 
        reasoningLogs: [`[Imputation Worker] Inferred Score: ${result.inferredScore}. Reason: ${result.reasoning}`],
        inferredScore: result.inferredScore
    };
};