# SucBot

A Discord bot modernized to discord.js v14 with Slash Commands.

## Requirements

- Node.js **v18 or higher**
- A bot application on the [Discord Developer Portal](https://discord.com/developers/applications)

## Installation

```bash
npm install
```

## Configuration

Configuration is split across two files: `.env` for sensitive credentials and `config.json` for general bot settings.

### `.env`

Create a `.env` file at the root of the project (you can copy `.env.example` as a starting point). **Never commit this file to Git.**

```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
STATUS=with discord.js v14

# Required for /lol command
# Get a free key at https://developer.riotgames.com
RIOT_API_KEY=your_riot_api_key_here

# Required for /fortnite command
# Get a free key at https://dash.fortnite-api.com/account (log in with Discord)
FORTNITE_API_KEY=your_fortnite_api_key_here

# Required for /hypixel command
# Get a free key at https://api.hypixel.net
HYPIXEL_API_KEY=your__hypixel_api_key_here

# Required for /weather command
# Get a free key at https://openweathermap.org/api (1,000 calls/day free)
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Required for /game command
# Get a free key at https://rawg.io/apidocs
RAWG_API_KEY=your_rawg_api_key_here
```

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | ✅ | Your bot's token. Found at [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot** → **Token**. |
| `CLIENT_ID` | ✅ | Your application's ID. Found under **General Information** → **Application ID**. |
| `STATUS` | ❌ | Activity status text displayed by the bot. Defaults to `with discord.js v14` if not set. Can also be changed at runtime with `/setstatus`. |
| `RIOT_API_KEY` | ⚠️ | Required for `/lol`. Get a free key at [developer.riotgames.com](https://developer.riotgames.com). Development keys expire every 24h — apply for a Personal API Key for a permanent one. |
| `FORTNITE_API_KEY` | ⚠️ | Required for `/fortnite`. Get a free key at [dash.fortnite-api.com/account](https://dash.fortnite-api.com/account) by logging in with Discord. |
| `HYPIXEL_API_KEY` | ⚠️ | Required for `/hypixel`. Generate a free key at [https://developer.hypixel.net](https://developer.hypixel.net/) |
| `OPENWEATHER_API_KEY` | ⚠️ | Required for `/weather`. Get a free key at [openweathermap.org/api](https://openweathermap.org/api). Free tier includes 1,000 calls/day. |
| `RAWG_API_KEY` | ⚠️ | Required for `/game`. Get a free key at [rawg.io/apidocs](https://rawg.io/apidocs). Free for personal use. |

---

### `config.json`

```json
{
    "devMode": true,
    "guildId": "YOUR_DEV_SERVER_ID_HERE",
    "ownerIds": ["YOUR_DISCORD_USER_ID_HERE"],
    "embedColor": "#5865F2",
    "cooldown": 3,
    "logChannelId": "YOUR_LOG_CHANNEL_ID_HERE",
    "database": {
        "type": "sqlite",
        "mysql": {
            "host": "localhost",
            "port": 3306,
            "user": "your_user",
            "password": "your_password",
            "database": "sucbot"
        }
    }
}
```

| Field | Type | Description |
|---|---|---|
| `devMode` | `boolean` | When `true`, Slash Commands are registered only to the server defined in `guildId`, making registration instant. Recommended during development. Set to `false` for production to register commands globally (may take up to 1 hour to propagate). |
| `guildId` | `string` | ID of your development server. Only used when `devMode` is `true`. To get the ID, enable **Developer Mode** in Discord (Settings → Advanced) then right-click the server → **Copy Server ID**. |
| `ownerIds` | `string[]` | Array of Discord user IDs that have full access to owner-only commands. Commands with `ownerOnly: true` are also accessible by server administrators. To get a user ID, enable **Developer Mode** in Discord then right-click the username → **Copy User ID**. Example: `["123456789", "987654321"]` |
| `embedColor` | `string` | Default color for all bot embeds, in hex format. Accessible in any command via `client.config.embedColor`. |
| `cooldown` | `number` | Default cooldown in seconds between command uses per user. Individual commands can override this by exporting their own `cooldown` field. |
| `logChannelId` | `string` | ID of the text channel where the bot will post a startup message and a detailed embed whenever a command throws an error. Set to `""` or remove the field to disable Discord logging. |
| `database.type` | `string` | Which database backend to use. Accepted values: `"sqlite"` (default, no setup needed) or `"mysql"` (requires a running MySQL/MariaDB server and the fields below). |
| `database.mysql.host` | `string` | Hostname or IP of your MySQL/MariaDB server. |
| `database.mysql.port` | `number` | Port of your MySQL/MariaDB server. Default is `3306`. |
| `database.mysql.user` | `string` | Database username. |
| `database.mysql.password` | `string` | Database password. |
| `database.mysql.database` | `string` | Name of the database to use. The bot will create the required tables automatically on first run. |

## Usage

```bash
npm start
```

Slash Commands are registered automatically when the bot starts.

## Creating new commands

Every file in `/commands` must export the following structure:

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("name")
        .setDescription("Command description."),

    cooldown: 10,      // optional: overrides the default cooldown from config.json
    ownerOnly: false,  // optional: if true, only the ownerId can use this command

    async execute(interaction, client) {
        // client.config gives access to everything in config.json
        await interaction.reply("Hello!");
    },
};
```

## Changes from the original made by [AshiePleb](https://github.com/AshiePleb)

| Before | Now |
|---|---|
| `discord.js` v12 | `discord.js` v14 |
| Prefix commands (`!cmd`) | Slash Commands (`/cmd`) |
| `discord.js-commando` (abandoned) | Removed |
| `snekfetch` (deprecated) | Removed (use native `fetch`) |
| `moment` (maintenance mode) | `dayjs` |
| `quick.db` (known vulnerabilities) | `better-sqlite3` |
| `fs` npm package (unnecessary) | Native `node:fs` |
| `message` listener nested inside `ready` | Correctly separated |
| Errors silenced with `catch(e) {}` | Proper error handling |

## Commands

### 🛡️ Moderation
| Command | Description | Permission |
|---|---|---|
| `/ban` | Ban a member with optional reason and message deletion | Ban Members |
| `/unban` | Unban a user by their ID | Ban Members |
| `/softban` | Ban then immediately unban to delete message history | Ban Members |
| `/massban` | Ban up to 50 users by ID at once — useful after raids | Ban Members |
| `/kick` | Kick a member with an optional reason | Kick Members |
| `/mute` | Time out a member for a set duration | Moderate Members |
| `/unmute` | Remove a timeout from a member | Moderate Members |
| `/warn` | Issue a warning to a member (stored in DB, DMs the user) | Moderate Members |
| `/warnings list` | View all warnings for a member | Moderate Members |
| `/warnings remove` | Remove a specific warning by ID | Moderate Members |
| `/warnings clear` | Clear all warnings for a member | Moderate Members |
| `/note add` | Add a private moderator note to a member | Moderate Members |
| `/note list` | View all notes for a member (ephemeral) | Moderate Members |
| `/note remove` | Remove a note by ID | Moderate Members |
| `/purge` | Bulk delete up to 100 messages, optionally filtered by user | Manage Messages |
| `/lock` | Prevent @everyone from sending messages in a channel | Manage Channels |
| `/unlock` | Restore messaging permissions in a locked channel | Manage Channels |
| `/slowmode` | Set or clear slowmode in a channel (0–6h) | Manage Channels |

### 💰 Economy
| Command | Description |
|---|---|
| `/balance` | Check your own or another user's coin balance |
| `/daily` | Collect your daily reward (100 🪙, 24h cooldown) |
| `/weekly` | Collect your weekly reward (500 🪙, 7d cooldown) |
| `/work` | Work a random job for coins (12h cooldown) |
| `/transfer` | Send coins to another member |
| `/leaderboard` | Top 10 richest members in the server |
| `/inventory` | View your or another user's item inventory |

### ℹ️ Info
| Command | Description |
|---|---|
| `/weather` | Current weather for any city — temperature, humidity, wind, sunrise/sunset | 
| `/userinfo` | Account age, roles, join date, badges and more for a user |
| `/serverinfo` | Server stats, member count, boost level, and more |
| `/ping` | Bot latency, WebSocket ping, RAM usage, and uptime |

### 🎮 Games
| Command | Description | Requires |
|---|---|---|
| `/lol` | League of Legends profile — rank, W/L, KDA, champion mastery | `RIOT_API_KEY` in `.env` |
| `/fortnite` | Fortnite stats — wins, K/D, win rate across all modes | `FORTNITE_API_KEY` in `.env` |
| `/game` | Video game lookup — rating, genres, platforms, Metacritic, where to buy | `RAWG_API_KEY` in `.env` |
| `/skin` | Minecraft player skin head | Nothing |
| `/ip` | Minecraft server info | Nothing |

### 🐾 Fun
| Command | Description |
|---|---|
| `/trivia` | Random trivia question with interactive buttons, category & difficulty options |
| `/joke` | Random joke with category and safe mode options |
| `/advice` | Random piece of advice |
| `/dog` | Random dog picture |
| `/cat` | Random cat picture |
| `/fox` | Random fox picture |

### 🔧 Owner Only
| Command | Description |
|---|---|
| `/resetcooldown` | Reset a daily/weekly/work cooldown for any user |
| `/announce` | Send a formatted announcement embed to any channel with optional ping |
| `/setstatus` | Change the bot's activity and online status on the fly |
| `/maintenance` | Toggle maintenance mode — blocks all non-owner commands |
| `/eval` | Execute JavaScript and return the result — useful for debugging |
| `/massban` | Ban up to 50 users by ID at once (also usable by members with Ban Members) |

---

## API Keys

### Riot Games (League of Legends)
1. Go to [developer.riotgames.com](https://developer.riotgames.com) and log in
2. A **Development API Key** is generated automatically — it's free but expires every 24 hours
3. For a permanent key, submit a **Personal API Key** application (free, takes a few days)
4. Add the key to your `.env` as `RIOT_API_KEY`

### Fortnite-API (Fortnite)
1. Go to [dash.fortnite-api.com/account](https://dash.fortnite-api.com/account) and log in with Discord
2. Generate a free API key from the dashboard
3. Add the key to your `.env` as `FORTNITE_API_KEY`

### Hypixel (Minecraft)
1. Go to [https://developer.hypixel.net](https://developer.hypixel.net) and log in
2. Click "REGENERATE API KEY"
3. Add it to your `.env` as `HYPIXEL_API_KEY`

### OpenWeatherMap (Weather)
1. Go to [openweathermap.org/api](https://openweathermap.org/api) and sign up
2. Your API key will be emailed to you and also available on your account page
3. Add the key to your `.env` as `OPENWEATHER_API_KEY`
4. Note: new keys may take a few minutes to activate

### RAWG (Game Lookup)
1. Go to [rawg.io/apidocs](https://rawg.io/apidocs) and sign up
2. Fill in the short developer info form to receive your key
3. Add the key to your `.env` as `RAWG_API_KEY`