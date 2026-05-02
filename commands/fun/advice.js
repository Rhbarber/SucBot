const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("advice")
        .setDescription("Get a random piece of advice."),

    async execute(interaction, client) {
        await interaction.deferReply();

        const res  = await fetch("https://api.adviceslip.com/advice");
        const { slip } = await res.json();

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`💡 *${slip.advice}*`)
            .setFooter({
                text: `Advice #${slip.id} • Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};