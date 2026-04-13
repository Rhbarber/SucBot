const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Timeout duration choices (label → milliseconds)
const DURATIONS = {
    "60s":  60 * 1000,
    "5m":   5  * 60 * 1000,
    "10m":  10 * 60 * 1000,
    "30m":  30 * 60 * 1000,
    "1h":   60 * 60 * 1000,
    "12h":  12 * 60 * 60 * 1000,
    "24h":  24 * 60 * 60 * 1000,
    "7d":   7  * 24 * 60 * 60 * 1000,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Times out a member using Discord's native timeout feature.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to time out")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("How long to time out the member")
                .setRequired(true)
                .addChoices(
                    { name: "60 seconds", value: "60s" },
                    { name: "5 minutes",  value: "5m"  },
                    { name: "10 minutes", value: "10m" },
                    { name: "30 minutes", value: "30m" },
                    { name: "1 hour",     value: "1h"  },
                    { name: "12 hours",   value: "12h" },
                    { name: "24 hours",   value: "24h" },
                    { name: "7 days",     value: "7d"  },
                )
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the timeout")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const target   = interaction.options.getMember("user");
        const durKey   = interaction.options.getString("duration");
        const reason   = interaction.options.getString("reason") ?? "No reason provided.";
        const durMs    = DURATIONS[durKey];

        if (!target) {
            return interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: "You can't time out someone with an equal or higher role than yours.", ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: "I don't have permission to time out this user.", ephemeral: true });
        }

        await target.timeout(durMs, reason);

        const until = `<t:${Math.floor((Date.now() + durMs) / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("Member Timed Out")
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: "User",      value: `${target.user.tag} (${target.user.id})` },
                { name: "Moderator", value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Duration",  value: `${durKey} (expires ${until})` },
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