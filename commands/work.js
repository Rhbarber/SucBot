const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, cooldowns } = require("../db");

const TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

const JOBS = [
    { title: "Programmer",       pay: [200, 500] },
    { title: "Builder",          pay: [100, 350] },
    { title: "Chef",             pay: [150, 400] },
    { title: "Mechanic",         pay: [150, 400] },
    { title: "Taxi Driver",      pay: [80,  250] },
    { title: "Doctor",           pay: [300, 600] },
    { title: "Teacher",          pay: [120, 300] },
    { title: "Streamer",         pay: [50,  700] },
    { title: "Security Guard",   pay: [100, 250] },
    { title: "Graphic Designer", pay: [200, 450] },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work to earn some coins. Available every 12 hours."),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId      = interaction.user.id;
        const last        = cooldowns.get("work", guildId, userId);
        const remaining   = last ? TIMEOUT - (Date.now() - last) : 0;

        if (remaining > 0) {
            const availableAt = `<t:${Math.floor((last + TIMEOUT) / 1000)}:R>`;
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`You've already worked today.\nYou can work again ${availableAt}.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.reply({ embeds: [embed] });
        }

        const job    = JOBS[Math.floor(Math.random() * JOBS.length)];
        const amount = Math.floor(Math.random() * (job.pay[1] - job.pay[0] + 1)) + job.pay[0];

        economy.addBalance(guildId, userId, amount);
        cooldowns.set("work", guildId, userId);

        const balance = economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`You worked as a **${job.title}** and earned **${amount}** coins!\nYour balance is now **${balance}** coins.`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed] });
    },
};