const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Locks a channel, preventing members from sending messages.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to lock (defaults to current channel)")
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for locking the channel")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel("channel") ?? interaction.channel;
        const reason  = interaction.options.getString("reason") ?? "No reason provided.";

        const everyoneRole = interaction.guild.roles.everyone;
        const current = channel.permissionOverwrites.cache.get(everyoneRole.id);

        // Check if already locked
        if (current?.deny.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({ content: `${channel} is already locked.`, flags: MessageFlags.Ephemeral });
        }

        await channel.permissionOverwrites.edit(everyoneRole, {
            SendMessages: false,
        }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });

        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("🔒 Channel Locked")
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