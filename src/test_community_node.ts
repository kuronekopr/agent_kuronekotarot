import { communityNode } from "./marketing_ops/nodes/community_node";
import { MarketingOpsState } from "./marketing_ops/state";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";

dotenv.config();

async function testCommunity(input: string) {
    console.log(`\nTesting Input: "${input}"`);

    // Minimal mock state
    const mockState: any = {
        messages: [new HumanMessage(input)],
        next: "community"
    };

    const result = await communityNode(mockState);
    if (result.messages && result.messages.length > 0) {
        const lastMsg = result.messages[0];
        try {
            const parsed = JSON.parse(lastMsg.content as string);
            console.log("Result (Structured):");
            console.log(JSON.stringify(parsed, null, 2));
        } catch {
            console.log("Result (Raw):", lastMsg.content);
        }
    } else {
        console.log("No response generated.");
    }
}

async function main() {
    await testCommunity("黒猫タロット、図星すぎて笑ったｗ 今日も頑張れそう。");
    await testCommunity("死神のカードが出た。もう終わりだ。何もかも嫌になった。");
    await testCommunity("このアプリ、課金の仕組みがわかりにくいんだけど。");
}

main().catch(console.error);
