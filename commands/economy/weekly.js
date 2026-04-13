const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, cooldowns } = require("../../db");

const TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
const AMOUNT  = 500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("weekly")
        .setDescription("Collect your weekly coin reward."),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId      = interaction.user.id;
        const last        = await cooldowns.get("weekly", guildId, userId);
        const remaining   = last ? TIMEOUT - (Date.now() - last) : 0;

        if (remaining > 0) {
            const availableAt = `<t:${Math.floor((last + TIMEOUT) / 1000)}:R>`;
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`⏳ You've already collected your weekly reward.\nCome back ${availableAt}.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.reply({ embeds: [embed] });
        }

        await economy.addBalance(guildId, userId, AMOUNT);
        await cooldowns.set("weekly", guildId, userId);
        const balance = await economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🪙 Weekly Reward Collected!")
            .setDescription(`You received your weekly reward of **${AMOUNT}** 🪙\nYour new balance is **${balance}** 🪙`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};