const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kicks a member from the server.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to kick")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the kick")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction, client) {
        const target = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason") ?? "No reason provided.";

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        }

        // Prevent kicking someone with equal or higher role
        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "You can't kick someone with an equal or higher role than yours.", ephemeral: true });
        }

        // Check the bot can actually kick this member
        if (!target.kickable) {
            return interaction.reply({ content: "I don't have permission to kick this user.", ephemeral: true });
        }

        await target.kick(reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("Member Kicked")
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

        // Log to the log channel if configured
        if (client.config.logChannelId) {
            const logChannel = await client.channels.fetch(client.config.logChannelId).catch(() => null);
            if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });
        }
    },
};