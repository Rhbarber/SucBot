const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { minecraft } = require("../../../db");

const TTL = 1000 * 60 * 60 * 24; // 24 hours

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mcinfo")
        .setDescription("Get basic Minecraft account info")
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("Minecraft username")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const username = interaction.options.getString("username").toLowerCase();
        const key = `uuid_${username}`;

        try {
            let entry = await minecraft.get(key);

            if (!entry || entry.expires < Date.now()) {
                const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);

                if (!res.ok) {
                    return interaction.reply({
                        content: "❌ Player not found.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const data = await res.json();

                entry = {
                    uuid: data.id,
                    name: data.name,
                    expires: Date.now() + TTL,
                };

                await minecraft.set(key, entry);
            }

            const dashedUUID = entry.uuid.replace(
                /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
                "$1-$2-$3-$4-$5"
            );

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`Minecraft Info: ${entry.name}`)
                .addFields(
                    { name: "UUID", value: dashedUUID },
                    { name: "Raw UUID", value: entry.uuid }
                )
                .setThumbnail(`https://crafatar.com/avatars/${entry.uuid}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: "Something went wrong.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};