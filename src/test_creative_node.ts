import { creativeNode } from "./marketing_ops/nodes/creative_node";
import { MarketingOpsState } from "./marketing_ops/state";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";

dotenv.config();

async function testCreative(input: string) {
    console.log(`\nTesting Input: "${input}"`);

    const mockState: MarketingOpsState = {
        messages: [new HumanMessage(input)],
        next: "creative",
        report: undefined,
        creative_content: undefined,
        review_status: "pending"
    };

    const result = await creativeNode(mockState);
    if (result.creative_content) {
        const parsed = JSON.parse(result.creative_content);
        console.log("Result (Structured):");
        console.log(JSON.stringify(parsed, null, 2));
    } else {
        console.log("No content generated.");
    }
}

async function main() {
    await testCreative("次の満月についてのTikTok動画案を作って。");
    await testCreative("「孤独」をテーマにしたInstagramの投稿画像とキャプションを作って。");
    await testCreative("深夜3時につぶやくXのポストを考えて。");
}

main().catch(console.error);
