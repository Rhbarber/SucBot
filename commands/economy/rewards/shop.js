const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, bank, inventory } = require("../../../db");

const SHOP_ITEMS = [
    {
        id:          "shield",
        name:        "🛡️ Robbery Shield",
        description: "Protects you from the next rob attempt. Single use.",
        price:       500,
    },
    {
        id:          "vault_upgrade",
        name:        "🏦 Vault Upgrade",
        description: "Increases your bank capacity by 2,500 🪙.",
        price:       1000,
        onBuy: async (guildId, userId) => {
            await bank.upgradeCapacity(guildId, userId, 2500);
        },
    },
    {
        id:          "lucky_charm",
        name:        "🍀 Lucky Charm",
        description: "Increases your coinflip win chance to 55% for 5 flips.",
        price:       750,
    },
    {
        id:          "pickpocket_kit",
        name:        "🦹 Pickpocket Kit",
        description: "Increases your rob success rate to 55% for your next 3 attempts.",
        price:       800,
    },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Browse and buy items from the shop.")
        .addStringOption(o =>
            o.setName("item")
             .setDescription("Item to buy (leave empty to browse)")
             .addChoices(SHOP_ITEMS.map(i => ({ name: `${i.name} — ${i.price} 🪙`, value: i.id })))
        ),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId  = interaction.user.id;
        const itemId  = interaction.options.getString("item");

        // Browse mode
        if (!itemId) {
            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle("🛒 Shop")
                .setDescription(
                    SHOP_ITEMS.map(i =>
                        `**${i.name}** — **${i.price}** 🪙\n${i.description}`
                    ).join("\n\n")
                )
                .setFooter({ text: "Use /shop item:<name> to buy an item" });

            return interaction.reply({ embeds: [embed] });
        }

        // Buy mode
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) {
            return interaction.reply({ content: "❌ Item not found.", flags: MessageFlags.Ephemeral });
        }

        const balance = await economy.getBalance(guildId, userId);
        if (balance < item.price) {
            return interaction.reply({
                content: `❌ You need **${item.price}** 🪙 but only have **${balance}** 🪙.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await economy.addBalance(guildId, userId, -item.price);
        await inventory.add(guildId, userId, item.id);
        if (item.onBuy) await item.onBuy(guildId, userId);

        const newBalance = await economy.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle(`✅ Purchased ${item.name}`)
            .setDescription(item.description)
            .addFields(
                { name: "Cost",    value: `${item.price} 🪙`,  inline: true },
                { name: "Balance", value: `${newBalance} 🪙`,  inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};