const Discord = require("discord.js");
const config = require('../config.json');
const db = require("quick.db");
const ms = require("parse-ms");

module.exports.run = async (bot, message, args) => {

let user = message.author;
let author = await db.fetch(`work_${message.guild.id}_${user.id}`)
let timeout = 43200000;
if (author !== null && timeout - (Date.now() - author) > 0) {
    let time = ms(timeout - (Date.now() - author));
    let timeEmbed = new Discord.MessageEmbed()
        .setColor("RANDOM")
        .setDescription(`It seems you have already worked today.\n\n You can work it again in ${time.days} day(s) ${time.hours} hour(s), ${time.minutes} minute(s) and ${time.seconds} second(s)!`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    message.channel.send(timeEmbed)
} else {
    let job = ['Programmer', 'Builder', 'Chief', 'Mechanic']
    let result = Math.floor((Math.random() * job.length));
    let amount = Math.floor(Math.random() * 500) + 1;
    let embed1 = new Discord.MessageEmbed()
        .setColor("RANDOM")
        .setDescription(`You worked as a \`\`${job[result]}\`\` and earned \`\`${amount}\`\` coins`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    message.channel.send(embed1)
    db.add(`money_${message.guild.id}_${user.id}`, amount)
    db.set(`work_${message.guild.id}_${user.id}`, Date.now())
}
}

module.exports.help = {
    name: "work",
    aliases: ["work"]
}