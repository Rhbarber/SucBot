const Discord = require("discord.js");
const config = require('../config.json');

module.exports.run = async (client, message, args) => {

    let NoPerms = new Discord.MessageEmbed()
        .setDescription(`You do not have the \`\BAN_MEMBERS\` permission.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (!message.member.hasPermission("BAN_MEMBERS")) return message.channel.send(NoPerms);
    if (args[0] == "") {
        return;
    }
    let BannedUser = message.guild.member(message.mentions.users.first() || message.guild.members.cache.get(args[0]));
    let Usage = new Discord.MessageEmbed()
        .setDescription(`**Usage:** ${config.prefix}ban @user <optional reason>`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        .setColor("RANDOM")
    if (!BannedUser) return message.channel.send(Usage);
    var reason = args.join(" ").slice(22);
    if (!reason) {
        var reason = "No reason provided"
    }
    let HasPerms = new Discord.MessageEmbed()
        .setDescription(`This user has the \`\BAN_MEMBERS\` permission so they're exempt from being banned.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (BannedUser.hasPermission("BAN_MEMBERS")) return message.channel.send(HasPerms);

    let BanEmbed = new Discord.MessageEmbed()
        .setTitle(`User Banned!!`)
        .setThumbnail(BannedUser.user.avatarURL())
        .setColor("RANDOM")
        .addField("User:", `${BannedUser.user.tag} (${BannedUser.user.id})`)
        .addField("Moderator:", `${message.author.tag} (${message.author.id})`)
        .setTimestamp()
        .addField("Reason", reason);

    let loggingChannel = message.guild.channels.cache.find(ch => ch.name === config.modlog)
    if (!loggingChannel) return;
    message.guild.members.ban(BannedUser).reason;
    message.channel.send(`${BannedUser.user.tag} Has been banned.`)
    loggingChannel.send(BanEmbed);
}
module.exports.help = {
    name: "ban",
    aliases: ["ban"]
}