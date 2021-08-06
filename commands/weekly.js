const Discord = require("discord.js");
const config = require('../config.json');
const db = require("quick.db");
const ms = require("parse-ms");

module.exports.run = async (bot, message, args) => {
    let user = message.author;
    let timeout = 604800000;
    let amount = 500;
    let weekly = await db.fetch(`weekly_${message.guild.id}_${user.id}`);
    if (weekly !== null && timeout - (Date.now() - weekly) > 0) {
        let time = ms(timeout - (Date.now() - weekly));
        let timeEmbed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setDescription(`It seems you have already collected your weekly reward.\n\n You can collect it again in ${time.days} day(s) ${time.hours} hour(s), ${time.minutes} minute(s) and ${time.seconds} second(s)!`)
            .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        message.channel.send(timeEmbed)
    } else {
        let moneyEmbed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setDescription(`You've collected your weekly reward of \`\`${amount}\`\` coins!\n\n ***Note:** You can deposit your coins by using the \`\`${config.prefix}deposit\`\` command!*`)
            .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        message.channel.send(moneyEmbed)
        db.add(`money_${message.guild.id}_${user.id}`, amount)
        db.set(`weekly_${message.guild.id}_${user.id}`, Date.now())
    }
}

module.exports.help = {
    name: "weekly",
    aliases: ["weekly"]
}