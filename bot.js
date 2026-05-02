const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    EmbedBuilder,
    Colors,
    MessageFlags,
    PermissionFlagsBits,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ quiet: true });

const config = require("./config.json");

// ── Validate required env vars ──────────────────────────────────────────────
const token    = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const status   = process.env.STATUS ?? "with discord.js v14";

if (!token || !clientId) {
    throw new Error("[ERROR] TOKEN and CLIENT_ID must be set in your .env file.");
}

// ── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands          = new Collection();
client.cooldowns         = new Collection();
client.config            = config;
client.maintenance       = false;
client.maintenanceMessage = "The bot is currently undergoing maintenance. Please try again later.";

// ── Load commands (walks all subdirectories of /commands) ────────────────────
const commandsPath = path.join(__dirname, "commands");

function loadCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            loadCommands(fullPath); // recurse into subdirectory
            continue;
        }

        if (!entry.name.endsWith(".js")) continue;

        const command = require(fullPath);

        if (!("data" in command) || !("execute" in command)) {
            console.warn(`[WARN] ${fullPath} is missing "data" or "execute". Skipping.`);
            continue;
        }

        client.commands.set(command.data.name, command);
    }
}

loadCommands(commandsPath);

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

    // Maintenance mode guard — block all non-owner commands
    if (client.maintenance) {
        const isOwner = config.ownerIds?.includes(interaction.user.id);
        const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !isAdmin) {
            return interaction.reply({
                content: `🔧 ${client.maintenanceMessage}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }

    // Owner-only guard: allow owners (array) or members with Administrator permission
    if (command.ownerOnly) {
        const isOwner = config.ownerIds?.includes(interaction.user.id);
        const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !isAdmin) {
            return interaction.reply({
                content: "This command is restricted to bot owners and server administrators.",
                flags: MessageFlags.Ephemeral,
            });
        }
    }

    // Cooldown guard
    const cooldownMessage = checkCooldown(interaction, command);
    if (cooldownMessage) {
        return interaction.reply({ content: cooldownMessage, flags: MessageFlags.Ephemeral });
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

        const reply = { content: "Something went wrong while running this command.", flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(console.error);
        } else {
            await interaction.reply(reply).catch(console.error);
        }
    }
});

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once("clientReady", async () => {
    console.log(`[BOT] Logged in as ${client.user.tag}`);
    await client.user.setActivity(status);
    await deployCommands();

    await logToChannel(`✅ **${client.user.tag}** is online. Mode: \`${config.devMode ? "dev" : "production"}\``);
});

client.login(token);