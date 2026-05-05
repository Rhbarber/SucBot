const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { inventory } = require("../../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("Check your inventory.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to check the inventory of (defaults to yourself)")
        ),

    async execute(interaction, client) {
        const target = interaction.options.getUser("user") ?? interaction.user;
        const items  = await inventory.get(interaction.guildId, target.id);
        const isSelf = target.id === interaction.user.id;

        const description = items.length
            ? items.map(row => `• **${row.item}** × ${row.quantity}`).join("\n")
            : isSelf
                ? "Your inventory is empty."
                : `${target.displayName}'s inventory is empty.`;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`🎒 ${isSelf ? "Your Inventory" : `${target.displayName}'s Inventory`}`)
            .setDescription(description)
            .setThumbnail(target.displayAvatarURL())
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};