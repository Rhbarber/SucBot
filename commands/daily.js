const Discord = require("discord.js");
const config = require('../config.json');
const db = require("quick.db");
const ms = require("parse-ms");

module.exports.run = async (bot, message, args) => {
    let user = message.author;
    let timeout = 86400000;
    let amount = 100;
    let daily = await db.fetch(`daily_${message.guild.id}_${user.id}`);
    if (daily !== null && timeout - (Date.now() - daily) > 0) {
        let time = ms(timeout - (Date.now() - daily));

        let timeEmbed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setDescription(`It seems you have already collected your daily reward.\n\n You can collect it again in ${time.hours} hour(s), ${time.minutes} minute(s) and ${time.seconds} second(s)!`)
            .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        message.channel.send(timeEmbed)
    } else {
        let moneyEmbed = new Discord.MessageEmbed()
            .setColor("RANDOM")
            .setDescription(`You've collected your daily reward of \`\`${amount}\`\` coins!\n\n ***Note:** You can deposit your coins by using the \`\`${config.prefix}deposit\`\` command!*`)
            .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        message.channel.send(moneyEmbed)
        db.add(`money_${message.guild.id}_${user.id}`, amount)
        db.set(`daily_${message.guild.id}_${user.id}`, Date.now())


    }
}

module.exports.help = {
    name: "daily",
    aliases: ["daily"]
}