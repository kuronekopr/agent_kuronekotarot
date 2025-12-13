import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { AGENT_B_ANALYST_PROMPT } from "../prompts";

// 1. Define Input Data Structure (Simulating API response)
interface MetricsData {
    date: string;
    tiktok_views: number;
    lp_conversion_rate: number;
    midnight_active_users: number; // 23:00-27:00
    top_card_draws: string[];
}

// 2. Mock Data Generator
const fetchMockData = (): MetricsData => {
    return {
        date: new Date().toISOString().split('T')[0],
        tiktok_views: Math.floor(Math.random() * 5000) + 1000,
        lp_conversion_rate: parseFloat((Math.random() * 0.2).toFixed(2)),
        midnight_active_users: Math.floor(Math.random() * 500) + 100,
        top_card_draws: ["The Moon", "The Hermit", "Death"].sort(() => 0.5 - Math.random()).slice(0, 2)
    };
};

// Agent B: Analyst Node
export const analystNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }); // Analytical
    const systemPrompt = AGENT_B_ANALYST_PROMPT;

    // Fetch data
    const metrics = fetchMockData();
    const metricsStr = JSON.stringify(metrics, null, 2);

    const jsonInstruction = `
    IMPORTANT: Use the provided METRICS DATA to generate a report.
    Output ONLY a valid JSON object matching this structure:
    {
        "summary": "Brief summary of the day's performance (string)",
        "insights": ["List of likely user psychological states based on card draws/time (string)"],
        "recommended_actions": ["Concrete marketing actions (string)"]
    }
    Do not wrap in markdown code blocks.
    `;

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt + jsonInstruction),
            new HumanMessage(`以下のデータを分析してください:\n${metricsStr}`),
            ...state.messages
        ]);

        const text = typeof response.content === "string" ? response.content : "";
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        return {
            messages: [new AIMessage(JSON.stringify(parsed, null, 2))],
            report: JSON.stringify(parsed, null, 2), // meaningful state update
            next: "supervisor",
        };
    } catch (e) {
        console.error("Analyst Agent Error:", e);
        return {
            messages: [new AIMessage("Error analyzing data")],
            next: "supervisor"
        };
    }
};
