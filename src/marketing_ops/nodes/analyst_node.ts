import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { MarketingOpsState } from "../state";

const getPrompt = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, "../../marketing_ops/prompts", filename), "utf-8");
};

// Agent B: Analyst Node
export const analystNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }); // Analytical, so temp 0
    const systemPrompt = getPrompt("agent_b_analyst.md");

    // In a real app, we would inject data here
    const mockData = "昨日(12/12)のTikTok流入: 1500PV, LP遷移率: 15%, 深夜帯(25:00)のアクセス増: 200%";

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`以下のデータを分析してください: ${mockData}`),
        ...state.messages // Context
    ]);

    return {
        messages: [response],
        report: response.content as string,
        next: "supervisor",
    };
};
