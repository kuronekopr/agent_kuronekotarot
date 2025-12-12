import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";

dotenv.config();

async function runScenario(name: string, input: string) {
    console.log(`\n=== Running Scenario: ${name} ===`);
    console.log(`Input: "${input}"`);

    const inputs = {
        messages: [new HumanMessage(input)],
    };

    try {
        const stream = await graph.stream(inputs, {
            recursionLimit: 10,
        });

        for await (const event of stream) {
            // Log only the last message from the agent to keep output clean
            const keys = Object.keys(event);
            for (const key of keys) {
                if (key !== "supervisor" && (event as any)[key].messages) {
                    const agentParam = (event as any)[key];
                    const msg = agentParam.messages[agentParam.messages.length - 1];
                    console.log(`\n[${key.toUpperCase()} Output]:\n${msg.content}\n`);
                }
                if (key === "supervisor") {
                    // console.log(`[Supervisor]: Next -> ${event[key].next}`);
                }
            }
        }
    } catch (e: any) {
        console.error(`Error in ${name}:`, e.message);
    }
}

async function main() {
    // Scenario B: Analyst
    await runScenario("Agent B (Analyst)", "昨日のTikTok流入データを分析して改善案を出してください。");

    // Scenario C: Community
    await runScenario("Agent C (Community)", "ユーザー投稿:『黒猫タロット、図星すぎて怖いんだけど...』への返信を考えて。");

    // Scenario D: Ads
    await runScenario("Agent D (Ads)", "次の満月に向けたInstagramストーリー広告のコピー案を出して。");
}

main().catch(console.error);
