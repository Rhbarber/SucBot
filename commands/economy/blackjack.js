const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType,
} = require("discord.js");
const { economy, cooldowns, stats } = require("../../db");
const { randomInt } = require("node:crypto");

const COOLDOWN = 30 * 1000;

const SUITS  = ["♠️", "♥️", "♦️", "♣️"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardValue(card) {
    if (["J", "Q", "K"].includes(card.value)) return 10;
    if (card.value === "A") return 11;
    return parseInt(card.value);
}

function handValue(hand) {
    let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
    let aces  = hand.filter(c => c.value === "A").length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function formatHand(hand, hideSecond = false) {
    return hand.map((c, i) => (hideSecond && i === 1) ? "🂠" : `${c.value}${c.suit}`).join("  ");
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play a round of Blackjack against the dealer.")
        .addIntegerOption(o =>
            o.setName("bet").setDescription("Amount to bet").setMinValue(1).setRequired(true)
        ),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId = interaction.user.id;
        const bet    = interaction.options.getInteger("bet");

        const last = await cooldowns.get("blackjack", guildId, userId);
        if (last && Date.now() - last < COOLDOWN) {
            const retry = `<t:${Math.floor((last + COOLDOWN) / 1000)}:R>`;
            return interaction.reply({ content: `⏳ You can play again ${retry}.`, flags: MessageFlags.Ephemeral });
        }

        const balance = await economy.getBalance(guildId, userId);
        if (bet > balance) {
            return interaction.reply({ content: `❌ You only have **${balance}** 🪙.`, flags: MessageFlags.Ephemeral });
        }

        const deck       = buildDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        await cooldowns.set("blackjack", guildId, userId);
        await stats.increment(guildId, userId, "games_played");

        const buildEmbed = (playerHand, dealerHand, hideDealer, status, color) => new EmbedBuilder()
            .setColor(color ?? client.config.embedColor)
            .setTitle("🃏 Blackjack")
            .addFields(
                { name: `🧑 Your Hand (${handValue(playerHand)})`,               value: formatHand(playerHand),          inline: false },
                { name: `🏦 Dealer's Hand (${hideDealer ? "?" : handValue(dealerHand)})`, value: formatHand(dealerHand, hideDealer), inline: false },
            )
            .setDescription(status ?? null)
            .setFooter({ text: `Bet: ${bet} 🪙`, });

        // Check immediate blackjack
        const playerBJ = handValue(playerHand) === 21;
        const dealerBJ = handValue(dealerHand) === 21;

        if (playerBJ || dealerBJ) {
            let delta = 0, result;
            if (playerBJ && dealerBJ) {
                result = "🤝 Both have Blackjack — it's a push!";
            } else if (playerBJ) {
                delta = Math.floor(bet * 1.5);
                result = `🎉 **Blackjack!** You win **${delta}** 🪙!`;
            } else {
                delta = -bet;
                result = `💀 Dealer has Blackjack. You lose **${bet}** 🪙.`;
            }
            await economy.addBalance(guildId, userId, delta);
            if (delta > 0) {
                await stats.increment(guildId, userId, "games_won");
                await stats.increment(guildId, userId, "total_earned", delta);
            } else if (delta < 0) {
                await stats.increment(guildId, userId, "total_lost", Math.abs(delta));
            }
            return interaction.reply({ embeds: [buildEmbed(playerHand, dealerHand, false, result, delta >= 0 ? "#2ecc71" : "#e74c3c")] });
        }

        // Build Hit / Stand / Double buttons
        const actionRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("bj_hit").setLabel("👊 Hit").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("bj_stand").setLabel("✋ Stand").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("bj_double").setLabel("💰 Double Down").setStyle(ButtonStyle.Success)
                .setDisabled(balance < bet * 2),
        );

        const msg = await interaction.reply({
            embeds: [buildEmbed(playerHand, dealerHand, true, null, null)],
            components: [actionRow()],
            fetchReply: true,
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === userId,
            time: 60_000,
        });

        let doubled = false;

        collector.on("collect", async btn => {
            await btn.deferUpdate();

            if (btn.customId === "bj_hit" || btn.customId === "bj_double") {
                if (btn.customId === "bj_double") {
                    doubled = true;
                }
                playerHand.push(deck.pop());
            }

            const pVal = handValue(playerHand);

            // Bust
            if (pVal > 21) {
                collector.stop("bust");
                return;
            }

            // Auto-stand after double
            if (doubled) {
                collector.stop("stand");
                return;
            }

            // 21 — auto stand
            if (pVal === 21) {
                collector.stop("stand");
                return;
            }

            await interaction.editReply({
                embeds: [buildEmbed(playerHand, dealerHand, true, null, null)],
                components: [actionRow()],
            });
        });

        collector.on("end", async (_, reason) => {
            const effectiveBet = doubled ? bet * 2 : bet;
            const pVal = handValue(playerHand);

            // Deduct double down extra if applicable
            if (doubled) await economy.addBalance(guildId, userId, -bet);

            if (reason === "bust") {
                await economy.addBalance(guildId, userId, -effectiveBet);
                await stats.increment(guildId, userId, "total_lost", effectiveBet);
                const disabled = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("bj_hit").setLabel("👊 Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
                    new ButtonBuilder().setCustomId("bj_stand").setLabel("✋ Stand").setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId("bj_double").setLabel("💰 Double Down").setStyle(ButtonStyle.Success).setDisabled(true),
                );
                return interaction.editReply({
                    embeds: [buildEmbed(playerHand, dealerHand, false, `💥 Bust! You went over 21 and lost **${effectiveBet}** 🪙.`, "#e74c3c")],
                    components: [disabled],
                });
            }

            // Dealer draws to 17
            while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());
            const dVal = handValue(dealerHand);

            let delta = 0, resultText;

            if (dVal > 21 || pVal > dVal) {
                delta = effectiveBet;
                resultText = `🎉 You win **${delta}** 🪙!`;
                await stats.increment(guildId, userId, "games_won");
                await stats.increment(guildId, userId, "total_earned", delta);
            } else if (pVal === dVal) {
                resultText = `🤝 Push — it's a tie!`;
            } else {
                delta = -effectiveBet;
                resultText = `💸 Dealer wins. You lost **${effectiveBet}** 🪙.`;
                await stats.increment(guildId, userId, "total_lost", effectiveBet);
            }

            await economy.addBalance(guildId, userId, delta);

            const disabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("bj_hit").setLabel("👊 Hit").setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId("bj_stand").setLabel("✋ Stand").setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId("bj_double").setLabel("💰 Double Down").setStyle(ButtonStyle.Success).setDisabled(true),
            );

            await interaction.editReply({
                embeds: [buildEmbed(playerHand, dealerHand, false, resultText, delta > 0 ? "#2ecc71" : delta === 0 ? "#f39c12" : "#e74c3c")],
                components: [disabled],
            }).catch(() => {});
        });
    },
};