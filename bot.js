const Discord = require("discord.js");
const config = require("./config.json");
const fs = require("fs");
const bot = new Discord.Client({ disableEveryone: true });

bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();

fs.readdir("./commands/", (err, files) => {
    if (err) console.log(err);
    let jsfile = files.filter(f => f.split(".").pop() === "js");
    if (jsfile.length <= 0) {
        console.log("Couldn't find commands.");
        return;
    }
    jsfile.forEach((f, i) => {
        let props = require(`./commands/${f}`);
        bot.commands.set(props.help.name, props);
        props.help.aliases.forEach(alias => {
            bot.aliases.set(alias, props.help.name);
        });
    });
})

bot.on("ready", async () => {
    console.log(`Online`);

    await bot.user.setActivity(config.status);
    bot.on("message", async message => {
        if (message.author.bot) return;
        if (message.channel.type === "dm") return;
        let prefix = config.prefix
        let messageArray = message.content.split(" ");
        let args = message.content.slice(prefix.length).trim().split(/ +/g);
        let cmd = args.shift().toLowerCase();
        let commandfile;
        if (bot.commands.has(cmd)) {
            commandfile = bot.commands.get(cmd);
        } else if (bot.aliases.has(cmd)) {
            commandfile = bot.commands.get(bot.aliases.get(cmd));
        }
        if (!message.content.startsWith(prefix)) return;
        try {
            commandfile.run(bot, message, args);
        } catch (e) {
        }
    }
    )
})

bot.login(config.token);