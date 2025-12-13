import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Hono } from "hono";

export interface Env {
    OPENAI_API_KEY: string;
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to save content to D1
async function saveContentToD1(db: D1Database, result: any) {
    // Extract Creative Content if available
    // Note: 'result' here is the final state from LangGraph
    const creativeJson = (result as any).creative_content;

    if (creativeJson) {
        let content;
        try {
            content = JSON.parse(creativeJson);
        } catch (e) {
            console.error("Failed to parse creative content JSON", e);
            return 0;
        }

        const items = Array.isArray(content) ? content : [content];

        for (const item of items) {
            const platform = item.platform || "Unknown";
            const title = item.title || "No Title";

            await db.prepare(
                "INSERT INTO contents (platform, title, body, status) VALUES (?, ?, ?, ?)"
            ).bind(platform, title, JSON.stringify(item), 'pending').run();
        }
        return items.length;
    }
    return 0;
}

// --- Dashboard UI (Server-Side Rendered HTML) ---
app.get("/", async (c) => {
    try {
        const { results } = await c.env.DB.prepare("SELECT * FROM contents ORDER BY created_at DESC").all();

        // Simple HTML UI
        const rows = results.map((r: any) => `
            <tr class="${r.status}">
                <td>${r.id}</td>
                <td>${r.platform}</td>
                <td>${r.title || '-'}</td>
                <td><details><summary>View Body</summary><pre>${JSON.stringify(JSON.parse(r.body), null, 2)}</pre></details></td>
                <td>${r.status}</td>
                <td>
                    ${r.status === 'pending' ? `
                    <form action="/api/approve/${r.id}" method="post" style="display:inline"><button>Approve</button></form>
                    ` : ''}
                </td>
            </tr>
        `).join("");

        return c.html(`
            <html>
            <head>
                <title>Marketing Ops Dashboard</title>
                <style>
                    body { font-family: sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .pending { background-color: #fff3cd; }
                    .approved { background-color: #d4edda; }
                    .trigger-box { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px; }
                    .trigger-box input[type="text"] { width: 70%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                    .trigger-box button { padding: 8px 16px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 4px; }
                    .trigger-box button:hover { background: #555; }
                </style>
            </head>
            <body>
                <h1>🖤 Black Cat Ops Dashboard</h1>
                
                <div class="trigger-box">
                    <h3>Manual Trigger (手動実行)</h3>
                    <form action="/api/trigger" method="post">
                        <input type="text" name="instruction" placeholder="Enter instruction (e.g. 'Write a post about Full Moon energy')" required>
                        <button type="submit">Run Agent</button>
                    </form>
                </div>

                <h3>Pending Content</h3>
                <table>
                    <tr><th>ID</th><th>Platform</th><th>Title</th><th>Content</th><th>Status</th><th>Actions</th></tr>
                    ${rows}
                </table>
            </body>
            </html>
        `);
    } catch (e: any) {
        return c.text(`Dashboard Error: ${e.message}`, 500);
    }
});

// --- API Actions ---
app.post("/api/approve/:id", async (c) => {
    const id = c.req.param("id");
    await c.env.DB.prepare("UPDATE contents SET status = 'approved' WHERE id = ?").bind(id).run();
    return c.redirect("/");
});

app.post("/api/trigger", async (c) => {
    try {
        const body = await c.req.parseBody();
        const instruction = body['instruction'] as string;

        if (!instruction) return c.text("Instruction required", 400);

        if (c.env.OPENAI_API_KEY) {
            // @ts-ignore
            process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY;
        }

        const inputs = {
            messages: [new HumanMessage(instruction)],
        };

        console.log(`Manual trigger with instruction: ${instruction}`);
        const result = await graph.invoke(inputs);

        await saveContentToD1(c.env.DB, result);

        return c.redirect("/");
    } catch (e: any) {
        return c.text(`Agent Execution Error: ${e.message}`, 500);
    }
});

export default {
    fetch: app.fetch,

    // Scheduled Event Handler (Cron)
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log("Cron triggered at:", new Date(event.scheduledTime).toISOString());

        if (env.OPENAI_API_KEY) {
            // @ts-ignore
            process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        }

        const inputs = {
            messages: [new HumanMessage("おはよう。今日の分析とコンテンツ作成を始めて。")],
        };

        try {
            const result = await graph.invoke(inputs);
            const count = await saveContentToD1(env.DB, result);
            console.log(`Saved ${count} items to D1.`);

        } catch (e: any) {
            console.error("Worker Execution Error:", e.message);
        }
    },
};
