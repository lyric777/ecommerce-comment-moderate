// textWorker.ts
import { z } from "zod";
import { ReviewGraphState } from "../state.js";
import { createLLM } from "../../utils/llmFactory.js";

const llm = createLLM("kimi-k2-0711-preview");

export const textWorkerNode = async (state: typeof ReviewGraphState.State) => {
    console.log("Text Worker: analyzing text, context, and drafting responses if needed...");
    const { text, rating } = state.reviewPayload;

    // 1. Expanded Zod Schema for After-Sales drafting
    const textAnalysisSchema = z.object({
        isSafe: z.boolean().describe("False if text contains profanity, hate speech, or spam."),
        isMismatch: z.boolean().describe("True if sentiment strongly contradicts the numeric rating."),
        requiresAfterSales: z.boolean().describe("True if the user explicitly seeks refund, return, or technical support."),
        
        // Conditionally populated fields for after-sales
        issueSummary: z.string().optional().describe("A concise summary of the customer's problem. Only provide if requiresAfterSales is true."),
        suggestedSolution: z.string().optional().describe("The recommended internal action (e.g., issue full refund, send replacement). Only provide if requiresAfterSales is true."),
        customerServiceScript: z.string().optional().describe("A professional, empathetic email draft responding to the user. Only provide if requiresAfterSales is true."),
        
        reasoning: z.string().describe("Detailed explanation of the analysis.")
    });

    const structuredLlm = llm.withStructuredOutput(textAnalysisSchema, {
        method: "functionCalling",     
    });

    // 2. Updated Prompt
    const prompt = `
You are an expert e-commerce review moderator and senior customer support agent.
Analyze the following user review text and the provided star rating (if any).

Review Text: "${text}"
Star Rating: ${rating !== undefined ? rating : "None provided"}

Your tasks:
1. Safety: Flag any toxic, abusive, or spam content.
2. Logic Match: Determine if the text sentiment contradicts the numeric rating.
3. After-Sales Intent: Identify if the user needs customer service. 
   CRITICAL: If 'requiresAfterSales' is true, you MUST also generate:
   - 'issueSummary': A 1-sentence summary of the problem.
   - 'suggestedSolution': What our internal team should do.
   - 'customerServiceScript': A complete, polite email draft addressing the issue.
`;

    // 3. Invoke LLM
    const result = await structuredLlm.invoke(prompt);

    // 4. Construct the afterSalesDraft object if applicable
    const draft = result.requiresAfterSales 
        ? {
            summary: result.issueSummary || "No summary provided.",
            solution: result.suggestedSolution || "Review manually.",
            script: result.customerServiceScript || "Please contact support."
          } 
        : null;

    // 5. Update State
    return {
        reasoningLogs: [`[Text Worker] Safe: ${result.isSafe}, Mismatch: ${result.isMismatch}, Support Needed: ${result.requiresAfterSales}. Reason: ${result.reasoning}`],
        autoFlag: result.isMismatch ? "mismatch" : null,
        afterSalesDraft: draft
    };
};
