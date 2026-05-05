const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, cooldowns, stats } = require("../../../db");
const { randomInt } = require("node:crypto");

const COOLDOWN = 30 * 1000; // 30 seconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Bet your coins on a coin flip.")
        .addIntegerOption(o =>
            o.setName("bet").setDescription("Amount to bet (or 'all')").setMinValue(1).setRequired(true)
        )
        .addStringOption(o =>
            o.setName("side")
             .setDescription("Heads or Tails")
             .setRequired(true)
             .addChoices(
                 { name: "Heads", value: "heads" },
                 { name: "Tails", value: "tails" },
             )
        ),

    async execute(interaction, _client) {
        const { guildId } = interaction;
        const userId  = interaction.user.id;
        const side    = interaction.options.getString("side");
        const bet     = interaction.options.getInteger("bet");

        const last = await cooldowns.get("coinflip", guildId, userId);
        if (last && Date.now() - last < COOLDOWN) {
            const retry = `<t:${Math.floor((last + COOLDOWN) / 1000)}:R>`;
            return interaction.reply({ content: `⏳ You can flip again ${retry}.`, flags: MessageFlags.Ephemeral });
        }

        const balance = await economy.getBalance(guildId, userId);
        if (bet > balance) {
            return interaction.reply({ content: `❌ You only have **${balance}** 🪙.`, flags: MessageFlags.Ephemeral });
        }

        const result = randomInt(0, 2) === 0 ? "heads" : "tails";
        const won    = result === side;
        const delta  = won ? bet : -bet;

        await economy.addBalance(guildId, userId, delta);
        await cooldowns.set("coinflip", guildId, userId);
        await stats.increment(guildId, userId, "games_played");
        if (won) {
            await stats.increment(guildId, userId, "games_won");
            await stats.increment(guildId, userId, "total_earned", bet);
        } else {
            await stats.increment(guildId, userId, "total_lost", bet);
        }

        const newBalance = await economy.getBalance(guildId, userId);
        const emoji      = result === "heads" ? "⬆️" : "⬇️";

        const embed = new EmbedBuilder()
            .setColor(won ? "#2ecc71" : "#e74c3c")
            .setTitle(`${emoji} ${result.charAt(0).toUpperCase() + result.slice(1)}! — ${won ? "You won!" : "You lost!"}`)
            .addFields(
                { name: "Your Pick",    value: side,                   inline: true },
                { name: "Result",       value: result,                 inline: true },
                { name: won ? "Won" : "Lost", value: `${bet} 🪙`,     inline: true },
                { name: "New Balance",  value: `${newBalance} 🪙`,    inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};