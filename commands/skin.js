const Discord = require('discord.js');
const request = require('request');

exports.run = async (client, message, args, level) => {
    let usage = new Discord.MessageEmbed()
        .setDescription(`Please enter your Minecraft username or UUID.`)
        .setColor("RANDOM")
        .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
    try {
        if (!args[0]) return message.channel.send(usage);
        let error1 = new Discord.MessageEmbed()
            .setDescription(`This is not a valid username or UUID.`)
            .setColor("RANDOM")
            .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
        request('https://cravatar.eu/helmhead/' + encodeURIComponent(args[0]) + '/200.png', (req, res, png) => {
            if (png == 'Invalid minecraft username or uuid.') return message.channel.send(error1);
            let skin1 = new Discord.MessageEmbed()
                .setImage(`https://cravatar.eu/helmhead/${args[0]}/200.png`)
                .setColor("RANDOM")
                .setFooter(`Requested By: ${message.author.tag} | ID: ${message.author.id}`, message.author.avatarURL())
            message.channel.send(skin1);
        });
    } catch (err) {
        message.channel.send('There was an error!\n' + err).catch();
    }
}
module.exports.help = {
    name: "skin",
    aliases: ["head"]
}