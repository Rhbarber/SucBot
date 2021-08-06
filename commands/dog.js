const snekfetch = require('snekfetch');

module.exports.run = async (bot, message, args) => {
    const { body } = await snekfetch.get('https://random.dog/woof.json');
    message.channel.send(body.url)
}
module.exports.help = {
    name: "dog",
    aliases: ["doggo", "prro"]
}