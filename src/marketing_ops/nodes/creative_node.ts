import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { MarketingOpsState } from "../state";

// Helper to read prompt files
const getPrompt = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, "../../marketing_ops/prompts", filename), "utf-8");
};

// Agent A: Creative Node
export const creativeNode = async (state: MarketingOpsState) => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0.7 });
    const systemPrompt = getPrompt("agent_a_creative.md");

    // Last message typically contains the directive from Master
    const lastMessage = state.messages[state.messages.length - 1];

    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        lastMessage
    ]);

    return {
        messages: [response],
        creative_content: response.content as string,
        next: "supervisor", // Return to supervisor for review
    };
};
