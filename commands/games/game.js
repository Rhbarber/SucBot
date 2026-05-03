const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// RAWG no longer returns store URLs — build them from known store slugs
const STORE_URLS = {
    "steam":               "https://store.steampowered.com/app/",
    "playstation-store":   "https://store.playstation.com",
    "xbox-store":          "https://www.xbox.com/games",
    "xbox360":             "https://marketplace.xbox.com",
    "apple-appstore":      "https://apps.apple.com",
    "gog":                 "https://www.gog.com",
    "nintendo":            "https://www.nintendo.com/store",
    "google-play":         "https://play.google.com/store",
    "itch.io":             "https://itch.io",
    "epic-games":          "https://store.epicgames.com",
};

const STORE_EMOJIS = {
    "steam":               "🖥️",
    "playstation-store":   "🎮",
    "xbox-store":          "🎮",
    "xbox360":             "🎮",
    "apple-appstore":      "🍎",
    "gog":                 "🛒",
    "nintendo":            "🕹️",
    "google-play":         "📱",
    "itch.io":             "🎲",
    "epic-games":          "🛒",
};

const PLATFORM_EMOJIS = {
    pc:        "🖥️",
    playstation5: "🎮",
    playstation4: "🎮",
    "xbox-one": "🎮",
    "xbox-series-x": "🎮",
    nintendo:  "🕹️",
    ios:       "📱",
    android:   "📱",
    macos:     "🍎",
    linux:     "🐧",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("game")
        .setDescription("Look up a video game.")
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("Game title to search for")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const apiKey = process.env.RAWG_API_KEY;
        if (!apiKey) {
            return interaction.editReply({ content: "❌ `RAWG_API_KEY` is not set in the `.env` file." });
        }

        const title = interaction.options.getString("title");

        // Search for the game
        const searchRes = await fetch(
            `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(title)}&page_size=1`
        );
        const searchData = await searchRes.json();

        if (!searchData.results?.length) {
            return interaction.editReply({ content: `❌ No game found for \`${title}\`.` });
        }

        const gameId = searchData.results[0].id;

        // Fetch full game details and store links in parallel
        const [gameRes, storesRes] = await Promise.all([
            fetch(`https://api.rawg.io/api/games/${gameId}?key=${apiKey}`),
            fetch(`https://api.rawg.io/api/games/${gameId}/stores?key=${apiKey}`),
        ]);
        const game       = await gameRes.json();
        const storesData = storesRes.ok ? await storesRes.json() : null;

        // Build a map of store_id → direct URL from the stores endpoint
        const storeUrlMap = {};
        for (const s of storesData?.results ?? []) {
            storeUrlMap[s.store_id] = s.url;
        }

        const platforms = (game.platforms ?? [])
            .map(p => {
                const slug = p.platform.slug;
                const emoji = Object.entries(PLATFORM_EMOJIS).find(([k]) => slug.includes(k))?.[1] ?? "🎮";
                return `${emoji} ${p.platform.name}`;
            })
            .slice(0, 6)
            .join("\n") || "Unknown";

        const genres = game.genres?.map(g => g.name).join(", ") || "Unknown";
        const devs   = game.developers?.map(d => d.name).join(", ") || "Unknown";
        const stores = game.stores?.length
            ? game.stores.slice(0, 5).map(s => {
                const slug  = s.store.slug;
                const emoji = STORE_EMOJIS[slug] ?? "🛒";
                // Prefer direct link from stores endpoint, fall back to store homepage
                const url   = storeUrlMap[s.id] ?? STORE_URLS[slug] ?? `https://rawg.io/games/${game.slug}`;
                return `[${emoji} ${s.store.name}](${url})`;
            }).join(" • ")
            : "N/A";

        // Strip HTML tags from description
        const description = game.description_raw
            ? game.description_raw.split("\n")[0].slice(0, 300) + (game.description_raw.length > 300 ? "..." : "")
            : "No description available.";

        const ratingBar = game.rating
            ? "⭐".repeat(Math.round(game.rating)) + `  **${game.rating}/5** (${game.ratings_count?.toLocaleString()} ratings)`
            : "No ratings yet";

        const metacritic = game.metacritic
            ? `**${game.metacritic}/100**`
            : "N/A";

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(game.name)
            .setURL(`https://rawg.io/games/${game.slug}`)
            .setDescription(description)
            .setThumbnail(game.background_image ?? null)
            .addFields(
                { name: "🗓️ Released",     value: game.released ?? "TBA",       inline: true  },
                { name: "⏱️ Playtime",     value: game.playtime ? `~${game.playtime}h` : "N/A", inline: true },
                { name: "🏆 Metacritic",   value: metacritic,                    inline: true  },
                { name: "⭐ Rating",        value: ratingBar,                     inline: false },
                { name: "🎭 Genres",        value: genres,                        inline: true  },
                { name: "🛠️ Developers",   value: devs,                          inline: true  },
                { name: "🖥️ Platforms",    value: platforms,                     inline: false },
                { name: "🛒 Where to Buy", value: stores,                        inline: false },
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag} • Powered by RAWG.io`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};