import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

/**
 * Factory function to create a configured ChatOpenAI instance for Moonshot API
 * @param modelName - The model identifier (e.g., "kimi-k2-0711-preview", "kimi-k2.5")
 * @param temperature - Optional temperature for randomness control (default: 0)
 * @returns Configured ChatOpenAI instance
 */
export function createLLM(modelName: string, temperature: number = 0): ChatOpenAI {
    const apiKey = process.env.MOONSHOT_API_KEY;    
    if (!apiKey) {
        throw new Error(
            "MOONSHOT_API_KEY environment variable is not set. " +
            "Please ensure your .env file contains MOONSHOT_API_KEY."
        );
    }

    return new ChatOpenAI({
        modelName,
        openAIApiKey: apiKey,
        configuration: {
            baseURL: "https://api.moonshot.cn/v1",
            apiKey: apiKey
        },
        temperature
    });
}
