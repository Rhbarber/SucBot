const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const PLATFORM_EMOJIS = { epic: "🖥️", psn: "🎮", xbl: "🎮" };

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fortnite")
        .setDescription("Look up a Fortnite player's stats.")
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("Epic Games username")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("platform")
                .setDescription("Platform (default: PC)")
                .addChoices(
                    { name: "PC / Epic",     value: "epic" },
                    { name: "PlayStation",   value: "psn"  },
                    { name: "Xbox",          value: "xbl"  },
                )
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const username  = interaction.options.getString("username");
        const platform  = interaction.options.getString("platform") ?? "pc";

        const apiKey = process.env.FORTNITE_API_KEY;
        if (!apiKey) {
            return interaction.editReply({ content: "❌ `FORTNITE_API_KEY` is not set in the `.env` file." });
        }

        try {
            const res = await fetch(
                `https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(username)}&accountType=${platform}&image=all`,
                { headers: { Authorization: apiKey } }
            );

            if (res.status === 404) {
                return interaction.editReply({ content: `❌ Player \`${username}\` not found.\nMake sure the username is correct and their stats are set to public in Fortnite settings.` });
            }
            if (!res.ok) {
                return interaction.editReply({ content: "❌ Could not reach the Fortnite API. Try again later." });
            }

            const { data } = await res.json();
            const overall   = data.stats.all.overall;
            const solos     = data.stats.all.solo;
            const duos      = data.stats.all.duo;
            const squads    = data.stats.all.squad;

            const formatMode = (mode, label) => {
                if (!mode) return null;
                const wr = mode.winRate?.toFixed(1) ?? "0.0";
                const kd = mode.kd?.toFixed(2) ?? "0.00";
                return `${label}: **${mode.wins}** wins | **${wr}%** WR | **${kd}** K/D | **${mode.matches}** matches`;
            };

            const modeLines = [
                formatMode(solos,  "👤 Solos"),
                formatMode(duos,   "👥 Duos"),
                formatMode(squads, "👨‍👩‍👧‍👦 Squads"),
            ].filter(Boolean).join("\n");

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`${PLATFORM_EMOJIS[platform]} ${data.account.name} — Fortnite Stats`)
                .setThumbnail("https://fortnite-api.com/images/fortnite-api.png")
                .addFields(
                    { name: "🏆 Total Wins",    value: `${overall.wins.toLocaleString()}`,    inline: true },
                    { name: "💀 Total Kills",   value: `${overall.kills.toLocaleString()}`,   inline: true },
                    { name: "🎮 Total Matches", value: `${overall.matches.toLocaleString()}`, inline: true },
                    { name: "📊 Overall K/D",   value: `${overall.kd?.toFixed(2) ?? "N/A"}`, inline: true },
                    { name: "🎯 Win Rate",      value: `${overall.winRate?.toFixed(1) ?? "N/A"}%`, inline: true },
                    { name: "🏅 Top 25%",       value: `${overall.top25?.toLocaleString() ?? "N/A"}`, inline: true },
                    { name: "📋 Breakdown by Mode", value: modeLines || "No mode data available." },
                )
                .setImage(data.image ?? null)
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Powered by fortnite-api.com`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("[FORTNITE]", err);
            await interaction.editReply({ content: "❌ Something went wrong fetching the Fortnite profile." });
        }
    },
};