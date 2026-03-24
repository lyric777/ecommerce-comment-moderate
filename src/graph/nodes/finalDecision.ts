import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ReviewGraphState } from "../state.js";
import { createLLM } from "../../utils/llmFactory.js";

const llm = createLLM("kimi-k2-0711-preview");

export const finalDecisionNode = async (state: typeof ReviewGraphState.State) => {
    console.log("Final Decision: Synthesizing worker reports and making final verdict...");
    
    // 1. Extract all evidence gathered by the Supervisor and parallel Workers
    const { reasoningLogs, autoFlag, afterSalesDraft, inferredScore } = state;

    // 2. Define the exact JSON structure for the final verdict
    const finalDecisionSchema = z.object({
        finalStatus: z.enum(["approved", "rejected", "pending_review"]).describe("The ultimate outcome of the moderation workflow."),
        summaryReason: z.string().describe("A concise 1-sentence explanation synthesizing why this final status was chosen based on the evidence.")
    });

    const structuredLlm = llm.withStructuredOutput(finalDecisionSchema, {
        method: "functionCalling",     
    });

    // 3. Strictly separate System Rules from the dynamic User Data
    const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", `You are the Chief Review Moderator for an e-commerce platform.
Your job is to make the final moderation decision based ONLY on the logs and flags provided by your specialized worker agents.

Strict Rules for Final Status:
1. If the 'Auto Flag' is "supervisor_rejected", or ANY worker explicitly indicates the content is spam, high risk, NSFW, illegal, or toxic -> return "rejected".
2. If there is an 'Auto Flag' of "mismatch" OR "After-Sales Triggered" is "Yes" (meaning the user needs customer service) -> return "pending_review".
3. If all workers approved their checks and no critical flags were raised -> return "approved".

Do not hallucinate or guess. Base your decision entirely on the provided evidence.`],
        
        ["user", `Worker Reasoning Logs:
{logs}

Current System Flags:
- Auto Flag: {flag}
- Inferred Score: {score}
- After-Sales Triggered: {afterSales}`]
    ]);

    // 4. Format the dynamic data into the User Prompt
    const formattedPrompt = await promptTemplate.invoke({
        logs: reasoningLogs.length > 0 ? reasoningLogs.join("\n") : "No worker logs available.",
        flag: autoFlag || "None",
        score: inferredScore?.toString() ?? "N/A",
        afterSales: afterSalesDraft ? "Yes" : "No"
    });

    // 5. Invoke Kimi to make the final judgment
    const result = await structuredLlm.invoke(formattedPrompt);

    // 6. Update the State with the final authoritative status
    return {
        finalStatus: result.finalStatus,
        reasoningLogs: [`[Final Decision] Verdict: ${result.finalStatus}. Justification: ${result.summaryReason}`]
    };
};