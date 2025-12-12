import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting Marketing Ops Graph...");

    const inputs = {
        messages: [new HumanMessage("今日のマーケティングタスクを開始してください。")],
    };

    const stream = await graph.stream(inputs, {
        recursionLimit: 50,
    });

    for await (const event of stream) {
        console.log("--- Event ---");
        console.log(JSON.stringify(event, null, 2));
    }
}

main().catch((e) => {
    console.error("An error occurred:");
    console.error(e.message);
    if (e.response) {
        console.error("Response data:", JSON.stringify(e.response.data, null, 2));
    } else {
        console.error(e);
    }
});
