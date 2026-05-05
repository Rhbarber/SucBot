const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, cooldowns } = require("../../../db");
const { randomInt } = require("node:crypto");

const TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

const JOBS = [
    { title: "Programmer",       emoji: "💻", pay: [200, 500] },
    { title: "Builder",          emoji: "🏗️",  pay: [100, 350] },
    { title: "Chef",             emoji: "👨‍🍳", pay: [150, 400] },
    { title: "Mechanic",         emoji: "🔧", pay: [150, 400] },
    { title: "Taxi Driver",      emoji: "🚕", pay: [80,  250] },
    { title: "Doctor",           emoji: "🩺", pay: [300, 600] },
    { title: "Teacher",          emoji: "📚", pay: [120, 300] },
    { title: "Streamer",         emoji: "🎮", pay: [50,  700] },
    { title: "Security Guard",   emoji: "🛡️",  pay: [100, 250] },
    { title: "Graphic Designer", emoji: "🎨", pay: [200, 450] },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work to earn some coins. Available every 12 hours."),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId      = interaction.user.id;
        const last        = await cooldowns.get("work", guildId, userId);
        const remaining   = last ? TIMEOUT - (Date.now() - last) : 0;

        if (remaining > 0) {
            const availableAt = `<t:${Math.floor((last + TIMEOUT) / 1000)}:R>`;
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`⏳ You've already worked today.\nYou can work again ${availableAt}.`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });
            return interaction.reply({ embeds: [embed] });
        }

        const job    = JOBS[randomInt(0, JOBS.length)];
        const amount = randomInt(job.pay[0], job.pay[1] + 1);

        await Promise.all([
            economy.addBalance(guildId, userId, amount),
            cooldowns.set("work", guildId, userId),
        ]);
        const balance = await economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${job.emoji} Work Complete!`)
            .setDescription(`You worked as a **${job.title}** and earned **${amount}** 🪙\nYour new balance is **${balance}** 🪙`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};