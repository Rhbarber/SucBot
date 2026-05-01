const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { minecraft } = require("../../../db");
const crypto = require("node:crypto");

const TTL = 1000 * 60 * 60 * 24;

// Steve & Alex (no dashes for Mineatar)
const STEVE = "8667ba71b85a4004af54457a9734eed7";
const ALEX  = "ec561538f3fd461daff5086b22154bce";

// Generate offline UUID
function getOfflineUUID(username) {
    const md5 = crypto.createHash("md5").update(`OfflinePlayer:${username}`).digest();

    md5[6] = (md5[6] & 0x0f) | 0x30;
    md5[8] = (md5[8] & 0x3f) | 0x80;

    const hex = md5.toString("hex");

    return hex.replace(
        /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
        "$1-$2-$3-$4-$5"
    );
}

// Deterministic default skin based on username (matches Minecraft's Java hashCode)
function getDefaultSkin(username) {
    const lower = username.toLowerCase();
    let hash = 0;
    for (let i = 0; i < lower.length; i++) {
        hash = (Math.imul(31, hash) + lower.charCodeAt(i)) | 0;
    }
    return (hash % 2 === 0) ? STEVE : ALEX;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mcinfo")
        .setDescription("View Minecraft account details")
        .addStringOption(option =>
            option.setName("username").setDescription("Minecraft username").setRequired(true)
        ),

    async execute(interaction, client) {
        const username = interaction.options.getString("username");
        const key = `uuid_${username.toLowerCase()}`;

        try {
            let entry = await minecraft.get(key);

            if (!entry || entry.expires < Date.now()) {
                const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);

                if (res.ok) {
                    const data = await res.json();

                    entry = {
                        uuid: data.id,
                        name: data.name,
                        expires: Date.now() + TTL,
                    };

                    await minecraft.set(key, entry);
                } else {
                    entry = null;
                }
            }

            const offlineUUID = getOfflineUUID(username);

            // ── Offline / invalid account
            if (!entry) {
                const fallbackUUID = getDefaultSkin(username);
                const avatar = `https://api.mineatar.io/head/${fallbackUUID}`;

                const embed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setAuthor({ name: username, iconURL: avatar })
                    .setThumbnail(avatar)
                    .addFields({
                        name: "📦 Offline UUID",
                        value: `\`${offlineUUID}\``,
                    })
                    .setFooter({ text: "Player not found • Deterministic default skin" })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // ── Valid account
            const dashedUUID = entry.uuid.replace(
                /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
                "$1-$2-$3-$4-$5"
            );

            const avatar = `https://api.mineatar.io/head/${entry.uuid}`;

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setAuthor({ name: entry.name, iconURL: avatar })
                .setThumbnail(avatar)
                .addFields(
                    { name: "🆔 UUID", value: `\`${dashedUUID}\`` },
                    { name: "🔑 Raw UUID", value: `\`${entry.uuid}\`` },
                    { name: "📦 Offline UUID", value: `\`${offlineUUID}\`` }
                )
                .setFooter({ text: "Minecraft Profile Lookup" })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: "Something went wrong.",
                flags: MessageFlags.Ephemeral
            });
        }
    },
};