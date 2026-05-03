const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { economy, bank } = require("../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deposit")
        .setDescription("Deposit coins into your bank to protect them from being robbed.")
        .addStringOption(o =>
            o.setName("amount")
             .setDescription("Amount to deposit, or 'all'")
             .setRequired(true)
        ),

    async execute(interaction, client) {
        const { guildId } = interaction;
        const userId  = interaction.user.id;
        const input   = interaction.options.getString("amount").toLowerCase();

        const [wallet, bankData] = await Promise.all([
            economy.getBalance(guildId, userId),
            bank.get(guildId, userId),
        ]);

        const space  = bankData.capacity - bankData.balance;
        const amount = input === "all" ? Math.min(wallet, space) : parseInt(input);

        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ content: "❌ Please enter a valid amount or `all`.", flags: MessageFlags.Ephemeral });
        }
        if (amount > wallet) {
            return interaction.reply({ content: `❌ You only have **${wallet}** 🪙 in your wallet.`, flags: MessageFlags.Ephemeral });
        }
        if (space <= 0) {
            return interaction.reply({ content: `❌ Your bank is full! (${bankData.balance}/${bankData.capacity} 🪙)`, flags: MessageFlags.Ephemeral });
        }

        const actualDeposit = Math.min(amount, space);
        await economy.addBalance(guildId, userId, -actualDeposit);
        await bank.deposit(guildId, userId, actualDeposit);

        const [newWallet, newBank] = await Promise.all([
            economy.getBalance(guildId, userId),
            bank.get(guildId, userId),
        ]);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🏦 Deposit Successful")
            .addFields(
                { name: "Deposited",    value: `${actualDeposit} 🪙`,                              inline: true },
                { name: "Wallet",       value: `${newWallet} 🪙`,                                  inline: true },
                { name: "Bank",         value: `${newBank.balance}/${newBank.capacity} 🪙`,         inline: true },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};