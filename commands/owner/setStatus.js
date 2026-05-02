const { SlashCommandBuilder, ActivityType, MessageFlags } = require("discord.js");

const ACTIVITY_TYPES = {
    Playing:   ActivityType.Playing,
    Watching:  ActivityType.Watching,
    Listening: ActivityType.Listening,
    Competing: ActivityType.Competing,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setstatus")
        .setDescription("Change the bot's activity status.")
        .addStringOption(option =>
            option.setName("text").setDescription("Status text").setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("Activity type (default: Playing)")
                .addChoices(
                    { name: "🎮 Playing",   value: "Playing"   },
                    { name: "👀 Watching",  value: "Watching"  },
                    { name: "🎵 Listening", value: "Listening" },
                    { name: "🏆 Competing", value: "Competing" },
                )
        )
        .addStringOption(option =>
            option
                .setName("status")
                .setDescription("Online status (default: online)")
                .addChoices(
                    { name: "🟢 Online",    value: "online"    },
                    { name: "🟡 Idle",      value: "idle"      },
                    { name: "🔴 Do Not Disturb", value: "dnd" },
                    { name: "⚫ Invisible", value: "invisible" },
                )
        ),

    ownerOnly: true,

    async execute(interaction, client) {
        const text       = interaction.options.getString("text");
        const typeKey    = interaction.options.getString("type") ?? "Playing";
        const status     = interaction.options.getString("status") ?? "online";
        const activityType = ACTIVITY_TYPES[typeKey];

        await client.user.setPresence({
            activities: [{ name: text, type: activityType }],
            status,
        });

        await interaction.reply({
            content: `✅ Status updated to **${typeKey} ${text}** (${status}).`,
            flags: MessageFlags.Ephemeral,
        });
    },
};