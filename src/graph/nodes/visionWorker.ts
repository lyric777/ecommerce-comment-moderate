// visionWorker.ts
import { z } from "zod";
import { createLLM } from "../../utils/llmFactory.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ReviewGraphState } from "../state.js";
import axios from "axios";

const llm = createLLM("moonshot-v1-8k-vision-preview", 1);

async function fetchImageToBase64(url: string): Promise<string> {
    try {
        console.log(`[Vision Worker Helper] Fetching image data from URL: ${url}`);
        const response = await axios.get(url, {
            responseType: "arraybuffer", // Important: get the raw binary data
            timeout: 5000 // Set a reasonable timeout
        });
        
        // Convert the binary buffer to a base64 encoded string
        const base64String = Buffer.from(response.data).toString("base64");
        // Combine with the data-uri standard prefix
        // (Assuming jpeg for simplicity, but a robust impl should check mime-type)
        return `data:image/jpeg;base64,${base64String}`;
        
    } catch (error) {
        console.error(`[Vision Worker Helper] Error fetching image from URL: ${url}`, error);
        // Throw the error so the main node can handle it
        throw new Error("Failed to fetch image data for vision analysis."); 
    }
}

export const visionWorkerNode = async (state: typeof ReviewGraphState.State) => {
    console.log("Vision Worker: analyzing image...");
    const { imageUrl } = state.reviewPayload;

    if (!imageUrl) {
        return { reasoningLogs: ["[Vision Worker] No image provided."] };
    }

    let finalImageData = imageUrl;
    
    // If it looks like a public HTTP/S URL, fetch it and convert to base64
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        try {
            finalImageData = await fetchImageToBase64(imageUrl);
        } catch (error: any) {
            // If fetching fails (e.g., DNS error, timeout), append log and let the flow continue
            return { 
                reasoningLogs: [`[Vision Worker] ERROR: Cannot analyze image. Reason: ${error.message}`] 
            };
        }
    } else if (!imageUrl.startsWith("data:image/")) {
        // Basic validation: if not a URL, must be a data URI already
        return { reasoningLogs: ["[Vision Worker] ERROR: Invalid image input format."] };
    }

    // 1. Define the Schema
    const visionAnalysisSchema = z.object({
        isSafe: z.boolean().describe("False if the image contains NSFW, violence, or inappropriate content."),
        isRelevant: z.boolean().describe("False if the image is completely unrelated to a product review."),
        reasoning: z.string().describe("Explanation of what the image contains and why it was flagged or approved.")
    });

    // 2. Enforce JSON Mode
    const structuredVisionLlm = llm.withStructuredOutput(visionAnalysisSchema, {
        method: "jsonMode"
    });

    // 3. System Prompt with strict JSON injection
    const systemPrompt = `You are an expert e-commerce image moderator.
Your tasks:
1. Determine if the image contains any unsafe or inappropriate content (NSFW, violence, illegal items).
2. Determine if the image is generally relevant to a shopping/product review context.

CRITICAL INSTRUCTION: You MUST output your response in valid JSON format.
Your JSON MUST EXACTLY match the following structure:
{{
  "isSafe": boolean,
  "isRelevant": boolean,
  "reasoning": "string (Detailed explanation)"
}}`;

    // 4. The Magic: Constructing a Multi-modal Message
    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage({
            content: [
                {
                    type: "text",
                    text: "Please analyze this image and return the required JSON."
                },
                {
                    type: "image_url",
                    image_url: {
                        url: finalImageData 
                    }
                }
            ]
        })
    ];

    // 5. Invoke the LLM with the message array
    const result = await structuredVisionLlm.invoke(messages);

    return {
        reasoningLogs: [`[Vision Worker] Safe: ${result.isSafe}, Relevant: ${result.isRelevant}. Reason: ${result.reasoning}`]
    };
};