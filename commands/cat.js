const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat")
        .setDescription("Sends a random cat picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        // cataas.com — actively maintained cat-as-a-service API
        const res = await fetch("https://cataas.com/cat?json=true");
        const { _id } = await res.json();

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setImage(`https://cataas.com${data.url}`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};