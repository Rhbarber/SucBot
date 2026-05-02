const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("softban")
        .setDescription("Bans then immediately unbans a member to delete their recent messages.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to softban")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("delete_days")
                .setDescription("Days of message history to delete (1–7, default: 7)")
                .setMinValue(1)
                .setMaxValue(7)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the softban")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const target     = interaction.options.getMember("user");
        const reason     = interaction.options.getString("reason") ?? "No reason provided.";
        const deleteDays = interaction.options.getInteger("delete_days") ?? 7;

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", flags: MessageFlags.Ephemeral });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "You can't softban someone with an equal or higher role than yours.", flags: MessageFlags.Ephemeral });
        }

        if (!target.bannable) {
            return interaction.reply({ content: "I don't have permission to ban this user.", flags: MessageFlags.Ephemeral });
        }

        await target.ban({ reason: `Softban: ${reason}`, deleteMessageSeconds: deleteDays * 86400 });
        await interaction.guild.members.unban(target.id, "Softban — immediate unban");

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🔄 Member Softbanned")
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "User",        value: `${target.user.tag} (${target.user.id})` },
                { name: "Moderator",   value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Deleted",     value: `${deleteDays} day(s) of messages` },
                { name: "Reason",      value: reason },
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