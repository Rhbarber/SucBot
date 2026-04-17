const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Bulk delete messages in this channel.")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Number of messages to delete (1–100)")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Only delete messages from this user")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        const amount    = interaction.options.getInteger("amount");
        const filterUser = interaction.options.getUser("user");

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Fetch messages — Discord only allows bulk deleting messages under 14 days old
        const fetched = await interaction.channel.messages.fetch({ limit: 100 });
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

        let toDelete = [...fetched.values()]
            .filter(m => m.createdTimestamp > twoWeeksAgo);

        if (filterUser) {
            toDelete = toDelete.filter(m => m.author.id === filterUser.id);
        }

        toDelete = toDelete.slice(0, amount);

        if (!toDelete.length) {
            return interaction.editReply({ content: "No eligible messages found to delete (messages must be under 14 days old)." });
        }

        const deleted = await interaction.channel.bulkDelete(toDelete, true);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(
                `🗑️ Deleted **${deleted.size}** message(s)` +
                (filterUser ? ` from **${filterUser.tag}**` : "") + "."
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};