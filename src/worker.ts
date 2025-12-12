import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";

export interface Env {
    OPENAI_API_KEY: string;
}

export default {
    // Scheduled Event Handler (Cron)
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log("Cron triggered at:", new Date(event.scheduledTime).toISOString());

        // Inject API Key into process.env for LangChain (Adaptation for Worker environment)
        // Note: In Cloudflare Workers, process.env is not standard, but Node compatibility mode helps.
        // Ideally, we pass it to the model constructor, but our nodes initialize internal models.
        // A hacky but effective way in Workers with node_compat is setting global process.env or just ensuring the ENV var is picked up.
        // If node_compat=true, process.env usually works if bindings are set.
        if (env.OPENAI_API_KEY) {
            // @ts-ignore
            process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        }

        // Define the Daily Routine Trigger
        const inputs = {
            messages: [new HumanMessage("おはよう。今日の分析とコンテンツ作成を始めて。")],
        };

        try {
            const result = await graph.invoke(inputs);
            console.log("Daily Routine Complete");
            // In a real app, we would POST the results to Slack/Discord here.
            const lastMsg = result.messages[result.messages.length - 1];
            console.log("Final Output:", lastMsg.content);

        } catch (e: any) {
            console.error("Worker Execution Error:", e.message);
        }
    },

    // Manual HTTP Handler
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        return new Response("Agent Marketing Ops is running. Use Cron Trigger to execute tasks.", { status: 200 });
    },
};
