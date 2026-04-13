const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, cooldowns } = require("../db");

const TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const AMOUNT  = 100;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Collect your daily coin reward."),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId      = interaction.user.id;
        const last        = cooldowns.get("daily", guildId, userId);
        const remaining   = last ? TIMEOUT - (Date.now() - last) : 0;

        if (remaining > 0) {
            const availableAt = `<t:${Math.floor((last + TIMEOUT) / 1000)}:R>`;
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`You've already collected your daily reward.\nCome back ${availableAt}.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.reply({ embeds: [embed] });
        }

        economy.addBalance(guildId, userId, AMOUNT);
        cooldowns.set("daily", guildId, userId);

        const balance = economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`You collected your daily reward of **${AMOUNT}** coins!\nYour balance is now **${balance}** coins.`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });
    },
};