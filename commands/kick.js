const Discord = require("discord.js");
const config = require('../config.json');

module.exports.run = async (client, message, args) => {
    let NoPerms = new Discord.MessageEmbed()
        .setDescription(`You do not have the \`\KICK_MEMBERS\` permission.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (!message.member.hasPermission("KICK_MEMBERS")) return message.channel.send(NoPerms)
    if (args[0] == "") {
        return;
    }
    let KickedUser = message.guild.member(message.mentions.users.first() || message.guild.members.cache.get(args[0]));
    let Usage = new Discord.MessageEmbed()
        .setDescription(`**Usage:** ${config.prefix}kick @user <optional reason>`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        .setColor("RANDOM")
    if (!KickedUser) return message.channel.send(Usage);
    var reason = args.join(" ").slice(22);
    if (!reason) {
        var reason = "No reason provided"
    }
    let HasPerms = new Discord.MessageEmbed()
        .setDescription(`This user has the \`\KICK_MEMBERS\` permission so they're exempt from being kicked.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (KickedUser.hasPermission("KICK_MEMBERS")) return message.channel.send(HasPerms);

    let KickEmbed = new Discord.MessageEmbed()
        .setTitle(`User Kicked!`)
        .setThumbnail(KickedUser.user.avatarURL())
        .setColor("RANDOM")
        .addField("User:", `${KickedUser.user.tag} (${KickedUser.user.id})`)
        .addField("Moderator:", `${message.author.tag} (${message.author.id})`)
        .setTimestamp()
        .addField("Reason", reason);

    let loggingChannel = message.guild.channels.cache.find(ch => ch.name === config.modlog)
    if (!loggingChannel) return;
    message.guild.member(KickedUser).kick(reason);
    message.channel.send(`${KickedUser.user.tag} Has been kicked.`)
    loggingChannel.send(KickEmbed);
}
module.exports.help = {
    name: "kick",
    aliases: ["kick"]
}