const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    EmbedBuilder,
    Colors,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const config = require("./config.json");

// ── Validate required env vars ──────────────────────────────────────────────
const token    = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const status   = process.env.STATUS ?? "with discord.js v14";

if (!token || !clientId) {
    console.error("[ERROR] TOKEN and CLIENT_ID must be set in your .env file.");
    process.exit(1);
}

// ── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands  = new Collection();
client.cooldowns = new Collection();
client.config    = config;

// ── Load commands ─────────────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command  = require(filePath);

    if (!("data" in command) || !("execute" in command)) {
        console.warn(`[WARN] ${filePath} is missing "data" or "execute". Skipping.`);
        continue;
    }

    client.commands.set(command.data.name, command);
}

// ── Deploy slash commands ─────────────────────────────────────────────────────
async function deployCommands() {
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    const rest     = new REST().setToken(token);

    // devMode: register instantly to one guild; otherwise register globally (up to 1hr)
    const route = config.devMode
        ? Routes.applicationGuildCommands(clientId, config.guildId)
        : Routes.applicationCommands(clientId);

    const scope = config.devMode ? `guild ${config.guildId}` : "global";

    try {
        console.log(`[CMD] Registering ${commands.length} command(s) (${scope})...`);
        await rest.put(route, { body: commands });
        console.log(`[CMD] Commands registered successfully (${scope}).`);
    } catch (error) {
        console.error("[CMD] Failed to register commands:", error);
    }
}

// ── Log to Discord channel ────────────────────────────────────────────────────
async function logToChannel(message) {
    if (!config.logChannelId) return;

    try {
        const channel = await client.channels.fetch(config.logChannelId);
        if (channel?.isTextBased()) await channel.send(message);
    } catch {
        // Channel unavailable — fail silently so it never breaks the bot
    }
}

// ── Cooldown helper ───────────────────────────────────────────────────────────
function checkCooldown(interaction, command) {
    const cooldownAmount = (command.cooldown ?? config.cooldown) * 1_000;
    const key            = `${command.data.name}-${interaction.user.id}`;

    if (client.cooldowns.has(key)) {
        const expiresAt = client.cooldowns.get(key) + cooldownAmount;
        const remaining = ((expiresAt - Date.now()) / 1_000).toFixed(1);

        if (Date.now() < expiresAt) {
            return `You're on cooldown. Try again in **${remaining}s**.`;
        }
    }

    client.cooldowns.set(key, Date.now());
    setTimeout(() => client.cooldowns.delete(key), cooldownAmount);
    return null;
}

// ── Interaction handler ───────────────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Owner-only guard
    if (command.ownerOnly && interaction.user.id !== config.ownerId) {
        return interaction.reply({
            content: "This command is restricted to the bot owner.",
            ephemeral: true,
        });
    }

    // Cooldown guard
    const cooldownMessage = checkCooldown(interaction, command);
    if (cooldownMessage) {
        return interaction.reply({ content: cooldownMessage, ephemeral: true });
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`[ERROR] Command "${interaction.commandName}":`, error);

        // Log to Discord channel
        const embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle("Command Error")
            .addFields(
                { name: "Command", value: interaction.commandName },
                { name: "User",    value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Guild",   value: interaction.guild?.name ?? "DM" },
                { name: "Error",   value: `\`\`\`${String(error).slice(0, 1000)}\`\`\`` },
            )
            .setTimestamp();

        await logToChannel({ embeds: [embed] });

        const reply = { content: "Something went wrong while running this command.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(console.error);
        } else {
            await interaction.reply(reply).catch(console.error);
        }
    }
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once("ready", async () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    await client.user.setActivity(status);
    await deployCommands();

    await logToChannel(`✅ **${client.user.tag}** is online. Mode: \`${config.devMode ? "dev" : "production"}\``);
});

client.login(token);