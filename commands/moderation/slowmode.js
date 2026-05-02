const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set or clear slowmode in a channel.")
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription("Slowmode duration in seconds (0 = disable, max 21600 = 6h)")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to set slowmode in (defaults to current channel)")
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const seconds = interaction.options.getInteger("seconds");
        const channel = interaction.options.getChannel("channel") ?? interaction.channel;

        await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);

        const formatted = seconds === 0
            ? "disabled"
            : seconds < 60
                ? `${seconds}s`
                : seconds < 3600
                    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`.replace(" 0s", "")
                    : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`.replace(" 0m", "");

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(seconds === 0 ? "🐇 Slowmode Disabled" : "🐢 Slowmode Enabled")
            .addFields(
                { name: "Channel",  value: `${channel}`, inline: true },
                { name: "Duration", value: formatted,    inline: true },
            )
            .setTimestamp()
            .setFooter({
                text: `Set by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });
    },
};