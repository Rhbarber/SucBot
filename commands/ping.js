const Discord = require("discord.js")
const moment = require("moment")
require("moment-duration-format")

module.exports.run = async (bot, message, args) => {
    const duration = moment.duration(bot.uptime).format(" D [Days], H [Hours], m [Minutes], s [Seconds]");
    let botping = new Date() - message.createdAt;

    let pingembed = new Discord.MessageEmbed()
        .setColor("RANDOM")
        .addField('API Ping:', Math.floor(bot.ws.ping) + ' ms', true)
        .addField('Bot Ping:', Math.floor(botping) + ' ms', true)
        .addField('RAM Usage:', (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB', true)
        .addField("Uptime:", `${duration}`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    message.channel.send(pingembed);
}

module.exports.help = {
    name: "ping",
    aliases: ["pong"]
}