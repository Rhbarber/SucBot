const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat")
        .setDescription("Sends a random cat picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        // direct image endpoint avoids malformed URL issues
        const imageUrl = `https://cataas.com/cat?${Date.now()}`;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setImage(imageUrl)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};