const { SlashCommandBuilder, EmbedBuilder, codeBlock, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("eval")
        .setDescription("Execute JavaScript code. Owner only.")
        .addStringOption(option =>
            option.setName("code").setDescription("Code to execute").setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName("ephemeral").setDescription("Send result as ephemeral (default: true)")
        ),

    ownerOnly: true,

    async execute(interaction, _client) {
        const code      = interaction.options.getString("code");
        const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
        const start     = Date.now();

        const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

        let result, isError = false;

        try {
            // eslint-disable-next-line no-eval
            result = await eval(code); // nosec B307
            result = typeof result !== "string" ? JSON.stringify(result, null, 2) : result;
        } catch (err) {
            result  = err.message;
            isError = true;
        }

        // Sanitize token from output just in case
        const token = process.env.TOKEN ?? "";
        const clean = (String(result ?? "undefined")).replace(new RegExp(token, "g"), "[REDACTED]");
        const truncated = clean.length > 1800 ? `${clean.slice(0, 1800)}\n... (truncated)` : clean;

        const embed = new EmbedBuilder()
            .setColor(isError ? "#e74c3c" : "#2ecc71")
            .setTitle(isError ? "❌ Error" : "✅ Success")
            .addFields(
                { name: "📥 Input",  value: codeBlock("js", code.slice(0, 1000)) },
                { name: "📤 Output", value: codeBlock("js", truncated || "undefined") },
                { name: "⏱️ Time",   value: `${Date.now() - start}ms`, inline: true },
                { name: "📦 Type",   value: typeof result,             inline: true },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags });
    },
};