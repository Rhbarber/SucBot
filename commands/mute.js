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
    let MutedUser = message.guild.member(message.mentions.users.first() || message.guild.members.cache.get(args[0]));
    let Usage = new Discord.MessageEmbed()
        .setDescription(`**Usage:** ${config.prefix}mute @user <optional reason>`)
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        .setColor("RANDOM")
    if (!MutedUser) return message.channel.send(Usage);
    var reason = args.join(" ").slice(22);
    if (!reason) {
        var reason = "No reason provided"
    }

    let HasPerms = new Discord.MessageEmbed()
        .setDescription(`This user has the \`\MUTE_MEMBERS\` permission so they're exempt from being muted.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    if (MutedUser.hasPermission("MUTE_MEMBERS")) return message.channel.send(HasPerms);

    let MuteEmbed = new Discord.MessageEmbed()
        .setTitle(`User Muted!`)
        .setThumbnail(MutedUser.user.avatarURL())
        .setColor("RANDOM")
        .addField("User:", `${MutedUser.user.tag} (${MutedUser.user.id})`)
        .addField("Moderator:", `${message.author.tag} (${message.author.id})`)
        .setTimestamp()
        .addField("Reason", reason);

    let loggingChannel = message.guild.channels.cache.find(ch => ch.name === config.modlog)
    if (!loggingChannel) return;
    await (MutedUser.roles.add(muterole.id));
    message.channel.send(`${MutedUser.user.tag} Has been muted.`)
    loggingChannel.send(MuteEmbed);
}

module.exports.help = {
    name: "mute",
    aliases: ["mute"]
}