const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { warnings } = require("../../db");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View or manage warnings for a member.")
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("List all warnings for a member.")
                .addUserOption(option =>
                    option.setName("user").setDescription("The member to check").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Remove a specific warning by ID.")
                .addIntegerOption(option =>
                    option.setName("id").setDescription("The warning ID to remove").setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("clear")
                .setDescription("Clear all warnings for a member.")
                .addUserOption(option =>
                    option.setName("user").setDescription("The member to clear warnings for").setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === "list") {
            const target = interaction.options.getUser("user");
            const list   = await warnings.get(interaction.guildId, target.id);

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`⚠️ Warnings for ${target.tag}`)
                .setThumbnail(target.displayAvatarURL())
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            if (!list.length) {
                embed.setDescription("This member has no warnings.");
            } else {
                embed.setDescription(
                    list.map(w =>
                        `**#${w.id}** — <t:${Math.floor(w.timestamp / 1000)}:R>\n` +
                        `Reason: ${w.reason}\nModerator: <@${w.mod_id}>`
                    ).join("\n\n")
                );
            }

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "remove") {
            const id      = interaction.options.getInteger("id");
            const deleted = await warnings.remove(id);

            return interaction.reply({
                content: deleted
                    ? `✅ Warning **#${id}** has been removed.`
                    : `❌ No warning found with ID **#${id}**.`,
                ephemeral: true,
            });
        }

        if (sub === "clear") {
            const target = interaction.options.getUser("user");
            await warnings.clear(interaction.guildId, target.id);

            return interaction.reply({
                content: `✅ All warnings for **${target.tag}** have been cleared.`,
                ephemeral: true,
            });
        }
    },
};