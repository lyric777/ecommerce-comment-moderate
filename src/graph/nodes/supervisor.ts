import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ReviewGraphState } from "../state.js";
import { createLLMFromPromptConfig } from "../../utils/llmFactory.js";
import { globalTokenTracker } from "../../utils/llmFactory.js";
import { STANDARD_SUPERVISOR_PROMPT } from "../../prompts/catalog.js";

const llm = createLLMFromPromptConfig(STANDARD_SUPERVISOR_PROMPT.modelConfig);

export const supervisorNode = async (state: typeof ReviewGraphState.State) => {
    // Reset token tracker at the start of every new graph execution (supervisor is always first).
    globalTokenTracker.reset();
    console.log("Supervisor: Conducting semantic triage and routing...");
    
    // Support both field name conventions (content from real API, text from test)
    const text = state.reviewPayload?.content || state.reviewPayload?.text || "";
    
    if (!text || text.trim() === "") {
        console.log("Supervisor: Empty or missing review text. Treating as potential spam.");
        return {
            reasoningLogs: [`[Supervisor Triage] Category: spam. Action: short_circuit. Reason: Empty or missing review content.`],
            executedPrompts: [{ name: STANDARD_SUPERVISOR_PROMPT.name }],
            autoFlag: "supervisor_rejected"
        };
    }

    // 1. 定义大模型的输出结构（分诊结果）
    const routingSchema = z.object({
        category: z.enum(["normal", "spam", "high_risk"]).describe("The high-level category of the review text."),
        action: z.enum(["continue", "short_circuit"]).describe("If spam or high_risk, select short_circuit. Otherwise continue."),
        reason: z.string().describe("Brief reason for this triage decision.")
    });

    const structuredLlm = llm.withStructuredOutput(routingSchema, {
        method: "functionCalling",     
    });

    // 2. 手动替换模板变量（与 textWorker / imputationWorker 保持一致）
    const messages = (STANDARD_SUPERVISOR_PROMPT.template as Array<{ role: "system" | "user"; content: string }>)
        .map(m => ({ ...m, content: m.content.replace("{{text}}", text) }));

    // 3. 组装并调用大模型
    const formattedPrompt = ChatPromptTemplate.fromMessages(messages);
    const triageResult = await structuredLlm.invoke(await formattedPrompt.invoke({}));

    // 4. 将分诊结果写入 State，供图的条件路由 (Conditional Edge) 读取
    return {
        reasoningLogs: [`[Supervisor Triage] Category: ${triageResult.category}. Action: ${triageResult.action}. Reason: ${triageResult.reason}`],
        executedPrompts: [{ name: STANDARD_SUPERVISOR_PROMPT.name }],
        // 如果我们发现可以直接短路，就打个标记
        autoFlag: triageResult.action === "short_circuit" ? "supervisor_rejected" : null
    };
};
