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
        CREATE TABLE IF NOT EXISTS warnings (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id  TEXT NOT NULL,
            user_id   TEXT NOT NULL,
            mod_id    TEXT NOT NULL,
            reason    TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS inventory (
            guild_id  TEXT NOT NULL,
            user_id   TEXT NOT NULL,
            item      TEXT NOT NULL,
            quantity  INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (guild_id, user_id, item)
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
            async getLeaderboard(guildId, limit = 10) {
                return db.prepare(`
                    SELECT key, value FROM economy
                    WHERE key LIKE ?
                    ORDER BY value DESC
                    LIMIT ?
                `).all(`money_${guildId}_%`, limit);
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
        warnings: {
            async add(guildId, userId, modId, reason) {
                db.prepare(`
                    INSERT INTO warnings (guild_id, user_id, mod_id, reason, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                `).run(guildId, userId, modId, reason, Date.now());
            },
            async get(guildId, userId) {
                return db.prepare(`
                    SELECT * FROM warnings
                    WHERE guild_id = ? AND user_id = ?
                    ORDER BY timestamp DESC
                `).all(guildId, userId);
            },
            async remove(id) {
                const result = db.prepare("DELETE FROM warnings WHERE id = ?").run(id);
                return result.changes > 0;
            },
            async clear(guildId, userId) {
                db.prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?")
                    .run(guildId, userId);
            },
        },
        inventory: {
            async get(guildId, userId) {
                return db.prepare(`
                    SELECT item, quantity FROM inventory
                    WHERE guild_id = ? AND user_id = ?
                    ORDER BY item ASC
                `).all(guildId, userId);
            },
            async add(guildId, userId, item, quantity = 1) {
                db.prepare(`
                    INSERT INTO inventory (guild_id, user_id, item, quantity) VALUES (?, ?, ?, ?)
                    ON CONFLICT(guild_id, user_id, item) DO UPDATE SET quantity = quantity + excluded.quantity
                `).run(guildId, userId, item, quantity);
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
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS warnings (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                guild_id  VARCHAR(20) NOT NULL,
                user_id   VARCHAR(20) NOT NULL,
                mod_id    VARCHAR(20) NOT NULL,
                reason    TEXT NOT NULL,
                timestamp BIGINT NOT NULL,
                INDEX idx_guild_user (guild_id, user_id)
            )
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS inventory (
                guild_id  VARCHAR(20) NOT NULL,
                user_id   VARCHAR(20) NOT NULL,
                item      VARCHAR(100) NOT NULL,
                quantity  INT NOT NULL DEFAULT 1,
                PRIMARY KEY (guild_id, user_id, item)
            )
        `);
    }

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
            async getLeaderboard(guildId, limit = 10) {
                const safeLimit = Math.max(1, Math.min(100, parseInt(limit)));
                const [rows] = await pool.execute(
                    `SELECT \`key\`, value FROM economy
                     WHERE \`key\` LIKE ?
                     ORDER BY value DESC LIMIT ${safeLimit}`,
                    [`money_${guildId}_%`]
                );
                return rows;
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
        warnings: {
            async add(guildId, userId, modId, reason) {
                await pool.execute(
                    `INSERT INTO warnings (guild_id, user_id, mod_id, reason, timestamp)
                     VALUES (?, ?, ?, ?, ?)`,
                    [guildId, userId, modId, reason, Date.now()]
                );
            },
            async get(guildId, userId) {
                const [rows] = await pool.execute(
                    `SELECT * FROM warnings
                     WHERE guild_id = ? AND user_id = ?
                     ORDER BY timestamp DESC`,
                    [guildId, userId]
                );
                return rows;
            },
            async remove(id) {
                const [result] = await pool.execute(
                    "DELETE FROM warnings WHERE id = ?", [id]
                );
                return result.affectedRows > 0;
            },
            async clear(guildId, userId) {
                await pool.execute(
                    "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?",
                    [guildId, userId]
                );
            },
        },
        inventory: {
            async get(guildId, userId) {
                const [rows] = await pool.execute(
                    `SELECT item, quantity FROM inventory
                     WHERE guild_id = ? AND user_id = ?
                     ORDER BY item ASC`,
                    [guildId, userId]
                );
                return rows;
            },
            async add(guildId, userId, item, quantity = 1) {
                await pool.execute(
                    `INSERT INTO inventory (guild_id, user_id, item, quantity) VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
                    [guildId, userId, item, quantity]
                );
            },
        },
    };
}

// ── Export the right adapter ──────────────────────────────────────────────────
const type = database?.type?.toLowerCase();

if (type === "mysql") {
    console.log("[DB] Using MySQL/MariaDB adapter.");
    module.exports = buildMySQLAdapter();
} else if (type === "sqlite" || !type) {
    console.log("[DB] Using SQLite adapter.");
    module.exports = buildSQLiteAdapter();
} else {
    throw new Error(`[DB] Unknown database type "${type}" in config.json. Expected "sqlite" or "mysql".`);
}