const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an announcement embed to a channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel to send the announcement to")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("title").setDescription("Announcement title").setRequired(true)
        )
        .addStringOption(option =>
            option.setName("message").setDescription("Announcement body").setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("ping")
                .setDescription("Who to ping alongside the announcement")
                .addChoices(
                    { name: "@everyone", value: "@everyone" },
                    { name: "@here",     value: "@here"     },
                    { name: "None",      value: "none"      },
                )
        )
        .addStringOption(option =>
            option.setName("color").setDescription("Embed color in hex (default: bot embed color)").setRequired(false)
        ),

    ownerOnly: true,

    async execute(interaction, client) {
        const channel = interaction.options.getChannel("channel");
        const title   = interaction.options.getString("title");
        const message = interaction.options.getString("message");
        const ping    = interaction.options.getString("ping") ?? "none";
        const colorInput = interaction.options.getString("color");

        let color = client.config.embedColor;
        if (colorInput) {
            const hex = colorInput.startsWith("#") ? colorInput : `#${colorInput}`;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) color = hex;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`📢 ${title}`)
            .setDescription(message)
            .setTimestamp()
            .setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL(),
            });

        const content = ping === "none" ? undefined : ping;

        await channel.send({ content, embeds: [embed] });

        await interaction.reply({
            content: `✅ Announcement sent to ${channel}.`,
            flags: MessageFlags.Ephemeral,
        });
    },
};