const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy } = require("../../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the top 10 richest members in this server."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const rows = await economy.getLeaderboard(interaction.guildId, 10);

        if (!rows.length) {
            return interaction.editReply({ content: "No economy data found for this server yet." });
        }

        const medals = ["🥇", "🥈", "🥉"];

        const lines = await Promise.all(rows.map(async (row, i) => {
            const userId = row.key.split("_").pop();
            const user   = await client.users.fetch(userId).catch(() => null);
            const name   = user ? user.tag : `Unknown (${userId})`;
            const prefix = medals[i] ?? `**#${i + 1}**`;
            return `${prefix} ${name} — **${row.value}** 🪙`;
        }));

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🏆 Coin Leaderboard")
            .setDescription(lines.join("\n"))
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};