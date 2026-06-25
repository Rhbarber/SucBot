const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

const STATE_COLORS = {
    running:     "#2ecc71",
    starting:    "#f39c12",
    stopping:    "#e67e22",
    offline:     "#e74c3c",
    unknown:     "#95a5a6",
};

const STATE_EMOJIS = {
    running:     "🟢",
    starting:    "🟡",
    stopping:    "🟠",
    offline:     "🔴",
    unknown:     "⚫",
};

// Build Pterodactyl API request headers
function getHeaders() {
    return {
        "Accept":        "Application/vnd.pterodactyl.v1+json",
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.PTERODACTYL_API_KEY}`,
    };
}

// Fetch current server status
// Tries /resources first (standard Pterodactyl), falls back to base server
// endpoint which some panels (e.g. Apollo) expose differently
async function getServerStatus() {
    const domain   = process.env.PTERODACTYL_DOMAIN;
    const serverId = process.env.PTERODACTYL_SERVER_ID;
    const headers  = getHeaders();

    // Try /resources endpoint first
    const resRes = await fetch(
        `${domain}/api/client/servers/${serverId}/resources`,
        { headers }
    );

    if (resRes.ok) {
        const data = await resRes.json();
        return data.attributes.current_state;
    }

    // Fall back to base server endpoint — current_state is in attributes.status
    if (resRes.status === 404) {
        const baseRes = await fetch(
            `${domain}/api/client/servers/${serverId}`,
            { headers }
        );
        if (baseRes.ok) {
            const data = await baseRes.json();
            // Some panels return status under attributes.status, others under attributes.current_state
            return data.attributes.current_state ?? data.attributes.status ?? "unknown";
        }
        const err = await baseRes.json().catch(() => ({}));
        throw new Error(`API error ${baseRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
    }

    const err = await resRes.json().catch(() => ({}));
    throw new Error(`API error ${resRes.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
}

// Send a power signal to the server
async function sendPowerSignal(signal) {
    const domain   = process.env.PTERODACTYL_DOMAIN;
    const serverId = process.env.PTERODACTYL_SERVER_ID;

    const res = await fetch(
        `${domain}/api/client/servers/${serverId}/power`,
        {
            method:  "POST",
            headers: getHeaders(),
            body:    JSON.stringify({ signal }),
        }
    );

    if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`API error ${res.status}: ${err.errors?.[0]?.detail ?? "Unknown error"}`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Manage the game server via the panel.")
        .addSubcommand(sub =>
            sub
                .setName("status")
                .setDescription("Check the current server status.")
        )
        .addSubcommand(sub =>
            sub
                .setName("start")
                .setDescription("Start the server.")
        )
        .addSubcommand(sub =>
            sub
                .setName("stop")
                .setDescription("Stop the server gracefully.")
        )
        .addSubcommand(sub =>
            sub
                .setName("restart")
                .setDescription("Restart the server.")
        )
        .addSubcommand(sub =>
            sub
                .setName("kill")
                .setDescription("Force-kill the server process immediately.")
        ),

    ownerOnly: true,

    async execute(interaction, client) {
        // Check if the feature is enabled in config
        if (!client.config.pterodactyl?.enabled) {
            return interaction.reply({
                content: "❌ The server management feature is not enabled. Set `pterodactyl.enabled` to `true` in `config.json`.",
                flags: MessageFlags.Ephemeral,
            });
        }

        // Validate env vars are set
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
            if (sub === "status") {
                const state = await getServerStatus();
                const emoji = STATE_EMOJIS[state] ?? STATE_EMOJIS.unknown;
                const color = STATE_COLORS[state] ?? STATE_COLORS.unknown;

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`${emoji} ${serverName} — ${state.charAt(0).toUpperCase() + state.slice(1)}`)
                    .addFields(
                        { name: "Status",    value: `${emoji} ${state}`, inline: true },
                        { name: "Server ID", value: `\`${process.env.PTERODACTYL_SERVER_ID}\``, inline: true },
                    )
                    .setTimestamp()
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });

                return interaction.editReply({ embeds: [embed], flags: undefined });
            }

            // Power actions
            const SIGNAL_MAP = {
                start:   "start",
                stop:    "stop",
                restart: "restart",
                kill:    "kill",
            };

            const SIGNAL_TEXT = {
                start:   { action: "Starting",    emoji: "▶️",  color: "#2ecc71" },
                stop:    { action: "Stopping",    emoji: "⏹️",  color: "#e74c3c" },
                restart: { action: "Restarting",  emoji: "🔄",  color: "#f39c12" },
                kill:    { action: "Force-killed", emoji: "💀", color: "#8e44ad" },
            };

            const signal = SIGNAL_MAP[sub];
            const text   = SIGNAL_TEXT[sub];

            // Validate state before sending signal
            const currentState = await getServerStatus();

            if (sub === "start" && currentState !== "offline") {
                return interaction.editReply({ content: `❌ Server is already **${currentState}**.` });
            }
            if ((sub === "stop" || sub === "restart" || sub === "kill") && currentState === "offline") {
                return interaction.editReply({ content: "❌ Server is already **offline**." });
            }

            await sendPowerSignal(signal);

            const embed = new EmbedBuilder()
                .setColor(text.color)
                .setTitle(`${text.emoji} ${serverName} — ${text.action}`)
                .setDescription(`Signal \`${signal}\` sent successfully.`)
                .addFields(
                    { name: "Previous State", value: currentState, inline: true },
                )
                .setTimestamp()
                .setFooter({
                    text: `Executed by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            return interaction.editReply({ embeds: [embed], flags: undefined });

        } catch (err) {
            console.error("[SERVER]", err);
            return interaction.editReply({ content: `❌ ${err.message}` });
        }
    },
};