import { ChatOpenAI } from "@langchain/openai";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";
import "dotenv/config";

class TokenTracker extends BaseCallbackHandler {
    name = "TokenTracker";
    inputTokens = 0;
    outputTokens = 0;

    reset(): void {
        this.inputTokens = 0;
        this.outputTokens = 0;
    }

    get totalTokens(): number {
        return this.inputTokens + this.outputTokens;
    }

    async handleLLMEnd(output: LLMResult): Promise<void> {
        const usage = (output.llmOutput as any)?.tokenUsage ?? (output.llmOutput as any)?.usage;
        if (usage) {
            this.inputTokens += usage.promptTokens ?? usage.prompt_tokens ?? usage.input_tokens ?? 0;
            this.outputTokens += usage.completionTokens ?? usage.completion_tokens ?? usage.output_tokens ?? 0;
        }
    }
}

/** Singleton — accumulates token usage across all LLM calls in the current graph run. */
export const globalTokenTracker = new TokenTracker();

export interface CreateLLMOptions {
    modelName?: string;
    temperature?: number;
    apiKey?: string;
    baseURL?: string;
}

function resolveApiKey(explicitApiKey?: string): string {
    const apiKey = explicitApiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.MOONSHOT_API_KEY;

    if (!apiKey) {
        throw new Error(
            "No LLM API key configured. Set LLM_API_KEY (preferred), OPENAI_API_KEY, or MOONSHOT_API_KEY in your environment."
        );
    }

    return apiKey;
}

function resolveBaseURL(explicitBaseURL?: string, apiKeySource?: string): string | undefined {
    if (explicitBaseURL) {
        return explicitBaseURL;
    }

    if (process.env.LLM_API_BASEURL) {
        return process.env.LLM_API_BASEURL;
    }

    // Backward compatibility for existing Moonshot-only setups.
    if (!process.env.LLM_API_KEY && !process.env.OPENAI_API_KEY && (apiKeySource || process.env.MOONSHOT_API_KEY)) {
        return "https://api.moonshot.cn/v1";
    }

    return undefined;
}

/**
 * Factory function to create a configured ChatOpenAI-compatible client.
 * Environment variables provide defaults and explicit options override them.
 */
export function createLLM(modelNameOrOptions?: string | CreateLLMOptions, temperature?: number): ChatOpenAI {
    const options: CreateLLMOptions = typeof modelNameOrOptions === "string"
        ? {
            modelName: modelNameOrOptions,
            ...(temperature !== undefined ? { temperature } : {})
        }
        : (modelNameOrOptions ?? {});

    const modelName = options.modelName || process.env.LLM_MODEL || "kimi-k2-0711-preview";
    const resolvedTemperature = options.temperature ?? Number(process.env.LLM_TEMPERATURE ?? "0");
    const apiKey = resolveApiKey(options.apiKey);
    const baseURL = resolveBaseURL(options.baseURL, options.apiKey);

    const configuration = {
        apiKey,
        ...(baseURL ? { baseURL } : {}),
    };

    return new ChatOpenAI({
        modelName,
        openAIApiKey: apiKey,
        configuration,
        temperature: resolvedTemperature,
        callbacks: [globalTokenTracker],
    });
}

export function createLLMFromPromptConfig(modelConfig?: { model_name: string; temperature?: number }): ChatOpenAI {
    return createLLM({
        ...(modelConfig?.model_name ? { modelName: modelConfig.model_name } : {}),
        ...(modelConfig?.temperature !== undefined ? { temperature: modelConfig.temperature } : {}),
    });
}
