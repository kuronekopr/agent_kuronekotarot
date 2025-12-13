import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MarketingOpsState } from "../state";
import { AGENT_D_ADS_PROMPT } from "../prompts";

// Agent D: Ads Node
export const adsNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = AGENT_D_ADS_PROMPT;

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage("次のキャンペーンに向けた広告コピー案を出してください。"),
        ...state.messages
    ]);

    return {
        messages: [response],
        next: "supervisor",
    };
};
