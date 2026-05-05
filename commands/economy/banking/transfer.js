const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { economy } = require("../../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("transfer")
        .setDescription("Send coins to another member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to send coins to")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount of coins to send")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction, client) {
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const { guildId } = interaction;
        const senderId = interaction.user.id;

        if (target.id === senderId) {
            return interaction.reply({ content: "You can't send coins to yourself.", ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ content: "You can't send coins to a bot.", ephemeral: true });
        }

        const senderBalance = await economy.getBalance(guildId, senderId);

        if (senderBalance < amount) {
            return interaction.reply({
                content: `You don't have enough coins. Your balance is **${senderBalance}** 🪙`,
                ephemeral: true,
            });
        }

        await economy.addBalance(guildId, senderId, -amount);
        await economy.addBalance(guildId, target.id, amount);

        const newBalance = await economy.getBalance(guildId, senderId);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("🪙 Transfer Complete")
            .addFields(
                { name: "Sent to",        value: target.tag,         inline: true },
                { name: "Amount",         value: `${amount} 🪙`,     inline: true },
                { name: "Your Balance",   value: `${newBalance} 🪙`, inline: true },
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};