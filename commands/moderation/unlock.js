const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks a previously locked channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to unlock (defaults to current channel)")
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for unlocking the channel")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel("channel") ?? interaction.channel;
        const reason  = interaction.options.getString("reason") ?? "No reason provided.";

        const everyoneRole = interaction.guild.roles.everyone;
        const overwrite    = channel.permissionOverwrites.cache.get(everyoneRole.id);

        if (!overwrite?.deny.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({ content: `${channel} is not locked.`, flags: MessageFlags.Ephemeral });
        }

        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: null, // Reset to default, not explicitly allow
        }, { reason: `Unlocked by ${interaction.user.tag}: ${reason}` });

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("🔓 Channel Unlocked")
            .addFields(
                { name: "Channel",   value: `${channel}` },
                { name: "Moderator", value: `${interaction.user.tag}` },
                { name: "Reason",    value: reason },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        if (channel.id !== interaction.channelId) {
            await channel.send({ embeds: [embed] });
        }
    },
};