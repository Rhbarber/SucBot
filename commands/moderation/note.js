const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { warnings } = require("../../db");

// Notes reuse the warnings table with a special mod_id prefix to distinguish them
const NOTE_PREFIX = "NOTE:";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("note")
        .setDescription("Manage private moderator notes for a member.")
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Add a private note to a member.")
                .addUserOption(o => o.setName("user").setDescription("Target member").setRequired(true))
                .addStringOption(o => o.setName("note").setDescription("Note content").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("View all notes for a member.")
                .addUserOption(o => o.setName("user").setDescription("Target member").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Remove a note by its ID.")
                .addIntegerOption(o => o.setName("id").setDescription("Note ID").setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === "add") {
            const target = interaction.options.getUser("user");
            const note   = interaction.options.getString("note");

            // Store notes using warnings table, prefixing mod_id to distinguish from real warnings
            await warnings.add(interaction.guildId, target.id, `${NOTE_PREFIX}${interaction.user.id}`, note);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`📝 Note added for **${target.tag}**.`)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (sub === "list") {
            const target  = interaction.options.getUser("user");
            const allRows = await warnings.get(interaction.guildId, target.id);
            const notes   = allRows.filter(r => r.mod_id.startsWith(NOTE_PREFIX));

            const embed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(`📝 Notes for ${target.tag}`)
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Visible to moderators only`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            if (!notes.length) {
                embed.setDescription("No notes found for this member.");
            } else {
                embed.setDescription(
                    notes.map(n => {
                        const modId = n.mod_id.replace(NOTE_PREFIX, "");
                        return `**#${n.id}** — <t:${Math.floor(n.timestamp / 1000)}:R>\n${n.reason}\n— <@${modId}>`;
                    }).join("\n\n")
                );
            }

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (sub === "remove") {
            const id      = interaction.options.getInteger("id");
            const deleted = await warnings.remove(id);

            return interaction.reply({
                content: deleted ? `✅ Note **#${id}** removed.` : `❌ No note found with ID **#${id}**.`,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};