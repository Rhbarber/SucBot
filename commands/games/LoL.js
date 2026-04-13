const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Rank tier colors
const TIER_COLORS = {
    IRON:        "#4a4a4a",
    BRONZE:      "#8c5a2b",
    SILVER:      "#a8a8a8",
    GOLD:        "#f0b429",
    PLATINUM:    "#4fc3a1",
    EMERALD:     "#2ecc71",
    DIAMOND:     "#4fc3f7",
    MASTER:      "#9b59b6",
    GRANDMASTER: "#e74c3c",
    CHALLENGER:  "#f1c40f",
};

const TIER_EMOJIS = {
    IRON:        "⬛",
    BRONZE:      "🟫",
    SILVER:      "🩶",
    GOLD:        "🟡",
    PLATINUM:    "🩵",
    EMERALD:     "💚",
    DIAMOND:     "💎",
    MASTER:      "🟣",
    GRANDMASTER: "🔴",
    CHALLENGER:  "🏆",
};

// Supported regions and their routing
const REGIONS = {
    na1:  { platform: "na1",  region: "americas" },
    euw1: { platform: "euw1", region: "europe"   },
    eune1:{ platform: "eune1",region: "europe"   },
    br1:  { platform: "br1",  region: "americas" },
    la1:  { platform: "la1",  region: "americas" },
    la2:  { platform: "la2",  region: "americas" },
    kr:   { platform: "kr",   region: "asia"     },
    jp1:  { platform: "jp1",  region: "asia"     },
    oc1:  { platform: "oc1",  region: "sea"      },
    tr1:  { platform: "tr1",  region: "europe"   },
    ru:   { platform: "ru",   region: "europe"   },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lol")
        .setDescription("Look up a League of Legends profile.")
        .addStringOption(option =>
            option
                .setName("summoner")
                .setDescription("Summoner name (or Riot ID in the format Name#TAG)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("region")
                .setDescription("Region (default: na1)")
                .addChoices(
                    { name: "NA",   value: "na1"   },
                    { name: "EUW",  value: "euw1"  },
                    { name: "EUNE", value: "eune1" },
                    { name: "BR",   value: "br1"   },
                    { name: "LAN",  value: "la1"   },
                    { name: "LAS",  value: "la2"   },
                    { name: "KR",   value: "kr"    },
                    { name: "JP",   value: "jp1"   },
                    { name: "OCE",  value: "oc1"   },
                    { name: "TR",   value: "tr1"   },
                    { name: "RU",   value: "ru"    },
                )
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const apiKey   = process.env.RIOT_API_KEY;
        if (!apiKey) {
            return interaction.editReply({ content: "❌ `RIOT_API_KEY` is not set in the `.env` file." });
        }

        const input    = interaction.options.getString("summoner");
        const regionKey = interaction.options.getString("region") ?? "na1";
        const { platform, region } = REGIONS[regionKey];

        const headers = { "X-Riot-Token": apiKey };

        try {
            let puuid, gameName, tagLine;

            // Support both "Name#TAG" (Riot ID) and legacy summoner name
            if (input.includes("#")) {
                [gameName, tagLine] = input.split("#");
                const accountRes = await fetch(
                    `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
                    { headers }
                );
                if (!accountRes.ok) return interaction.editReply({ content: `❌ Riot ID \`${input}\` not found.` });
                const account = await accountRes.json();
                puuid    = account.puuid;
                gameName = account.gameName;
                tagLine  = account.tagLine;
            } else {
                const summonerRes = await fetch(
                    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(input)}`,
                    { headers }
                );
                if (!summonerRes.ok) return interaction.editReply({ content: `❌ Summoner \`${input}\` not found on **${regionKey.toUpperCase()}**.` });
                const summoner = await summonerRes.json();
                puuid    = summoner.puuid;
                gameName = summoner.name;
            }

            // Get summoner data by PUUID
            const summonerRes = await fetch(
                `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
                { headers }
            );
            const summoner = await summonerRes.json();

            // Get ranked data
            const rankedRes = await fetch(
                `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
                { headers }
            );
            const rankedData = await rankedRes.json();

            const soloQueue  = rankedData.find(e => e.queueType === "RANKED_SOLO_5x5");
            const flexQueue  = rankedData.find(e => e.queueType === "RANKED_FLEX_SR");

            // Get champion mastery top 3
            const masteryRes = await fetch(
                `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`,
                { headers }
            );
            const masteries = await masteryRes.json();

            const formatRank = (entry) => {
                if (!entry) return "Unranked";
                const emoji = TIER_EMOJIS[entry.tier] ?? "❓";
                const wr    = ((entry.wins / (entry.wins + entry.losses)) * 100).toFixed(1);
                return `${emoji} ${entry.tier} ${entry.rank} — ${entry.leaguePoints} LP\n${entry.wins}W ${entry.losses}L (${wr}% WR)`;
            };

            const tierColor = soloQueue ? TIER_COLORS[soloQueue.tier] : client.config.embedColor;

            const embed = new EmbedBuilder()
                .setColor(tierColor)
                .setTitle(`${gameName}${tagLine ? `#${tagLine}` : ""} — ${regionKey.toUpperCase()}`)
                .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summoner.profileIconId}.png`)
                .addFields(
                    { name: "🎮 Level",       value: `${summoner.summonerLevel}`,    inline: true },
                    { name: "📊 Solo/Duo",    value: formatRank(soloQueue),          inline: false },
                    { name: "👥 Flex 5v5",    value: formatRank(flexQueue),          inline: false },
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            if (masteries.length) {
                embed.addFields({
                    name: "🏆 Top Champion Masteries",
                    value: masteries.map((m, i) =>
                        `${["🥇","🥈","🥉"][i]} Champion ID ${m.championId} — Level ${m.championLevel} (${m.championPoints.toLocaleString()} pts)`
                    ).join("\n"),
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error("[LOL]", err);
            await interaction.editReply({ content: "❌ Something went wrong fetching the League of Legends profile." });
        }
    },
};