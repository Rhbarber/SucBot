const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skin")
        .setDescription("Shows a Minecraft player's skin head.")
        .addStringOption(option =>
            option
                .setName("player")
                .setDescription("Minecraft username or UUID")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const player = interaction.options.getString("player");

        // Resolve username → UUID via Mojang API
        const profileRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(player)}`);

        if (profileRes.status === 404) {
            return interaction.editReply({ content: `No Minecraft account found for \`${player}\`.` });
        }
        if (!profileRes.ok) {
            return interaction.editReply({ content: "Could not reach the Mojang API. Try again later." });
        }

        const { id, name } = await profileRes.json();

        // crafatar.com — actively maintained skin rendering API
        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${name}'s skin`)
            .setImage(`https://crafatar.com/renders/head/${id}?overlay`)
            .setURL(`https://namemc.com/profile/${id}`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};