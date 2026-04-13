const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const VERIFICATION_LEVELS = ["None", "Low", "Medium", "High", "Very High"];
const BOOST_LEVELS        = { 0: "No Level", 1: "Level 1", 2: "Level 2", 3: "Level 3" };

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows information about this server."),

    async execute(interaction, client) {
        const { guild } = interaction;
        await guild.members.fetch();

        const owner     = await guild.fetchOwner();
        const channels  = guild.channels.cache;
        const textCount = channels.filter(c => c.type === 0).size;
        const voiceCount = channels.filter(c => c.type === 2).size;
        const botCount  = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: "👑 Owner",           value: `${owner.user.tag}`,                                     inline: true  },
                { name: "🪪 Server ID",        value: guild.id,                                               inline: true  },
                { name: "📅 Created",          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,   inline: false },
                { name: "👥 Members",          value: `${guild.memberCount} (${humanCount} humans, ${botCount} bots)`, inline: false },
                { name: "💬 Text Channels",    value: `${textCount}`,                                         inline: true  },
                { name: "🔊 Voice Channels",   value: `${voiceCount}`,                                        inline: true  },
                { name: "🎭 Roles",            value: `${guild.roles.cache.size}`,                            inline: true  },
                { name: "🛡️ Verification",     value: VERIFICATION_LEVELS[guild.verificationLevel] ?? "Unknown", inline: true },
                { name: "🚀 Boosts",           value: `${guild.premiumSubscriptionCount} (${BOOST_LEVELS[guild.premiumTier]})`, inline: true },
            )
            .setImage(guild.bannerURL({ size: 1024 }) ?? null)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};