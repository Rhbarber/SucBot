const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("maintenance")
        .setDescription("Toggle maintenance mode — non-owner commands will be disabled.")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Message to show users during maintenance (optional)")
        ),

    ownerOnly: true,

    async execute(interaction, client) {
        client.maintenance        = !client.maintenance;
        client.maintenanceMessage = interaction.options.getString("message") ?? "The bot is currently undergoing maintenance. Please try again later.";

        await client.user.setPresence({
            activities: client.maintenance ? [{ name: "🔧 Maintenance" }] : [],
            status: client.maintenance ? "dnd" : "online",
        });

        await interaction.reply({
            content: client.maintenance
                ? `🔧 Maintenance mode **enabled**.\nMessage: *${client.maintenanceMessage}*`
                : "✅ Maintenance mode **disabled**. Bot is back to normal.",
            flags: MessageFlags.Ephemeral,
        });
    },
};