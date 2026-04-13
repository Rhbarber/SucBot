const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unmute")
        .setDescription("Removes a timeout from a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to remove the timeout from")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for removing the timeout")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const target = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason") ?? "No reason provided.";

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        }

        if (!target.isCommunicationDisabled()) {
            return interaction.reply({ content: "That user is not currently timed out.", ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: "I don't have permission to modify this user's timeout.", ephemeral: true });
        }

        await target.timeout(null, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("Timeout Removed")
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "User",      value: `${target.user.tag} (${target.user.id})` },
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