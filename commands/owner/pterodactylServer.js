const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
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

function getDomain() {
    return (process.env.PTERODACTYL_DOMAIN ?? "").replace(/\/+$/, "");
}

function getHeaders() {
    return {
        "Accept":        "Application/vnd.pterodactyl.v1+json",
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.PTERODACTYL_API_KEY}`,
    };
}

// Generic request for a specific server
async function serverRequest(serverId, path, method = "GET", body = null) {
    const url  = `${getDomain()}/api/client/servers/${serverId}${path}`;
    const opts = { method, headers: getHeaders() };
    if (body) opts.body = JSON.stringify(body);

    const res  = await fetch(url, opts);
    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`API error ${res.status}: ${data.errors?.[0]?.detail ?? "Unknown error"}`);
    return data;
}

// Fetch all servers the API key has access to
async function listServers() {
    const res = await fetch(`${getDomain()}/api/client`, { headers: getHeaders() });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`API error ${res.status}: ${data.errors?.[0]?.detail ?? "Unknown error"}`);
    }
    const data = await res.json();
    return (data.data ?? []).map(s => ({
        name:       s.attributes.name,
        identifier: s.attributes.identifier,
        node:       s.attributes.node ?? "Unknown",
        isSuspended: s.attributes.is_suspended ?? false,
    }));
}

// Fetch server status — tries /resources, falls back to base
async function getServerStatus(serverId) {
    const headers = getHeaders();
    const resRes  = await fetch(`${getDomain()}/api/client/servers/${serverId}/resources`, { headers });

    if (resRes.ok) {
        const data = await resRes.json();
        return { state: data.attributes.current_state, resources: data.attributes.resources };
    }

    if (resRes.status === 404) {
        const baseRes = await fetch(`${getDomain()}/api/client/servers/${serverId}`, { headers });
        if (baseRes.ok) {
            const data = await baseRes.json();
            return { state: data.attributes.current_state ?? data.attributes.status ?? "unknown", resources: null };
        }
        const err = await baseRes.json().catch(() => ({}));
        throw new Error(`API error ${baseRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
    }

    const err = await resRes.json().catch(() => ({}));
    throw new Error(`API error ${resRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
}

function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms) {
    if (!ms) return "Offline";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return [h && `${h}h`, m && `${m}m`, `${s % 60}s`].filter(Boolean).join(" ");
}

// Build the action buttons for a selected server
function buildActionRow(serverId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sv_status_${serverId}`).setLabel("Status").setEmoji("📊").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sv_start_${serverId}`).setLabel("Start").setEmoji("▶️").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`sv_stop_${serverId}`).setLabel("Stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`sv_restart_${serverId}`).setLabel("Restart").setEmoji("🔄").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`sv_more_${serverId}`).setLabel("More…").setEmoji("⚙️").setStyle(ButtonStyle.Secondary),
    );
}

// Build the "more actions" row
function buildMoreRow(serverId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sv_command_${serverId}`).setLabel("Console Cmd").setEmoji("📟").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sv_backups_${serverId}`).setLabel("Backups").setEmoji("💾").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sv_backup_${serverId}`).setLabel("Create Backup").setEmoji("➕").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`sv_kill_${serverId}`).setLabel("Kill").setEmoji("💀").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`sv_reinstall_${serverId}`).setLabel("Reinstall").setEmoji("⚠️").setStyle(ButtonStyle.Danger),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Manage your game servers via the panel."),

    ownerOnly: true,

    async execute(interaction, client) {
        if (!client.config.pterodactyl?.enabled) {
            return interaction.reply({
                content: "❌ Server management is not enabled. Set `pterodactyl.enabled` to `true` in `config.json`.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const missing = ["PTERODACTYL_DOMAIN", "PTERODACTYL_API_KEY"].filter(k => !process.env[k]);
        if (missing.length) {
            return interaction.reply({
                content: `❌ Missing required environment variables: ${missing.map(k => `\`${k}\``).join(", ")}`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // ── Step 1: Fetch and display server list ─────────────────────────
            const servers = await listServers();

            if (!servers.length) {
                return interaction.editReply({ content: "❌ No servers found on your panel." });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("sv_select")
                .setPlaceholder("Select a server…")
                .addOptions(
                    servers.slice(0, 25).map(s =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(s.name)
                            .setDescription(`ID: ${s.identifier}${s.isSuspended ? " • ⚠️ Suspended" : ""}`)
                            .setValue(s.identifier)
                            .setEmoji(s.isSuspended ? "⚠️" : "🖥️")
                    )
                );

            const selectRow = new ActionRowBuilder().addComponents(selectMenu);

            const listEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle("🖥️ Server Manager")
                .setDescription(`Found **${servers.length}** server(s). Select one to manage it.`)
                .addFields(
                    servers.slice(0, 25).map(s => ({
                        name:   s.isSuspended ? `⚠️ ${s.name}` : `🖥️ ${s.name}`,
                        value:  `\`${s.identifier}\``,
                        inline: true,
                    }))
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            const msg = await interaction.editReply({ embeds: [listEmbed], components: [selectRow] });

            // ── Step 2: Handle server selection ───────────────────────────────
            const collector = msg.createMessageComponentCollector({
                filter:  i => i.user.id === interaction.user.id,
                time:    5 * 60 * 1000, // 5 min total session
            });

            collector.on("collect", async i => {
                await i.deferUpdate();

                const id = i.customId;

                // Server selected from dropdown
                if (i.componentType === ComponentType.StringSelect && id === "sv_select") {
                    const serverId   = i.values[0];
                    const server     = servers.find(s => s.identifier === serverId);
                    const serverName = server?.name ?? serverId;

                    const selectedEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setTitle(`⚙️ ${serverName}`)
                        .setDescription("Choose an action:")
                        .addFields({ name: "Server ID", value: `\`${serverId}\``, inline: true })
                        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                    return interaction.editReply({
                        embeds: [selectedEmbed],
                        components: [buildActionRow(serverId), selectRow],
                    });
                }

                // Button actions
                if (i.componentType === ComponentType.Button) {
                    const parts    = id.split("_");
                    const action   = parts[1];
                    const serverId = parts.slice(2).join("_");
                    const server   = servers.find(s => s.identifier === serverId);
                    const name     = server?.name ?? serverId;

                    try {
                        // ── STATUS ────────────────────────────────────────────
                        if (action === "status") {
                            const { state, resources } = await getServerStatus(serverId);
                            const emoji = STATE_EMOJIS[state] ?? STATE_EMOJIS.unknown;
                            const color = STATE_COLORS[state] ?? STATE_COLORS.unknown;

                            const embed = new EmbedBuilder()
                                .setColor(color)
                                .setTitle(`${emoji} ${name} — ${state.charAt(0).toUpperCase() + state.slice(1)}`)
                                .setTimestamp()
                                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                            if (resources) {
                                embed.addFields(
                                    { name: "🖥️ CPU",     value: `${resources.cpu_absolute?.toFixed(1) ?? "0"}%`, inline: true },
                                    { name: "💾 RAM",     value: formatBytes(resources.memory_bytes),             inline: true },
                                    { name: "💿 Disk",    value: formatBytes(resources.disk_bytes),               inline: true },
                                    { name: "⬆️ Upload",  value: formatBytes(resources.network_tx_bytes),         inline: true },
                                    { name: "⬇️ Download",value: formatBytes(resources.network_rx_bytes),         inline: true },
                                    { name: "⏱️ Uptime",  value: formatUptime(resources.uptime),                  inline: true },
                                );
                            }

                            return interaction.editReply({ embeds: [embed], components: [buildActionRow(serverId), selectRow] });
                        }

                        // ── MORE ACTIONS ──────────────────────────────────────
                        if (action === "more") {
                            const embed = new EmbedBuilder()
                                .setColor(client.config.embedColor)
                                .setTitle(`⚙️ ${name} — More Actions`)
                                .setDescription("⚠️ **Kill** and **Reinstall** are destructive actions. Use with caution.");

                            return interaction.editReply({ embeds: [embed], components: [buildMoreRow(serverId), selectRow] });
                        }

                        // ── POWER ACTIONS ─────────────────────────────────────
                        if (["start", "stop", "restart", "kill"].includes(action)) {
                            const SIGNAL_TEXT = {
                                start:   { action: "Starting",      emoji: "▶️",  color: "#2ecc71" },
                                stop:    { action: "Stopping",      emoji: "⏹️",  color: "#e74c3c" },
                                restart: { action: "Restarting",    emoji: "🔄",  color: "#f39c12" },
                                kill:    { action: "Force-killing", emoji: "💀",  color: "#8e44ad" },
                            };

                            const { state: currentState } = await getServerStatus(serverId);
                            const text = SIGNAL_TEXT[action];

                            if (action === "start" && currentState !== "offline") {
                                return interaction.editReply({ content: `❌ **${name}** is already **${currentState}**.`, embeds: [], components: [buildActionRow(serverId), selectRow] });
                            }
                            if (["stop", "restart", "kill"].includes(action) && currentState === "offline") {
                                return interaction.editReply({ content: `❌ **${name}** is already **offline**.`, embeds: [], components: [buildActionRow(serverId), selectRow] });
                            }

                            await serverRequest(serverId, "/power", "POST", { signal: action });

                            const embed = new EmbedBuilder()
                                .setColor(text.color)
                                .setTitle(`${text.emoji} ${name} — ${text.action}`)
                                .setDescription(`Signal \`${action}\` sent successfully.`)
                                .addFields({ name: "Previous State", value: currentState, inline: true })
                                .setTimestamp()
                                .setFooter({ text: `Executed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                            return interaction.editReply({ content: null, embeds: [embed], components: [buildActionRow(serverId), selectRow] });
                        }

                        // ── CONSOLE COMMAND ───────────────────────────────────
                        if (action === "command") {
                            const cmdEmbed = new EmbedBuilder()
                                .setColor(client.config.embedColor)
                                .setTitle(`📟 ${name} — Send Console Command`)
                                .setDescription("Reply to this message with the command to send. You have 60 seconds.");

                            await interaction.editReply({ embeds: [cmdEmbed], components: [] });

                            const msgCollector = interaction.channel.createMessageCollector({
                                filter: m => m.author.id === interaction.user.id,
                                time:   60_000,
                                max:    1,
                            });

                            msgCollector.on("collect", async m => {
                                m.delete().catch(() => {});
                                await serverRequest(serverId, "/command", "POST", { command: m.content });

                                const resultEmbed = new EmbedBuilder()
                                    .setColor(client.config.embedColor)
                                    .setTitle(`📟 ${name} — Command Sent`)
                                    .addFields({ name: "Command", value: `\`${m.content}\`` })
                                    .setTimestamp()
                                    .setFooter({ text: `Executed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                                await interaction.editReply({ embeds: [resultEmbed], components: [buildActionRow(serverId), selectRow] });
                            });

                            msgCollector.on("end", async (collected) => {
                                if (!collected.size) {
                                    await interaction.editReply({ components: [buildActionRow(serverId), selectRow] }).catch(() => {});
                                }
                            });

                            return;
                        }

                        // ── LIST BACKUPS ──────────────────────────────────────
                        if (action === "backups") {
                            const data    = await serverRequest(serverId, "/backups");
                            const backups = data?.data ?? [];

                            const embed = new EmbedBuilder()
                                .setColor(client.config.embedColor)
                                .setTitle(`💾 ${name} — Backups (${backups.length})`)
                                .setTimestamp()
                                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                            embed.setDescription(backups.length
                                ? backups.map((b, idx) => {
                                    const attr    = b.attributes;
                                    const created = `<t:${Math.floor(new Date(attr.created_at).getTime() / 1000)}:R>`;
                                    const size    = attr.bytes ? formatBytes(attr.bytes) : "In progress…";
                                    return `${attr.completed_at ? "✅" : "⏳"} **${attr.name || `Backup #${idx + 1}`}** ${attr.is_locked ? "🔒" : ""}\n${size} • ${created}`;
                                }).join("\n\n")
                                : "No backups found."
                            );

                            return interaction.editReply({ embeds: [embed], components: [buildMoreRow(serverId), selectRow] });
                        }

                        // ── CREATE BACKUP ─────────────────────────────────────
                        if (action === "backup") {
                            await serverRequest(serverId, "/backups", "POST", {});

                            const embed = new EmbedBuilder()
                                .setColor("#2ecc71")
                                .setTitle(`💾 ${name} — Backup Started`)
                                .setDescription("Backup is being created. Use **Backups** to check its status.")
                                .setTimestamp()
                                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                            return interaction.editReply({ embeds: [embed], components: [buildMoreRow(serverId), selectRow] });
                        }

                        // ── REINSTALL ─────────────────────────────────────────
                        if (action === "reinstall") {
                            const confirmRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId(`sv_reinstall_confirm_${serverId}`).setLabel("Confirm Reinstall").setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId(`sv_reinstall_cancel_${serverId}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
                            );

                            const warnEmbed = new EmbedBuilder()
                                .setColor("#e74c3c")
                                .setTitle(`⚠️ Confirm Reinstall — ${name}`)
                                .setDescription("**This will wipe all server files.** Make sure you have a backup.\n\nYou have 30 seconds to confirm.");

                            return interaction.editReply({ embeds: [warnEmbed], components: [confirmRow] });
                        }

                        if (action === "reinstall" && parts[2] === "confirm") {
                            await serverRequest(serverId, "/settings/reinstall", "POST");

                            const embed = new EmbedBuilder()
                                .setColor("#e74c3c")
                                .setTitle(`🔄 ${name} — Reinstalling`)
                                .setDescription("Server is being reinstalled. This may take a few minutes.")
                                .setTimestamp()
                                .setFooter({ text: `Executed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                            return interaction.editReply({ embeds: [embed], components: [selectRow] });
                        }

                        if (action === "reinstall" && parts[2] === "cancel") {
                            return interaction.editReply({
                                embeds: [new EmbedBuilder().setColor("#95a5a6").setDescription("❌ Reinstall cancelled.")],
                                components: [buildMoreRow(serverId), selectRow],
                            });
                        }

                    } catch (err) {
                        console.error("[SERVER]", err);
                        return interaction.editReply({ content: `❌ ${err.message}`, embeds: [], components: [buildActionRow(serverId), selectRow] });
                    }
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error("[SERVER]", err);
            return interaction.editReply({ content: `❌ ${err.message}` });
        }
    },
};