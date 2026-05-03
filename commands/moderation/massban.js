const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("massban")
        .setDescription("Ban multiple users by ID. Useful after raids.")
        .addStringOption(option =>
            option
                .setName("user_ids")
                .setDescription("Space or comma-separated list of user IDs to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the bans")
        )
        .addIntegerOption(option =>
            option
                .setName("delete_days")
                .setDescription("Days of message history to delete (0–7, default: 1)")
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const input      = interaction.options.getString("user_ids");
        const reason     = interaction.options.getString("reason") ?? "Mass ban.";
        const deleteDays = interaction.options.getInteger("delete_days") ?? 1;

        // Parse IDs — support spaces, commas, newlines
        const ids = [...new Set(input.split(/[\s,]+/).filter(id => /^\d{17,20}$/.test(id)))];

        if (!ids.length) {
            return interaction.editReply({ content: "❌ No valid user IDs found in your input." });
        }

        if (ids.length > 50) {
            return interaction.editReply({ content: "❌ You can ban a maximum of 50 users at once." });
        }

        const banOptions = {
            reason: `[Massban by ${interaction.user.tag}] ${reason}`,
            deleteMessageSeconds: deleteDays * 86400,
        };

        const settled = await Promise.allSettled(
            ids.map(id => interaction.guild.members.ban(id, banOptions))
        );

        const results = settled.reduce((acc, result, i) => {
            if (result.status === "fulfilled") acc.success.push(ids[i]);
            else acc.failed.push(ids[i]);
            return acc;
        }, { success: [], failed: [] });

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🔨 Mass Ban Complete")
            .addFields(
                { name: "✅ Banned",    value: `${results.success.length} user(s)`,                                    inline: true },
                { name: "❌ Failed",    value: `${results.failed.length} user(s)`,                                     inline: true },
                { name: "Reason",       value: reason },
            )
            .setTimestamp()
            .setFooter({
                text: `Executed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        if (results.failed.length) {
            embed.addFields({ name: "Failed IDs", value: results.failed.join(", ").slice(0, 1024) });
        }

        await interaction.editReply({ embeds: [embed] });

        if (client.config.logChannelId) {
            const logChannel = await client.channels.fetch(client.config.logChannelId).catch(() => null);
            if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });
        }
    },
};