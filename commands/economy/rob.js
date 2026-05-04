const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, cooldowns, stats, inventory } = require("../../db");
const { randomInt } = require("node:crypto");

const COOLDOWN    = 5 * 60 * 1000; // 5 minutes
const SUCCESS     = 40;             // 40% success chance
const FINE_RATE   = 0.30;           // 30% of your wallet as fine if caught
const MIN_STEAL   = 50;             // target needs at least this much to rob

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to rob another member's wallet. Risky!")
        .addUserOption(o =>
            o.setName("user").setDescription("Who to rob").setRequired(true)
        ),

    async execute(interaction, _client) {
        const { guildId } = interaction;
        const robber = interaction.user;
        const target = interaction.options.getUser("user");

        if (target.id === robber.id) {
            return interaction.reply({ content: "You can't rob yourself.", flags: MessageFlags.Ephemeral });
        }
        if (target.bot) {
            return interaction.reply({ content: "Bots don't carry wallets.", flags: MessageFlags.Ephemeral });
        }

        const last = await cooldowns.get("rob", guildId, robber.id);
        if (last && Date.now() - last < COOLDOWN) {
            const retry = `<t:${Math.floor((last + COOLDOWN) / 1000)}:R>`;
            return interaction.reply({ content: `⏳ You need to lay low until ${retry}.`, flags: MessageFlags.Ephemeral });
        }

        const [robberBalance, targetBalance] = await Promise.all([
            economy.getBalance(guildId, robber.id),
            economy.getBalance(guildId, target.id),
        ]);

        if (targetBalance < MIN_STEAL) {
            return interaction.reply({ content: `❌ **${target.username}** doesn't have enough coins to rob (minimum ${MIN_STEAL} 🪙).`, flags: MessageFlags.Ephemeral });
        }

        await cooldowns.set("rob", guildId, robber.id);
        await stats.increment(guildId, robber.id, "rob_attempts");

        // Check if target has a shield
        const targetItems = await inventory.get(guildId, target.id);
        const shieldIdx   = targetItems.findIndex(i => i.item === "shield");
        if (shieldIdx !== -1) {
            await inventory.remove(guildId, target.id, "shield");
            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("🛡️ Robbery Blocked!")
                .setDescription(`**${target.username}** had a **Robbery Shield** equipped! Your attempt was blocked and the shield was consumed.`)
                .setFooter({ text: `Requested by ${robber.tag}`, iconURL: robber.displayAvatarURL() });
            return interaction.reply({ embeds: [embed] });
        }

        const success = randomInt(0, 100) < SUCCESS;

        if (success) {
            // Steal between 10% and 40% of target's wallet
            const pct    = (randomInt(10, 41)) / 100;
            const stolen = Math.max(1, Math.floor(targetBalance * pct));

            await economy.addBalance(guildId, robber.id, stolen);
            await economy.addBalance(guildId, target.id, -stolen);
            await stats.increment(guildId, target.id, "times_robbed");
            await stats.increment(guildId, robber.id, "total_earned", stolen);

            const embed = new EmbedBuilder()
                .setColor("#e67e22")
                .setTitle("🦹 Successful Robbery!")
                .setDescription(`You slipped into **${target.username}**'s wallet and made off with the loot!`)
                .addFields(
                    { name: "Stolen",       value: `${stolen} 🪙`,                              inline: true },
                    { name: "Your Balance", value: `${robberBalance + stolen} 🪙`,               inline: true },
                )
                .setFooter({ text: `Requested by ${robber.tag}`, iconURL: robber.displayAvatarURL() });

            return interaction.reply({ embeds: [embed] });
        } else {
            // Caught — pay a fine
            const fine = Math.max(1, Math.floor(robberBalance * FINE_RATE));
            const paid = Math.min(fine, robberBalance);

            await economy.addBalance(guildId, robber.id, -paid);
            await stats.increment(guildId, robber.id, "total_lost", paid);

            const embed = new EmbedBuilder()
                .setColor("#e74c3c")
                .setTitle("🚔 Caught Red-Handed!")
                .setDescription(`You tried to rob **${target.username}** but got caught! You paid a fine.`)
                .addFields(
                    { name: "Fine Paid",    value: `${paid} 🪙`,                                inline: true },
                    { name: "Your Balance", value: `${Math.max(0, robberBalance - paid)} 🪙`,   inline: true },
                )
                .setFooter({ text: `Requested by ${robber.tag}`, iconURL: robber.displayAvatarURL() });

            return interaction.reply({ embeds: [embed] });
        }
    },
};