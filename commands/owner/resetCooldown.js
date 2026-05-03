const { SlashCommandBuilder, EmbedBuilder, MessageFlags} = require("discord.js");
const { cooldowns } = require("../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resetcooldown")
        .setDescription("Resets a cooldown for a user. Owner only.")
        .addStringOption(option =>
            option
                .setName("command")
                .setDescription("The command to reset the cooldown for")
                .setRequired(true)
                .addChoices(
                    { name: "daily",     value: "daily"     },
                    { name: "weekly",    value: "weekly"    },
                    { name: "work",      value: "work"      },
                    { name: "coinflip",  value: "coinflip"  },
                    { name: "slots",     value: "slots"     },
                    { name: "blackjack", value: "blackjack" },
                    { name: "rob",       value: "rob"       },
                )
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to reset the cooldown for (defaults to yourself)")
        ),

    ownerOnly: true,

    async execute(interaction, client) {
        const command = interaction.options.getString("command");
        const target  = interaction.options.getUser("user") ?? interaction.user;

        await cooldowns.set(command, interaction.guildId, target.id, 0);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`✅ Reset the **${command}** cooldown for ${target}.`)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};