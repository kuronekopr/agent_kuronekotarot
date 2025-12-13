import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { AGENT_C_COMMUNITY_PROMPT } from "../prompts";
import { TAROT_CARDS } from "../tarot_data";

// Agent C: Community Node
export const communityNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = AGENT_C_COMMUNITY_PROMPT;

    // Check if we are in "Manual Reply Mode"
    // Look for the original trigger message in history
    const replyMessage = state.messages.find(m =>
        m instanceof HumanMessage && typeof m.content === "string" && m.content.startsWith("Reply to:")
    );

    const lastMessage = state.messages[state.messages.length - 1];
    const lastContent = typeof lastMessage.content === "string" ? lastMessage.content : "";

    // 1. Tarot Selection Logic helpers
    const tarotListStr = TAROT_CARDS.join(", ");

    // 2. Define specific instruction for this turn
    // If input starts with "Reply to:", we treat it as a reply task.
    // Otherwise standard community logic (mock UGC analysis).
    let userInstruction = "";

    if (replyMessage) {
        const content = (replyMessage.content as string);
        userInstruction = `
         TASK: Analyze the following user comment and generate a reply with a Tarot reading.
         
         USER COMMENT: "${content.replace("Reply to:", "").trim()}"
         
         AVAILABLE CARDS: [${tarotListStr}]
         
         INSTRUCTIONS:
         1. Create a "Client Mood" profile based on the comment.
         2. Select ONE card from AVAILABLE CARDS that fits or heals this mood.
         3. Generate a reply.

         NOTE ON LANGUAGE:
         - If the USER COMMENT is in Japanese, the "selected_card" must use the Japanese name ONLY (e.g., "The Fool (愚者)" -> "愚者").
         - If the USER COMMENT is in Japanese, the "reply_text" must be in Japanese.
         
         IMPORTANT: Output ONLY a valid JSON object:
         {
           "mood_analysis": "string (The analyzed mood)",
           "selected_card": "string (Localized Card Name)",
           "reply_text": "string (The actual reply text for TikTok)",
           "reasoning": "string (Why this card?)"
         }
         `;
    } else {
        // Standard logic (fallback or generic UGC analysis)
        userInstruction = `
        Analyze the following UGC and generate a reply.
        UGC: "${lastContent}"
        
        IMPORTANT: Output ONLY a valid JSON object:
        {
          "sentiment": "positive" | "neutral" | "negative",
          "category": "question" | "feedback" | "sharing_result",
          "draft_reply": "string"
        }
        `;
    }

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userInstruction)
        ]);

        const text = typeof response.content === "string" ? response.content : "";
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return {
            messages: [new AIMessage(JSON.stringify(parsed, null, 2))],
            community_content: JSON.stringify(parsed, null, 2),
            next: "supervisor",
        };
    } catch (e: any) {
        console.error("Community Agent Error:", e);
        const errorData = { reply_text: "Error: " + e.message, mood_analysis: "Error", selected_card: "Error" };
        return {
            messages: [new AIMessage("Error processing community task")],
            community_content: JSON.stringify(errorData),
            next: "supervisor"
        };
    }
};
