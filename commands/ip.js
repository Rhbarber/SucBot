const Discord = require("discord.js");
const config = require('../config.json');
module.exports.run = async (bot, message, args) => {
    const usage = new Discord.MessageEmbed()
        .setColor("RANDOM")
        .setDescription(`**Usage:** ${config.prefix}ip <server ip>`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (args.length === 0) return message.channel.send(usage)

    const request = require('request')
        , url = 'https://api.mcsrvstat.us/2/' + escape(args.join(" "))
    request(url, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            const Response = JSON.parse(body);
            if (Response.debug.query == true) {
                const embed = new Discord.MessageEmbed()
                    .setColor("RANDOM")
                    .setDescription(`**Server IP**: ${Response.hostname}:${Response.port}\n\n **Online Players:** ${Response.players.online}/${Response.players.max}\n\n **Server Version:** ${Response.version}\n\n **Server Software:** ${Response.software}\n\n **MOTD:**\n ${Response.motd.clean}`)
                    .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
                    .setThumbnail(`https://api.mcsrvstat.us/icon/${Response.hostname}`)
                message.channel.send(embed);
            } else {
                const error1 = new Discord.MessageEmbed()
                    .setColor("RANDOM")
                    .setDescription(`Server not found. Please make sure the server is turned on, and query is enabled!`)
                    .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
                message.channel.send(error1)
            }
        }
    })
}
module.exports.help = {
    name: "ip",
    aliases: ["query"]
}