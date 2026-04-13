const { database } = require("./config.json");

// ── SQLite adapter ────────────────────────────────────────────────────────────
function buildSQLiteAdapter() {
    const Database = require("better-sqlite3");
    const path     = require("node:path");

    const db = new Database(path.join(__dirname, "data.db"));

    db.exec(`
        CREATE TABLE IF NOT EXISTS economy (
            key   TEXT PRIMARY KEY,
            value INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS cooldowns (
            key   TEXT PRIMARY KEY,
            value INTEGER NOT NULL
        );
    `);

    return {
        economy: {
            async getBalance(guildId, userId) {
                const row = db.prepare("SELECT value FROM economy WHERE key = ?")
                    .get(`money_${guildId}_${userId}`);
                return row?.value ?? 0;
            },
            async addBalance(guildId, userId, amount) {
                db.prepare(`
                    INSERT INTO economy (key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = value + excluded.value
                `).run(`money_${guildId}_${userId}`, amount);
            },
        },
        cooldowns: {
            async get(type, guildId, userId) {
                const row = db.prepare("SELECT value FROM cooldowns WHERE key = ?")
                    .get(`${type}_${guildId}_${userId}`);
                return row?.value ?? null;
            },
            async set(type, guildId, userId, value = Date.now()) {
                if (value === 0) {
                    db.prepare("DELETE FROM cooldowns WHERE key = ?")
                        .run(`${type}_${guildId}_${userId}`);
                } else {
                    db.prepare(`
                        INSERT INTO cooldowns (key, value) VALUES (?, ?)
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value
                    `).run(`${type}_${guildId}_${userId}`, value);
                }
            },
        },
    };
}

// ── MySQL adapter ─────────────────────────────────────────────────────────────
function buildMySQLAdapter() {
    const mysql = require("mysql2/promise");

    const pool = mysql.createPool({
        host:     database.mysql.host,
        port:     database.mysql.port,
        user:     database.mysql.user,
        password: database.mysql.password,
        database: database.mysql.database,
    });

    // Create tables on first use
    async function init() {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS economy (
                \`key\`   VARCHAR(100) PRIMARY KEY,
                value    BIGINT NOT NULL DEFAULT 0
            )
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS cooldowns (
                \`key\`   VARCHAR(100) PRIMARY KEY,
                value    BIGINT NOT NULL
            )
        `);
    }

    // Fire-and-forget init — errors will surface on the first query
    init().catch(err => console.error("[DB] MySQL init error:", err));

    return {
        economy: {
            async getBalance(guildId, userId) {
                const [rows] = await pool.execute(
                    "SELECT value FROM economy WHERE `key` = ?",
                    [`money_${guildId}_${userId}`]
                );
                return rows[0]?.value ?? 0;
            },
            async addBalance(guildId, userId, amount) {
                await pool.execute(
                    `INSERT INTO economy (\`key\`, value) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE value = value + VALUES(value)`,
                    [`money_${guildId}_${userId}`, amount]
                );
            },
        },
        cooldowns: {
            async get(type, guildId, userId) {
                const [rows] = await pool.execute(
                    "SELECT value FROM cooldowns WHERE `key` = ?",
                    [`${type}_${guildId}_${userId}`]
                );
                return rows[0]?.value ?? null;
            },
            async set(type, guildId, userId, value = Date.now()) {
                if (value === 0) {
                    await pool.execute(
                        "DELETE FROM cooldowns WHERE `key` = ?",
                        [`${type}_${guildId}_${userId}`]
                    );
                } else {
                    await pool.execute(
                        `INSERT INTO cooldowns (\`key\`, value) VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
                        [`${type}_${guildId}_${userId}`, value]
                    );
                }
            },
        },
    };
}

// ── Export the right adapter based on config ──────────────────────────────────
const type = database?.type?.toLowerCase();

if (type === "mysql") {
    console.log("[DB] Using MySQL/MariaDB adapter.");
    module.exports = buildMySQLAdapter();
} else if (type === "sqlite" || !type) {
    console.log("[DB] Using SQLite adapter.");
    module.exports = buildSQLiteAdapter();
} else {
    console.error(`[DB] Unknown database type "${type}" in config.json. Expected "sqlite" or "mysql".`);
    process.exit(1);
}