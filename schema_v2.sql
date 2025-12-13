CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT DEFAULT 'tiktok',
    user_comment TEXT NOT NULL,
    mood TEXT,
    selected_card TEXT,
    reply_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
