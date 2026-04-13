const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { warnings } = require("../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Issues a warning to a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to warn")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the warning")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const target = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason");

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: "You can't warn yourself.", ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "You can't warn someone with an equal or higher role than yours.", ephemeral: true });
        }

        await warnings.add(interaction.guildId, target.id, interaction.user.id, reason);
        const allWarnings = await warnings.get(interaction.guildId, target.id);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("⚠️ Member Warned")
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "User",           value: `${target.user.tag} (${target.user.id})` },
                { name: "Moderator",      value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Reason",         value: reason },
                { name: "Total Warnings", value: `${allWarnings.length}` },
            )
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });

        // Notify the warned user via DM
        await target.user.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`⚠️ You've been warned in ${interaction.guild.name}`)
                    .addFields(
                        { name: "Reason",         value: reason },
                        { name: "Total Warnings", value: `${allWarnings.length}` },
                    )
                    .setTimestamp(),
            ],
        }).catch(() => {}); // silently fail if DMs are closed

        if (client.config.logChannelId) {
            const logChannel = await client.channels.fetch(client.config.logChannelId).catch(() => null);
            if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });
        }
    },
};