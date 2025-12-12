import { analystNode } from "./marketing_ops/nodes/analyst_node";
import { MarketingOpsState } from "./marketing_ops/state";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";

dotenv.config();

async function testAnalyst() {
    console.log(`\nTesting Analyst Node...`);

    // Minimal mock state
    const mockState: any = {
        messages: [],
        next: "analyst"
    };

    const result = await analystNode(mockState);
    if (result.report) {
        const parsed = JSON.parse(result.report);
        console.log("Result (Structured Report):");
        console.log(JSON.stringify(parsed, null, 2));
    } else {
        console.log("No report generated.");
    }
}

testAnalyst().catch(console.error);
