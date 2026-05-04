const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, cooldowns, stats } = require("../../db");
const { randomInt } = require("node:crypto");

const COOLDOWN = 30 * 1000;

const SYMBOLS = [
    { emoji: "🍒", weight: 30, multiplier: 2   },
    { emoji: "🍋", weight: 25, multiplier: 3   },
    { emoji: "🍊", weight: 20, multiplier: 4   },
    { emoji: "🍇", weight: 12, multiplier: 6   },
    { emoji: "💎", weight: 8,  multiplier: 10  },
    { emoji: "7️⃣",  weight: 4,  multiplier: 25  },
    { emoji: "🎰", weight: 1,  multiplier: 100 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function spin() {
    let roll = randomInt(0, TOTAL_WEIGHT);
    for (const symbol of SYMBOLS) {
        if (roll < symbol.weight) return symbol;
        roll -= symbol.weight;
    }
    return SYMBOLS[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slots")
        .setDescription("Spin the slot machine and try your luck!")
        .addIntegerOption(o =>
            o.setName("bet").setDescription("Amount to bet").setMinValue(1).setRequired(true)
        ),

    async execute(interaction, _client) {
        const { guildId } = interaction;
        const userId  = interaction.user.id;
        const bet     = interaction.options.getInteger("bet");

        const last = await cooldowns.get("slots", guildId, userId);
        if (last && Date.now() - last < COOLDOWN) {
            const retry = `<t:${Math.floor((last + COOLDOWN) / 1000)}:R>`;
            return interaction.reply({ content: `⏳ You can spin again ${retry}.`, flags: MessageFlags.Ephemeral });
        }

        const balance = await economy.getBalance(guildId, userId);
        if (bet > balance) {
            return interaction.reply({ content: `❌ You only have **${balance}** 🪙.`, flags: MessageFlags.Ephemeral });
        }

        const reels  = [spin(), spin(), spin()];
        const line   = reels.map(r => r.emoji).join(" | ");

        // Win conditions
        const allSame  = reels[0].emoji === reels[1].emoji && reels[1].emoji === reels[2].emoji;
        const twoSame  = reels[0].emoji === reels[1].emoji || reels[1].emoji === reels[2].emoji || reels[0].emoji === reels[2].emoji;

        let multiplier = 0;
        let resultText;

        if (allSame) {
            multiplier = reels[0].multiplier;
            resultText = `🎉 **JACKPOT!** All three match! **${multiplier}x** multiplier!`;
        } else if (twoSame) {
            multiplier = 0.5;
            resultText = `✨ Two in a row! You get half your bet back.`;
        } else {
            resultText = `💸 No match. Better luck next time!`;
        }

        const winnings = Math.floor(bet * multiplier);
        const delta    = winnings - bet;
        await economy.addBalance(guildId, userId, delta);
        await cooldowns.set("slots", guildId, userId);
        await stats.increment(guildId, userId, "games_played");
        if (delta > 0) {
            await stats.increment(guildId, userId, "games_won");
            await stats.increment(guildId, userId, "total_earned", delta);
        } else if (delta < 0) {
            await stats.increment(guildId, userId, "total_lost", Math.abs(delta));
        }

        const newBalance = await economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor(delta > 0 ? "#2ecc71" : delta === 0 ? "#f39c12" : "#e74c3c")
            .setTitle("🎰 Slot Machine")
            .setDescription(`╔══════════════╗\n║  ${line}  ║\n╚══════════════╝\n\n${resultText}`)
            .addFields(
                { name: "Bet",         value: `${bet} 🪙`,         inline: true },
                { name: delta >= 0 ? "Won" : "Lost", value: `${Math.abs(delta)} 🪙`, inline: true },
                { name: "Balance",     value: `${newBalance} 🪙`,  inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};