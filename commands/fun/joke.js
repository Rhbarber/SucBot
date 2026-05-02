const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const CATEGORIES = ["Any", "Programming", "Misc", "Dark", "Pun", "Spooky", "Christmas"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("joke")
        .setDescription("Get a random joke.")
        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Joke category (default: Any)")
                .addChoices(
                    CATEGORIES.map(c => ({ name: c, value: c }))
                )
        )
        .addBooleanOption(option =>
            option
                .setName("safe")
                .setDescription("Only show family-friendly jokes (default: true)")
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const category = interaction.options.getString("category") ?? "Any";
        const safe     = interaction.options.getBoolean("safe") ?? true;

        const safeFlag = safe ? "&safe-mode" : "";
        const res  = await fetch(`https://v2.jokeapi.dev/joke/${category}?type=twopart,single${safeFlag}`);
        const data = await res.json();

        if (data.error) {
            return interaction.editReply({ content: "Couldn't find a joke for that category. Try another one!" });
        }

        const jokeText = data.type === "twopart"
            ? `${data.setup}\n\n||${data.delivery}||`
            : data.joke;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`😄 ${data.category} Joke`)
            .setDescription(jokeText)
            .setFooter({
                text: `Joke #${data.id} • Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};