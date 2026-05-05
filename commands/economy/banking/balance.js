const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy } = require("../../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your coin balance.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to check the balance of (defaults to yourself)")
        ),

    async execute(interaction, client) {
        const target  = interaction.options.getUser("user") ?? interaction.user;
        const balance = await economy.getBalance(interaction.guildId, target.id);
        const isSelf  = target.id === interaction.user.id;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`🪙 ${isSelf ? "Your Balance" : `${target.displayName}'s Balance`}`)
            .setDescription(`**${balance}** 🪙`)
            .setThumbnail(target.displayAvatarURL())
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};