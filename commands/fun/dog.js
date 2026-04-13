const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dog")
        .setDescription("Sends a random dog picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        let imageUrl = null;

        // Retry up to 5 times because random.dog may return videos
        for (let i = 0; i < 5; i++) {
            const res = await fetch("https://random.dog/woof.json");
            const data = await res.json();

            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(data.url)) {
                imageUrl = data.url;
                break;
            }
        }

        if (!imageUrl) {
            return interaction.editReply({
                content: "Could not fetch a dog image. Please try again."
            });
        }

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