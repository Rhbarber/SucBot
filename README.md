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

Create a `.env` file at the root of the project (you can copy `.env.example` as a starting point).

```env
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
STATUS=with discord.js v14
```

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | ✅ | Your bot's token. Found at [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot** → **Token**. |
| `CLIENT_ID` | ✅ | Your application's ID. Found under **General Information** → **Application ID**. |
| `STATUS` | ❌ | Activity status text displayed by the bot. Defaults to `with discord.js v14` if not set. |

---

### `config.json`

```json
{
    "devMode": true,
    "guildId": "YOUR_DEV_SERVER_ID_HERE",
    "ownerId": "YOUR_DISCORD_USER_ID_HERE",
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
| `ownerId` | `string` | Your Discord user ID. Commands that export `ownerOnly: true` will only be executable by this user. To get your ID, enable **Developer Mode** then right-click your username → **Copy User ID**. |
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