const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to look up (defaults to yourself)")
        ),

    async execute(interaction, client) {
        const target = interaction.options.getMember("user") ?? interaction.member;
        const user   = target.user;

        const roles = target.roles.cache
            .filter(r => r.id !== interaction.guildId)
            .sort((a, b) => b.position - a.position)
            .map(r => `<@&${r.id}>`)
            .slice(0, 10)
            .join(", ") || "None";

        const flags = user.flags?.toArray() ?? [];

        const embed = new EmbedBuilder()
            .setColor(target.displayHexColor === "#000000" ? client.config.embedColor : target.displayHexColor)
            .setTitle(`${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🪪 User ID",       value: user.id,                                              inline: true  },
                { name: "🤖 Bot",           value: user.bot ? "Yes" : "No",                             inline: true  },
                { name: "📅 Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
                { name: "📥 Joined Server",  value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: false },
                { name: "🎨 Display Color",  value: target.displayHexColor,                              inline: true  },
                { name: "🏅 Highest Role",   value: `<@&${target.roles.highest.id}>`,                   inline: true  },
                { name: `🎭 Roles (${target.roles.cache.size - 1})`, value: roles },
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};