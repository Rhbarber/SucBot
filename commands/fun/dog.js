const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp)$/i;
const MAX_ATTEMPTS = 5;

// Fetch a random dog image URL, retrying if a video is returned
async function fetchDogImage(attempts = 0) {
    if (attempts >= MAX_ATTEMPTS) return null;
    const res  = await fetch("https://random.dog/woof.json");
    const data = await res.json();
    if (IMAGE_REGEX.test(data.url)) return data.url;
    return fetchDogImage(attempts + 1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dog")
        .setDescription("Sends a random dog picture."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const imageUrl = await fetchDogImage();

        if (!imageUrl) {
            return interaction.editReply({ content: "Couldn't find a dog image after several attempts. Try again!" });
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