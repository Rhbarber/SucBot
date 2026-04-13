const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bans a member from the server.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to ban")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the ban")
        )
        .addIntegerOption(option =>
            option
                .setName("delete_days")
                .setDescription("Days of message history to delete (0–7)")
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const target     = interaction.options.getMember("user");
        const reason     = interaction.options.getString("reason") ?? "No reason provided.";
        const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        }

        // Prevent banning someone with equal or higher role
        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "You can't ban someone with an equal or higher role than yours.", ephemeral: true });
        }

        // Check the bot can actually ban this member
        if (!target.bannable) {
            return interaction.reply({ content: "I don't have permission to ban this user.", ephemeral: true });
        }

        await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("Member Banned")
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