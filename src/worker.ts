import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Hono } from "hono";

export interface Env {
    OPENAI_API_KEY: string;
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

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
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .pending { background-color: #fff3cd; }
                    .approved { background-color: #d4edda; }
                </style>
            </head>
            <body>
                <h1>🖤 Black Cat Ops Dashboard</h1>
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

            // Extract Creative Content if available (adapting to state structure)
            const creativeJson = (result as any).creative_content;

            if (creativeJson) {
                const content = JSON.parse(creativeJson);

                // Content might be an array or single object. Handle both if possible, or assume single for now.
                const items = Array.isArray(content) ? content : [content];

                for (const item of items) {
                    const platform = item.platform || "Unknown";
                    const title = item.title || "No Title";

                    await env.DB.prepare(
                        "INSERT INTO contents (platform, title, body, status) VALUES (?, ?, ?, ?)"
                    ).bind(platform, title, JSON.stringify(item), 'pending').run();
                }

                console.log(`Saved ${items.length} items to D1.`);
            } else {
                console.log("No creative content generated to save.");
            }

        } catch (e: any) {
            console.error("Worker Execution Error:", e.message);
        }
    },
};
