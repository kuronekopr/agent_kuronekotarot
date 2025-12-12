import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { MarketingOpsState } from "../state";

const getPrompt = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, "../../marketing_ops/prompts", filename), "utf-8");
};

// Agent D: Ads Node
export const adsNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = getPrompt("agent_d_ads.md");

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
