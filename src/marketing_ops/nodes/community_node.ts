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
    const lastMessage = state.messages[state.messages.length - 1];
    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";

    // 1. Tarot Selection Logic helpers
    const tarotListStr = TAROT_CARDS.join(", ");

    // 2. Define specific instruction for this turn
    // If input starts with "Reply to:", we treat it as a reply task.
    // Otherwise standard community logic (mock UGC analysis).
    let userInstruction = "";

    if (content.startsWith("Reply to:")) {
        userInstruction = `
         TASK: Analyze the following user comment and generate a reply with a Tarot reading.
         
         USER COMMENT: "${content.replace("Reply to:", "").trim()}"
         
         AVAILABLE CARDS: [${tarotListStr}]
         
         INSTRUCTIONS:
         1. Create a "Client Mood" profile based on the comment.
         2. Select ONE card from AVAILABLE CARDS that fits or heals this mood.
         3. Generate a reply.
         
         IMPORTANT: Output ONLY a valid JSON object:
         {
           "mood_analysis": "string (The analyzed mood)",
           "selected_card": "string (Exact name from the list)",
           "reply_text": "string (The actual reply text for TikTok)",
           "reasoning": "string (Why this card?)"
         }
         `;
    } else {
        // Standard logic (fallback or generic UGC analysis)
        userInstruction = `
        Analyze the following UGC and generate a reply.
        UGC: "${content}"
        
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
            // We use 'community_content' to distinguish from creative posts
            community_content: JSON.stringify(parsed, null, 2),
            next: "supervisor",
        };
    } catch (e) {
        console.error("Community Agent Error:", e);
        return {
            messages: [new AIMessage("Error processing community task")],
            next: "supervisor"
        };
    }
};
