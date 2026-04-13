const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat")
        .setDescription("Sends a random cat picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const res = await fetch("https://cataas.com/cat?json=true");
        const data = await res.json();

        const imageUrl = `https://cataas.com${data.url}`;

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