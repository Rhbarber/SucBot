const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user by their ID.")
        .addStringOption(option =>
            option
                .setName("user_id")
                .setDescription("The ID of the user to unban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the unban")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const userId = interaction.options.getString("user_id");
        const reason = interaction.options.getString("reason") ?? "No reason provided.";

        // Validate ID format
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                content: "❌ That doesn't look like a valid Discord user ID.",
                flags: MessageFlags.Ephemeral,
            });
        }

        // Check if the user is actually banned
        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban) {
            return interaction.reply({
                content: `❌ No ban found for user ID \`${userId}\`.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.guild.members.unban(userId, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("✅ User Unbanned")
            .addFields(
                { name: "User",      value: `${ban.user.tag} (${userId})` },
                { name: "Moderator", value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Reason",    value: reason },
            )
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });

        if (client.config.logChannelId) {
            const logChannel = await client.channels.fetch(client.config.logChannelId).catch(() => null);
            if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });
        }
    },
};