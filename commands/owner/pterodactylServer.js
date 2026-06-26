const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require("discord.js");

const STATE_COLORS = {
    running:  "#2ecc71",
    starting: "#f39c12",
    stopping: "#e67e22",
    offline:  "#e74c3c",
    unknown:  "#95a5a6",
};

const STATE_EMOJIS = {
    running:  "🟢",
    starting: "🟡",
    stopping: "🟠",
    offline:  "🔴",
    unknown:  "⚫",
};

// Strip trailing slash from domain
function getDomain() {
    return (process.env.PTERODACTYL_DOMAIN ?? "").replace(/\/+$/, "");
}

function getServerId() {
    return process.env.PTERODACTYL_SERVER_ID;
}

// Standard request headers
function getHeaders() {
    return {
        "Accept":        "Application/vnd.pterodactyl.v1+json",
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.PTERODACTYL_API_KEY}`,
    };
}

// Generic API request helper
async function apiRequest(path, method = "GET", body = null) {
    const url = `${getDomain()}/api/client/servers/${getServerId()}${path}`;
    const opts = { method, headers: getHeaders() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    // 204 No Content — success with no body
    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${data.errors?.[0]?.detail ?? "Unknown error"}`);
    }
    return data;
}

// Fetch server status — tries /resources, falls back to base endpoint
async function getServerStatus() {
    const headers = getHeaders();
    const resourcesUrl = `${getDomain()}/api/client/servers/${getServerId()}/resources`;
    console.log("[SERVER] Fetching:", resourcesUrl);
    const resRes = await fetch(resourcesUrl, { headers });
    console.log("[SERVER] /resources status:", resRes.status);

    if (resRes.ok) {
        const data = await resRes.json();
        return { state: data.attributes.current_state, resources: data.attributes.resources };
    }

    if (resRes.status === 404) {
        const baseRes = await fetch(`${getDomain()}/api/client/servers/${getServerId()}`, { headers });
        if (baseRes.ok) {
            const data = await baseRes.json();
            return {
                state: data.attributes.current_state ?? data.attributes.status ?? "unknown",
                resources: null,
            };
        }
        const err = await baseRes.json().catch(() => ({}));
        throw new Error(`API error ${baseRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
    }

    const err = await resRes.json().catch(() => ({}));
    throw new Error(`API error ${resRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms) {
    if (!ms) return "Offline";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Manage the game server via the panel.")
        // ── Power ──────────────────────────────────────────────────────────────
        .addSubcommand(sub => sub.setName("status").setDescription("Check the current server status and resource usage."))
        .addSubcommand(sub => sub.setName("start").setDescription("Start the server."))
        .addSubcommand(sub => sub.setName("stop").setDescription("Stop the server gracefully."))
        .addSubcommand(sub => sub.setName("restart").setDescription("Restart the server."))
        .addSubcommand(sub => sub.setName("kill").setDescription("Force-kill the server process immediately."))
        // ── Console ────────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName("command")
                .setDescription("Send a command to the server console.")
                .addStringOption(o =>
                    o.setName("command").setDescription("Command to run (without /)").setRequired(true)
                )
        )
        // ── Backups ────────────────────────────────────────────────────────────
        .addSubcommand(sub => sub.setName("backups").setDescription("List all server backups."))
        .addSubcommand(sub =>
            sub
                .setName("backup")
                .setDescription("Create a new server backup.")
                .addStringOption(o =>
                    o.setName("name").setDescription("Backup name (optional)")
                )
                .addBooleanOption(o =>
                    o.setName("locked").setDescription("Lock the backup to prevent deletion (default: false)")
                )
        )
        // ── Reinstall ──────────────────────────────────────────────────────────
        .addSubcommand(sub => sub.setName("reinstall").setDescription("⚠️ Reinstall the server. This will wipe server files.")),

    ownerOnly: true,

    async execute(interaction, client) {
        // Feature flag check
        if (!client.config.pterodactyl?.enabled) {
            return interaction.reply({
                content: "❌ The server management feature is not enabled. Set `pterodactyl.enabled` to `true` in `config.json`.",
                flags: MessageFlags.Ephemeral,
            });
        }

        // Env vars check
        const missing = ["PTERODACTYL_DOMAIN", "PTERODACTYL_API_KEY", "PTERODACTYL_SERVER_ID"]
            .filter(k => !process.env[k]);
        if (missing.length) {
            return interaction.reply({
                content: `❌ Missing required environment variables: ${missing.map(k => `\`${k}\``).join(", ")}`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub        = interaction.options.getSubcommand();
        const serverName = client.config.pterodactyl.serverName ?? "Game Server";

        try {
            // ── STATUS ─────────────────────────────────────────────────────────
            if (sub === "status") {
                const { state, resources } = await getServerStatus();
                const emoji = STATE_EMOJIS[state] ?? STATE_EMOJIS.unknown;
                const color = STATE_COLORS[state] ?? STATE_COLORS.unknown;

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`${emoji} ${serverName} — ${state.charAt(0).toUpperCase() + state.slice(1)}`)
                    .setTimestamp()
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                if (resources) {
                    embed.addFields(
                        { name: "🖥️ CPU",      value: `${resources.cpu_absolute.toFixed(1)}%`,       inline: true },
                        { name: "💾 RAM",      value: formatBytes(resources.memory_bytes),            inline: true },
                        { name: "💿 Disk",     value: formatBytes(resources.disk_bytes),             inline: true },
                        { name: "⬆️ Network",  value: formatBytes(resources.network_tx_bytes),       inline: true },
                        { name: "⬇️ Network",  value: formatBytes(resources.network_rx_bytes),       inline: true },
                        { name: "⏱️ Uptime",   value: formatUptime(resources.uptime),                inline: true },
                    );
                } else {
                    embed.addFields({ name: "Server ID", value: `\`${getServerId()}\``, inline: true });
                }

                return interaction.editReply({ embeds: [embed] });
            }

            // ── POWER ACTIONS ──────────────────────────────────────────────────
            if (["start", "stop", "restart", "kill"].includes(sub)) {
                const SIGNAL_TEXT = {
                    start:   { action: "Starting",     emoji: "▶️",  color: "#2ecc71" },
                    stop:    { action: "Stopping",     emoji: "⏹️",  color: "#e74c3c" },
                    restart: { action: "Restarting",   emoji: "🔄",  color: "#f39c12" },
                    kill:    { action: "Force-killing", emoji: "💀", color: "#8e44ad" },
                };

                const { state: currentState } = await getServerStatus();
                const text = SIGNAL_TEXT[sub];

                if (sub === "start" && currentState !== "offline") {
                    return interaction.editReply({ content: `❌ Server is already **${currentState}**.` });
                }
                if (["stop", "restart", "kill"].includes(sub) && currentState === "offline") {
                    return interaction.editReply({ content: "❌ Server is already **offline**." });
                }

                await apiRequest("/power", "POST", { signal: sub });

                const embed = new EmbedBuilder()
                    .setColor(text.color)
                    .setTitle(`${text.emoji} ${serverName} — ${text.action}`)
                    .setDescription(`Signal \`${sub}\` sent successfully.`)
                    .addFields({ name: "Previous State", value: currentState, inline: true })
                    .setTimestamp()
                    .setFooter({
                        text: `Executed by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                return interaction.editReply({ embeds: [embed] });
            }

            // ── COMMAND ────────────────────────────────────────────────────────
            if (sub === "command") {
                const command = interaction.options.getString("command");

                await apiRequest("/command", "POST", { command });

                const embed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle("📟 Command Sent")
                    .addFields({ name: "Command", value: `\`${command}\`` })
                    .setTimestamp()
                    .setFooter({
                        text: `Executed by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                return interaction.editReply({ embeds: [embed] });
            }

            // ── BACKUPS LIST ───────────────────────────────────────────────────
            if (sub === "backups") {
                const data = await apiRequest("/backups");
                const backups = data?.data ?? [];

                const embed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`💾 ${serverName} — Backups (${backups.length})`)
                    .setTimestamp()
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                if (!backups.length) {
                    embed.setDescription("No backups found.");
                } else {
                    embed.setDescription(
                        backups.map((b, i) => {
                            const attr       = b.attributes;
                            const created    = `<t:${Math.floor(new Date(attr.created_at).getTime() / 1000)}:R>`;
                            const size       = attr.bytes ? formatBytes(attr.bytes) : "In progress...";
                            const lock       = attr.is_locked ? "🔒" : "";
                            const completed  = attr.completed_at ? "✅" : "⏳";
                            return `${completed} **${attr.name || `Backup #${i + 1}`}** ${lock}\nSize: ${size} • Created: ${created}`;
                        }).join("\n\n")
                    );
                }

                return interaction.editReply({ embeds: [embed] });
            }

            // ── BACKUP CREATE ──────────────────────────────────────────────────
            if (sub === "backup") {
                const name   = interaction.options.getString("name") ?? null;
                const locked = interaction.options.getBoolean("locked") ?? false;

                const body = {};
                if (name)   body.name    = name;
                if (locked) body.is_locked = locked;

                const data = await apiRequest("/backups", "POST", body);
                const attr = data?.attributes;

                const embed = new EmbedBuilder()
                    .setColor("#2ecc71")
                    .setTitle("💾 Backup Started")
                    .setDescription("The backup is being created. Use `/server backups` to check its status.")
                    .addFields(
                        { name: "Name",   value: attr?.name ?? "Auto-generated", inline: true },
                        { name: "Locked", value: locked ? "Yes 🔒" : "No",       inline: true },
                    )
                    .setTimestamp()
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                return interaction.editReply({ embeds: [embed] });
            }

            // ── REINSTALL ──────────────────────────────────────────────────────
            if (sub === "reinstall") {
                // Confirmation step — require button press to proceed
                const confirmEmbed = new EmbedBuilder()
                    .setColor("#e74c3c")
                    .setTitle("⚠️ Confirm Reinstall")
                    .setDescription(
                        `**This will wipe all server files and reinstall from scratch.**\n\n` +
                        `Make sure you have a backup before proceeding.\n\n` +
                        `You have 30 seconds to confirm.`
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("reinstall_confirm")
                        .setLabel("Confirm Reinstall")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("reinstall_cancel")
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary),
                );

                const msg = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

                const collector = msg.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    filter: i => i.user.id === interaction.user.id,
                    time: 30_000,
                    max: 1,
                });

                collector.on("collect", async btn => {
                    await btn.deferUpdate();

                    if (btn.customId === "reinstall_cancel") {
                        return interaction.editReply({
                            embeds: [new EmbedBuilder().setColor("#95a5a6").setDescription("❌ Reinstall cancelled.")],
                            components: [],
                        });
                    }

                    await apiRequest("/settings/reinstall", "POST");

                    const embed = new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setTitle("🔄 Reinstall Initiated")
                        .setDescription("The server is being reinstalled. This may take a few minutes.")
                        .setTimestamp()
                        .setFooter({
                            text: `Executed by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL(),
                        });

                    await interaction.editReply({ embeds: [embed], components: [] });
                });

                collector.on("end", async (collected) => {
                    if (collected.size === 0) {
                        await interaction.editReply({
                            embeds: [new EmbedBuilder().setColor("#95a5a6").setDescription("⏰ Reinstall confirmation timed out.")],
                            components: [],
                        }).catch(() => {});
                    }
                });

                return;
            }

        } catch (err) {
            console.error("[SERVER]", err);
            return interaction.editReply({ content: `❌ ${err.message}` });
        }
    },
};