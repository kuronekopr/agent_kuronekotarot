import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { AGENT_C_COMMUNITY_PROMPT } from "../prompts";

// Agent C: Community Node
export const communityNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = AGENT_C_COMMUNITY_PROMPT;

    // Extract UGC from state or fallback (for testing without full graph flow)
    const lastMessage = state.messages[state.messages.length - 1];
    const inputContent = typeof lastMessage.content === "string" ? lastMessage.content : "ユーザー投稿: 『今日黒猫タロット引いたら死神だった...怖』";

    const jsonInstruction = \`
    IMPORTANT: Analyze the user input and output ONLY a valid JSON object matching this structure:
    {
      "sentiment": "positive" | "neutral" | "negative" | "emergency",
      "category": "question" | "feedback" | "sharing_result" | "complaint",
      "risk_score": number (1-10, 10 is immediate danger),
      "draft_reply": "string (The reply text from Kuroneko)"
    }
    If risk_score is >= 8, draft_reply should be a supportive, safety-first message (or suggestion to seek help), avoiding playful tone.
    Do not wrap in markdown code blocks.
    \`;

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt + jsonInstruction),
            new HumanMessage(\`以下のUGCを分析し、返信を作成してください: \${inputContent}\`),
            ...state.messages
        ]);

        const text = typeof response.content === "string" ? response.content : "";
        const cleanText = text.replace(/\\\`\\\`\\\`json/g, "").replace(/\\\`\\\`\\\`/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return {
            messages: [new AIMessage(JSON.stringify(parsed, null, 2))],
            // We could store this in a specific state field if needed, but for now generic message is fine or maybe 'community_report'
            // For now, let's just log it in messages for the supervisor.
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
