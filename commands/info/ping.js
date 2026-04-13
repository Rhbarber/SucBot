const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const dayjs = require("dayjs");
const duration = require("dayjs/plugin/duration");

dayjs.extend(duration);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Shows the bot's latency, RAM usage and uptime."),

    async execute(interaction, client) {
        const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });

        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const ws        = client.ws.ping;
        const ram       = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const dur = dayjs.duration(client.uptime);
        const uptime = [
            dur.days()    && `${dur.days()}d`,
            dur.hours()   && `${dur.hours()}h`,
            dur.minutes() && `${dur.minutes()}m`,
            `${dur.seconds()}s`,
        ].filter(Boolean).join(" ");

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .addFields(
                { name: "Roundtrip", value: `${roundtrip}ms`, inline: true },
                { name: "WebSocket", value: `${ws}ms`,        inline: true },
                { name: "RAM Usage", value: `${ram} MB`,      inline: true },
                { name: "Uptime",    value: uptime,           inline: true },
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ content: "", embeds: [embed] });
    },
};