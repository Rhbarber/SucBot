const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ip")
        .setDescription("Shows information about a Minecraft server.")
        .addStringOption(option =>
            option
                .setName("address")
                .setDescription("Server IP address (e.g. play.hypixel.net)")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const address = interaction.options.getString("address").trim().toLowerCase();

        // mcsrvstat.us v3 — current API version
        const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`);

        if (!res.ok) {
            return interaction.editReply({ content: "Could not reach the mcsrvstat API. Try again later." });
        }

        const data = await res.json();

        if (!data.online) {
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`**${address}** is offline or unreachable.\nMake sure the address is correct and the server is running.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.editReply({ embeds: [embed] });
        }

        const motd    = data.motd?.clean?.join("\n") ?? "N/A";
        const version = data.version ?? "Unknown";
        const online  = data.players?.online ?? 0;
        const max     = data.players?.max ?? 0;
        const host    = data.hostname ?? address;
        const port    = data.port ?? 25565;
        const software = data.software ?? "Vanilla";

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${host}:${port}`)
            .addFields(
                { name: "Players",  value: `${online}/${max}`,  inline: true },
                { name: "Version",  value: version,             inline: true },
                { name: "Software", value: software,            inline: true },
                { name: "MOTD",     value: `\`\`\`${motd}\`\`\`` },
            )
            .setThumbnail(`https://api.mcsrvstat.us/icon/${encodeURIComponent(address)}`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};