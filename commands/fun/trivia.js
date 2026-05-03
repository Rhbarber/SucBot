const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");

const CATEGORIES = [
    { name: "General Knowledge",          value: "9"  },
    { name: "Books",                       value: "10" },
    { name: "Film",                        value: "11" },
    { name: "Music",                       value: "12" },
    { name: "Video Games",                 value: "15" },
    { name: "Science & Nature",            value: "17" },
    { name: "Computers",                   value: "18" },
    { name: "Mathematics",                 value: "19" },
    { name: "Sports",                      value: "21" },
    { name: "Geography",                   value: "22" },
    { name: "History",                     value: "23" },
    { name: "Animals",                     value: "27" },
    { name: "Vehicles",                    value: "28" },
    { name: "Anime & Manga",               value: "31" },
    { name: "Cartoons & Animations",       value: "32" },
];

const DIFFICULTY_EMOJIS = { easy: "🟢", medium: "🟡", hard: "🔴" };
const TIMEOUT = 20_000; // 20 seconds to answer

const HTML_ENTITIES = {
    "&amp;":  "&",
    "&lt;":   "<",
    "&gt;":   ">",
    "&quot;": '"',
    "&#039;": "'",
    "&ldquo;": "“",
    "&rdquo;": "”",
};

function decodeHTML(str) {
    return str.replace(/&[^;]+;/g, entity => HTML_ENTITIES[entity] ?? entity);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("trivia")
        .setDescription("Answer a random trivia question.")
        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Question category (default: random)")
                .addChoices(...CATEGORIES)
        )
        .addStringOption(option =>
            option
                .setName("difficulty")
                .setDescription("Question difficulty (default: random)")
                .addChoices(
                    { name: "🟢 Easy",   value: "easy"   },
                    { name: "🟡 Medium", value: "medium" },
                    { name: "🔴 Hard",   value: "hard"   },
                )
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const category   = interaction.options.getString("category") ?? "";
        const difficulty = interaction.options.getString("difficulty") ?? "";

        const params = new URLSearchParams({ amount: "1", type: "multiple", encode: "url3986" });
        if (category)   params.set("category", category);
        if (difficulty) params.set("difficulty", difficulty);

        const res  = await fetch(`https://opentdb.com/api.php?${params}`);
        const data = await res.json();

        if (data.response_code !== 0 || !data.results?.length) {
            return interaction.editReply({ content: "Couldn't fetch a trivia question right now. Try again!" });
        }

        const q           = data.results[0];
        const question    = decodeHTML(decodeURIComponent(q.question));
        const correct     = decodeHTML(decodeURIComponent(q.correct_answer));
        const incorrect   = q.incorrect_answers.map(a => decodeHTML(decodeURIComponent(a)));
        // Fisher-Yates shuffle using crypto.randomInt to avoid weak RNG warning
        const allAnswers = [...incorrect, correct];
        const { randomInt } = require("node:crypto");
        for (let i = allAnswers.length - 1; i > 0; i--) {
            const j = randomInt(0, i + 1);
            [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
        }
        const correctIdx  = allAnswers.indexOf(correct);
        const diffEmoji   = DIFFICULTY_EMOJIS[q.difficulty] ?? "❓";
        const categoryStr = decodeHTML(decodeURIComponent(q.category));

        // Build answer buttons (A B C D)
        const labels = ["A", "B", "C", "D"];
        const buttons = allAnswers.map((answer, i) =>
            new ButtonBuilder()
                .setCustomId(`trivia_${i}`)
                .setLabel(`${labels[i]}. ${answer.slice(0, 80)}`)
                .setStyle(ButtonStyle.Primary)
        );
        const row = new ActionRowBuilder().addComponents(buttons);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${diffEmoji} Trivia — ${categoryStr}`)
            .setDescription(`**${question}**`)
            .setFooter({
                text: `Difficulty: ${q.difficulty} • You have 20 seconds to answer!`,
            });

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        // Collect button press — only from the user who ran the command
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: TIMEOUT,
            max: 1,
        });

        collector.on("collect", async btnInteraction => {
            const chosen    = parseInt(btnInteraction.customId.split("_")[1]);
            const isCorrect = chosen === correctIdx;

            // Update buttons — green for correct, red for chosen wrong
            const updatedButtons = allAnswers.map((answer, i) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`trivia_done_${i}`)
                    .setLabel(`${labels[i]}. ${answer.slice(0, 80)}`)
                    .setDisabled(true);

                if (i === correctIdx)     btn.setStyle(ButtonStyle.Success);
                else if (i === chosen)    btn.setStyle(ButtonStyle.Danger);
                else                      btn.setStyle(ButtonStyle.Secondary);

                return btn;
            });

            const updatedRow = new ActionRowBuilder().addComponents(updatedButtons);

            const resultEmbed = new EmbedBuilder()
                .setColor(isCorrect ? "#2ecc71" : "#e74c3c")
                .setTitle(`${isCorrect ? "✅ Correct!" : "❌ Wrong!"} — ${categoryStr}`)
                .setDescription(`**${question}**\n\nCorrect answer: **${correct}**`)
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            await btnInteraction.update({ embeds: [resultEmbed], components: [updatedRow] });
        });

        collector.on("end", async (collected) => {
            if (collected.size > 0) return; // Already answered

            // Timed out — reveal answer
            const timedOutButtons = allAnswers.map((answer, i) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`trivia_timeout_${i}`)
                    .setLabel(`${labels[i]}. ${answer.slice(0, 80)}`)
                    .setDisabled(true)
                    .setStyle(i === correctIdx ? ButtonStyle.Success : ButtonStyle.Secondary);
                return btn;
            });

            const timeoutRow   = new ActionRowBuilder().addComponents(timedOutButtons);
            const timeoutEmbed = new EmbedBuilder()
                .setColor("#e67e22")
                .setTitle(`⏰ Time's up! — ${categoryStr}`)
                .setDescription(`**${question}**\n\nCorrect answer: **${correct}**`)
                .setFooter({ text: "You ran out of time!" });

            await interaction.editReply({ embeds: [timeoutEmbed], components: [timeoutRow] }).catch(() => {});
        });
    },
};