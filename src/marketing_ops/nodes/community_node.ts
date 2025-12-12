import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { MarketingOpsState } from "../state";

const getPrompt = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, "../../marketing_ops/prompts", filename), "utf-8");
};

// Agent C: Community Node
export const communityNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = getPrompt("agent_c_community.md");

    const mockUGC = "ユーザー投稿: 『今日黒猫タロット引いたら死神だった...怖』";

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`以下のUGCへの返信案を作成してください: ${mockUGC}`),
        ...state.messages
    ]);

    return {
        messages: [response],
        next: "supervisor",
    };
};
