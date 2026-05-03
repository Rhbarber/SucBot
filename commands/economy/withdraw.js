const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, bank } = require("../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("withdraw")
        .setDescription("Withdraw coins from your bank into your wallet.")
        .addStringOption(o =>
            o.setName("amount")
             .setDescription("Amount to withdraw, or 'all'")
             .setRequired(true)
        ),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId  = interaction.user.id;
        const input   = interaction.options.getString("amount").toLowerCase();
        const bankData = await bank.get(guildId, userId);

        const amount = input === "all" ? bankData.balance : parseInt(input);

        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ content: "❌ Please enter a valid amount or `all`.", flags: MessageFlags.Ephemeral });
        }
        if (amount > bankData.balance) {
            return interaction.reply({ content: `❌ Your bank only has **${bankData.balance}** 🪙.`, flags: MessageFlags.Ephemeral });
        }

        await bank.withdraw(guildId, userId, amount);
        await economy.addBalance(guildId, userId, amount);

        const [newWallet, newBank] = await Promise.all([
            economy.getBalance(guildId, userId),
            bank.get(guildId, userId),
        ]);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🏦 Withdrawal Successful")
            .addFields(
                { name: "Withdrawn",    value: `${amount} 🪙`,                              inline: true },
                { name: "Wallet",       value: `${newWallet} 🪙`,                           inline: true },
                { name: "Bank",         value: `${newBank.balance}/${newBank.capacity} 🪙`, inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};