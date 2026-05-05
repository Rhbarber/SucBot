const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy, bank, stats, inventory } = require("../../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View your economy profile.")
        .addUserOption(o =>
            o.setName("user").setDescription("User to view (defaults to yourself)")
        ),

    async execute(interaction, client) {
        await interaction.deferReply();
        const target  = interaction.options.getUser("user") ?? interaction.user;
        const { guildId } = interaction;

        const [wallet, bankData, userStats, items] = await Promise.all([
            economy.getBalance(guildId, target.id),
            bank.get(guildId, target.id),
            stats.get(guildId, target.id),
            inventory.get(guildId, target.id),
        ]);

        const total      = wallet + bankData.balance;
        const winRate = userStats.games_played > 0
            ? ((userStats.games_won / userStats.games_played) * 100).toFixed(1)
            : "0.0";

        const itemList = items.length
            ? items.map(i => `• ${i.item} ×${i.quantity}`).join("\n")
            : "Empty";

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`💼 ${target.username}'s Profile`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "👛 Wallet",       value: `${wallet.toLocaleString()} 🪙`,                          inline: true  },
                { name: "🏦 Bank",         value: `${bankData.balance.toLocaleString()}/${bankData.capacity.toLocaleString()} 🪙`, inline: true },
                { name: "💰 Net Worth",    value: `${total.toLocaleString()} 🪙`,                           inline: true  },
                { name: "📈 Total Earned", value: `${userStats.total_earned.toLocaleString()} 🪙`,          inline: true  },
                { name: "📉 Total Lost",   value: `${userStats.total_lost.toLocaleString()} 🪙`,            inline: true  },
                { name: "🎮 Games",        value: `${userStats.games_played} played | ${winRate}% win rate`, inline: true },
                { name: "🦹 Rob Stats",    value: `${userStats.rob_attempts} attempts | ${userStats.times_robbed} times robbed`, inline: true },
                { name: "🎒 Inventory",    value: itemList,                                                  inline: false },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};