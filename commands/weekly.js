const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, cooldowns } = require("../db");

const TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
const AMOUNT  = 500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("weekly")
        .setDescription("Collect your weekly coin reward."),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId      = interaction.user.id;
        const last        = cooldowns.get("weekly", guildId, userId);
        const remaining   = last ? TIMEOUT - (Date.now() - last) : 0;

        if (remaining > 0) {
            const availableAt = `<t:${Math.floor((last + TIMEOUT) / 1000)}:R>`;
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`You've already collected your weekly reward.\nCome back ${availableAt}.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.reply({ embeds: [embed] });
        }

        economy.addBalance(guildId, userId, AMOUNT);
        cooldowns.set("weekly", guildId, userId);

        const balance = economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`You collected your weekly reward of **${AMOUNT}** coins!\nYour balance is now **${balance}** coins.`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });
    },
};