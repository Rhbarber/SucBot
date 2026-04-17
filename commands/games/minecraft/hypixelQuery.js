const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { minecraft } = require("../../../db");

const statusCache = new Map();
const STATUS_TTL = 1000 * 30; // 30 seconds
const UUID_TTL = 1000 * 60 * 60 * 24; // 24 hours

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hypixel")
        .setDescription("Check Hypixel status of a player")
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("Minecraft username")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const username = interaction.options.getString("username").toLowerCase();
        const key = `uuid_${username}`;
        const API_KEY = process.env.HYPIXEL_API_KEY;

        if (!API_KEY) {
            return interaction.reply({
                content: "❌ Hypixel API key is not configured.",
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            // ── UUID (DB cache)
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
                    expires: Date.now() + UUID_TTL,
                };

                await minecraft.set(key, entry);
            }

            const uuid = entry.uuid;

            // ── Hypixel status (memory cache)
            let statusEntry = statusCache.get(uuid);

            if (!statusEntry || statusEntry.expires < Date.now()) {
                const res = await fetch(`https://api.hypixel.net/status?uuid=${uuid}`, {
                    headers: { "API-Key": API_KEY },
                });

                const data = await res.json();

                if (!data.success) {
                    return interaction.reply({
                        content: "❌ Failed to fetch Hypixel data.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                statusEntry = {
                    data,
                    expires: Date.now() + STATUS_TTL,
                };

                statusCache.set(uuid, statusEntry);
            }

            const session = statusEntry.data.session;

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`Hypixel Status: ${entry.name}`)
                .setThumbnail(`https://crafatar.com/avatars/${uuid}`)
                .addFields(
                    { name: "Online", value: session?.online ? "✅ Yes" : "❌ No" },
                    { name: "Game", value: session?.gameType || "N/A", inline: true },
                    { name: "Mode", value: session?.mode || "N/A", inline: true }
                )
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