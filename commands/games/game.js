const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

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

        // Fetch full game details
        const gameRes  = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${apiKey}`);
        const game     = await gameRes.json();

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
        const stores = game.stores?.map(s => `[${s.store.name}](${s.url ?? `https://rawg.io/games/${game.slug}`})`).slice(0, 4).join(" • ") || "N/A";

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