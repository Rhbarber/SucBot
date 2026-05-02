const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fox")
        .setDescription("Sends a random fox picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const res  = await fetch("https://randomfox.ca/floof/");
        const { image } = await res.json();

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setImage(image)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};