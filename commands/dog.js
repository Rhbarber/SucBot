const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dog")
        .setDescription("Sends a random dog picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const res  = await fetch("https://random.dog/woof.json");
        const { url, fileSizeBytes } = await res.json();

        // random.dog can return videos — skip them and retry once
        const isMedia = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        const imageUrl = isMedia ? url : (await (await fetch("https://random.dog/woof.json")).json()).url;

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