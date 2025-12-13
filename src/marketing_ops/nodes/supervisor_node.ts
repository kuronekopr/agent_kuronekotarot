import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { z } from "zod";
import { MASTER_PROMPT } from "../prompts";

// Supervisor Node (Master Agent)
// Decides which agent to call next or if the process is finished
export const supervisorNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
    const systemPrompt = MASTER_PROMPT;

    const supervisorSchema = z.object({
        next: z.enum(["creative", "analyst", "community", "ads", "FINISH"]),
        comment: z.string().optional().describe("Instructions for the next agent or summary"),
    });

    const hasFinished = state.messages.length > 10; // Simple guardrail
    if (hasFinished) {
        return { next: "FINISH" };
    }

    // CHECK FOR SHORTCUTS (Manual Triggers)
    const firstMessage = state.messages.length > 0 ? state.messages[0] : null;
    const firstContent = firstMessage && typeof firstMessage.content === "string" ? firstMessage.content : "";

    // If the instruction is literally about "Reply to:", route to community directly.
    if (firstContent.startsWith("Reply to:")) {
        // Prevent infinite loop: If we already have the result, FINISH.
        if (state.community_content) {
            console.log("Supervisor: Reply Task completed, finishing.");
            return { next: "FINISH" };
        }

        console.log("Supervisor: Detected Reply Task, routing to Community.");
        return {
            next: "community",
            messages: [new AIMessage({ content: "[Supervisor]: Route to Community for Reply Task." })]
        };
    }

    // Fallback to JSON mode mainly for robustness against API strictness
    const response = await model.invoke([
        new SystemMessage(systemPrompt + "\n\nIMPORTANT: Respond ONLY with a valid JSON object. Format: { \"next\": \"creative\" | \"analyst\" | \"community\" | \"ads\" | \"FINISH\", \"comment\": \"reason...\" }"),
        ...state.messages,
        new HumanMessage("状況を確認し、次の指示を出してください。もし十分ならFINISHとしてください。")
    ]);

    let parsed;
    try {
        const text = typeof response.content === "string" ? response.content : "";
        // Remove markdown code blocks if present
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return { next: "FINISH" }; // Fail safe
    }

    return {
        next: parsed.next || "FINISH",
        messages: [new AIMessage({ content: `[Supervisor]: ${parsed.next} - ${parsed.comment || ''}` })]
    };
};
