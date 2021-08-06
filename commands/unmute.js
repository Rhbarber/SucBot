const Discord = require("discord.js");
const config = require('../config.json')

module.exports.run = async (bot, message, args) => {

    let NoPerms = new Discord.MessageEmbed()
        .setDescription(`You do not have the \`\MUTE_MEMBERS\` permission.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (!message.member.hasPermission("MUTE_MEMBERS")) return message.channel.send(NoPerms);
    if (args[0] == "") {
        return;
    }

    let muterole = message.guild.roles.cache.find(x => x.name === config.mutedrole);
    let UnMutedUser = message.guild.member(message.mentions.users.first() || message.guild.members.cache.get(args[0]));
    let Usage = new Discord.MessageEmbed()
        .setDescription(`**Usage:** ${config.prefix}unmute @user <optional reason>`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        .setColor("RANDOM")
    if (!UnMutedUser) return message.channel.send(Usage);
    var reason = args.join(" ").slice(22);
    if (!reason) {
        var reason = "No reason provided"
    }

    let HasPerms = new Discord.MessageEmbed()
        .setDescription(`This user has the \`\MUTE_MEMBERS\` permission so they're exempt from being unmuted.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (UnMutedUser.hasPermission("MUTE_MEMBERS")) return message.channel.send(HasPerms);

    let UnMuteEmbed = new Discord.MessageEmbed()
        .setTitle(`User UnMuted!`)
        .setThumbnail(UnMutedUser.user.avatarURL())
        .setColor("RANDOM")
        .addField("User:", `${UnMutedUser.user.tag} (${UnMutedUser.user.id})`)
        .addField("Moderator:", `${message.author.tag} (${message.author.id})`)
        .setTimestamp()
        .addField("Reason", reason);

    let loggingChannel = message.guild.channels.cache.find(ch => ch.name === config.modlog)
    if (!loggingChannel) return;
    await (UnMutedUser.roles.remove(muterole.id));
    message.channel.send(`${UnMutedUser.user.tag} Has been unmuted.`)
    loggingChannel.send(UnMuteEmbed);
}

module.exports.help = {
    name: "unmute",
    aliases: ["unmute"]
}