import { graph } from "./marketing_ops/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Hono } from "hono";

export interface Env {
    OPENAI_API_KEY: string;
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to save creative content to D1
async function saveContentToD1(db: D1Database, result: any) {
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

// Helper to save interaction to D1 (New for Reply System)
async function saveInteractionToD1(db: D1Database, result: any, originalComment: string) {
    const communityJson = (result as any).community_content;

    if (communityJson) {
        let data;
        try {
            data = JSON.parse(communityJson);
        } catch (e) {
            console.error("Failed to parse community content JSON", e);
            return false;
        }

        // Check if it's the expected Tarot Reply format
        if (data.reply_text) {
            await db.prepare(
                "INSERT INTO interactions (platform, user_comment, mood, selected_card, reply_text) VALUES (?, ?, ?, ?, ?)"
            ).bind(
                'tiktok',
                originalComment,
                data.mood_analysis || 'Unknown',
                data.selected_card || 'None',
                data.reply_text
            ).run();
            return true;
        }
    }
    return false;
}

// --- Dashboard UI (Server-Side Rendered HTML) ---
app.get("/", async (c) => {
    try {
        const content_stmt = c.env.DB.prepare("SELECT * FROM contents ORDER BY created_at DESC LIMIT 20");
        const interact_stmt = c.env.DB.prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT 10"); // Show recent replies

        const { results: contentRows } = await content_stmt.all();
        // If table doesn't exist yet, this might fail, so we should wrap or expect it exists
        let interactionRows: any[] = [];
        try {
            const { results } = await interact_stmt.all();
            interactionRows = results;
        } catch (e) { console.log("Interactions table might not exist yet"); }

        // Render Content Rows
        const contentHtml = contentRows.map((r: any) => `
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

        // Render Interaction Rows
        const interactionHtml = interactionRows.map((r: any) => `
            <tr>
                <td>${r.id}</td>
                <td>${r.mood || '-'}</td>
                <td>${r.selected_card || '-'}</td>
                <td>${r.user_comment}</td>
                <td><strong>${r.reply_text}</strong></td>
            </tr>
        `).join("");

        return c.html(`
            <html>
            <head>
                <title>Marketing Ops Dashboard</title>
                <style>
                    body { font-family: sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                    th { background-color: #f2f2f2; }
                    .pending { background-color: #fff3cd; }
                    .approved { background-color: #d4edda; }
                    .section { margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .trigger-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px; display: flex; gap: 10px; align-items: center; }
                    .trigger-box form { display: flex; width: 100%; gap: 10px; }
                    .trigger-box input[type="text"] { flex-grow: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                    .trigger-box button { padding: 8px 16px; background: #333; color: #fff; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
                    .trigger-box button:hover { background: #555; }
                    h2 { border-left: 5px solid #333; padding-left: 10px; margin-top: 0; }
                </style>
            </head>
            <body>
                <h1>🖤 Black Cat Ops Dashboard</h1>
                
                <div class="section">
                    <h2>💬 TikTok Reply Generator (Mood Match)</h2>
                    <div class="trigger-box" style="background: #eef2ff; border-color: #dfe7ff;">
                         <form action="/api/reply" method="post">
                            <input type="text" name="comment" placeholder="Paste user comment here... (e.g. 'This is exactly what I needed today')" required>
                            <button type="submit" style="background: #4f46e5;">Generate Reply</button>
                        </form>
                    </div>
                    
                    <h3>Recent Interactions</h3>
                    <table>
                        <tr><th>ID</th><th>Mood</th><th>Card</th><th>User Comment</th><th>Generated Reply</th></tr>
                        ${interactionHtml}
                    </table>
                </div>

                <div class="section">
                    <h2>📢 Content Manual Trigger</h2>
                    <div class="trigger-box">
                        <form action="/api/trigger" method="post">
                            <input type="text" name="instruction" placeholder="Enter instruction (e.g. 'Write a post about Full Moon energy')" required>
                            <button type="submit">Run Agent</button>
                        </form>
                    </div>

                    <h3>Pending Content</h3>
                    <table>
                        <tr><th>ID</th><th>Platform</th><th>Title</th><th>Content</th><th>Status</th><th>Actions</th></tr>
                        ${contentHtml}
                    </table>
                </div>
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

        const result = await graph.invoke({ messages: [new HumanMessage(instruction)] });
        await saveContentToD1(c.env.DB, result);

        return c.redirect("/");
    } catch (e: any) {
        return c.text(`Agent Execution Error: ${e.message}`, 500);
    }
});

app.post("/api/reply", async (c) => {
    try {
        const body = await c.req.parseBody();
        const comment = body['comment'] as string;

        if (!comment) return c.text("Comment required", 400);

        if (c.env.OPENAI_API_KEY) {
            // @ts-ignore
            process.env.OPENAI_API_KEY = c.env.OPENAI_API_KEY;
        }

        // Construct the special instruction for Reply Mode
        const instruction = "Reply to: " + comment;
        console.log(`Generating reply for: ${comment}`);

        const result = await graph.invoke({ messages: [new HumanMessage(instruction)] });

        await saveInteractionToD1(c.env.DB, result, comment);

        return c.redirect("/");
    } catch (e: any) {
        return c.text(`Reply Generation Error: ${e.message}`, 500);
    }
});

export default {
    fetch: app.fetch,

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log("Cron triggered at:", new Date(event.scheduledTime).toISOString());

        if (env.OPENAI_API_KEY) {
            // @ts-ignore
            process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
        }

        try {
            const result = await graph.invoke({
                messages: [new HumanMessage("おはよう。今日の分析とコンテンツ作成を始めて。")]
            });
            const count = await saveContentToD1(env.DB, result);
            console.log(`Saved ${count} items to D1.`);

        } catch (e: any) {
            console.error("Worker Execution Error:", e.message);
        }
    },
};
