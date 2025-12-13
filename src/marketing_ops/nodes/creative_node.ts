import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { z } from "zod";
import { AGENT_A_CREATIVE_PROMPT } from "../prompts";

// Agent A: Creative Node
export const creativeNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });

    // Fallback approach: Explicit JSON prompting
    const systemPrompt = AGENT_A_CREATIVE_PROMPT;
    const lastMessage = state.messages[state.messages.length - 1];

    const jsonInstruction = `
    IMPORTANT: Output ONLY a valid JSON object matching this structure:
    {
      "platform": "tiktok" | "instagram" | "x",
      "title": "string",
      "content": "string",
      "script": "string" (A single consolidated text block for TTS reading, including all lines joined by newlines),
      "visual_description": "string" (optional),
      "hashtags": ["string"]
    }
    Do not wrap in markdown code blocks.
    `;

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt + jsonInstruction),
            lastMessage
        ]);

        const text = typeof response.content === "string" ? response.content : "";
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return {
            messages: [new AIMessage(JSON.stringify(parsed, null, 2))],
            creative_content: JSON.stringify(parsed, null, 2),
            next: "supervisor",
        };
    } catch (e) {
        console.error("Creative Agent Error:", e);
        return {
            messages: [new AIMessage("Error generating content")],
            next: "supervisor"
        };
    }
};
