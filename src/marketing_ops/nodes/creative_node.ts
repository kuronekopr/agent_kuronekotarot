import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { MarketingOpsState } from "../state";
import { z } from "zod";

// Helper to read prompt files
const getPrompt = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, "../../marketing_ops/prompts", filename), "utf-8");
};

// Schema for Creative Output
const creativeSchema = z.object({
    platform: z.enum(["tiktok", "instagram", "x"]).describe("The target platform for the content"),
    title: z.string().describe("Title or main hook of the content"),
    content: z.string().describe("The main caption, body text, or post content"),
    script: z.array(z.object({
        speaker: z.string(),
        text: z.string(),
        visual_cue: z.string().optional()
    })).optional().describe("For TikTok: The video script lines"),
    visual_description: z.string().optional().describe("Description of the image/video visual for generation"),
    hashtags: z.array(z.string()).describe("List of hashtags"),
});

// Agent A: Creative Node
export const creativeNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });

    // Fallback approach: Explicit JSON prompting
    const systemPrompt = getPrompt("agent_a_creative.md");
    const lastMessage = state.messages[state.messages.length - 1];

    const jsonInstruction = `
    IMPORTANT: Output ONLY a valid JSON object matching this structure:
    {
      "platform": "tiktok" | "instagram" | "x",
      "title": "string",
      "content": "string",
      "script": [ { "speaker": "string", "text": "string" } ] (optional, for tiktok),
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
