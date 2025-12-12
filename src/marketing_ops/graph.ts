import { StateGraph, END } from "@langchain/langgraph";
import { MarketingOpsStateAnnotation } from "./state";
import { creativeNode } from "./nodes/creative_node";
import { analystNode } from "./nodes/analyst_node";
import { communityNode } from "./nodes/community_node";
import { adsNode } from "./nodes/ads_node";
import { supervisorNode } from "./nodes/supervisor_node";

// Define the graph
const workflow = new StateGraph(MarketingOpsStateAnnotation)
    .addNode("supervisor", supervisorNode)
    .addNode("creative", creativeNode)
    .addNode("analyst", analystNode)
    .addNode("community", communityNode)
    .addNode("ads", adsNode)
    .addEdge("creative", "supervisor")
    .addEdge("analyst", "supervisor")
    .addEdge("community", "supervisor")
    .addEdge("ads", "supervisor")
    .addConditionalEdges(
        "supervisor",
        (state) => state.next,
        {
            creative: "creative",
            analyst: "analyst",
            community: "community",
            ads: "ads",
            FINISH: END,
        }
    );

workflow.setEntryPoint("supervisor");

// Compile
export const graph = workflow.compile();
