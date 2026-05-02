const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const WEATHER_EMOJIS = {
    Thunderstorm: "⛈️",
    Drizzle:      "🌦️",
    Rain:         "🌧️",
    Snow:         "❄️",
    Mist:         "🌫️",
    Smoke:        "🌫️",
    Haze:         "🌫️",
    Dust:         "🌪️",
    Fog:          "🌫️",
    Sand:         "🌪️",
    Ash:          "🌋",
    Squall:       "💨",
    Tornado:      "🌪️",
    Clear:        "☀️",
    Clouds:       "☁️",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("weather")
        .setDescription("Get the current weather for a city.")
        .addStringOption(option =>
            option
                .setName("city")
                .setDescription("City name (e.g. London, New York, Tokyo)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("units")
                .setDescription("Temperature units (default: Metric)")
                .addChoices(
                    { name: "🌡️ Metric (°C)",    value: "metric"   },
                    { name: "🌡️ Imperial (°F)",  value: "imperial" },
                    { name: "🌡️ Kelvin (K)",      value: "standard" },
                )
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            return interaction.editReply({ content: "❌ `OPENWEATHER_API_KEY` is not set in the `.env` file." });
        }

        const city  = interaction.options.getString("city");
        const units = interaction.options.getString("units") ?? "metric";
        const unitSymbol = { metric: "°C", imperial: "°F", standard: "K" }[units];
        const speedUnit  = units === "imperial" ? "mph" : "m/s";

        // Step 1 — Geocode city to coordinates
        const geoRes = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
        );
        const geoData = await geoRes.json();

        if (!geoData.length) {
            return interaction.editReply({ content: `❌ City \`${city}\` not found. Try being more specific (e.g. "London, GB").` });
        }

        const { lat, lon, name, country, state } = geoData[0];
        const locationName = [name, state, country].filter(Boolean).join(", ");

        // Step 2 — Fetch current weather
        const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`
        );
        const w = await weatherRes.json();

        const condition    = w.weather[0].main;
        const description  = w.weather[0].description;
        const emoji        = WEATHER_EMOJIS[condition] ?? "🌡️";
        const iconUrl      = `https://openweathermap.org/img/wn/${w.weather[0].icon}@2x.png`;
        const sunrise      = `<t:${w.sys.sunrise}:t>`;
        const sunset       = `<t:${w.sys.sunset}:t>`;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle(`${emoji} Weather in ${locationName}`)
            .setDescription(`**${description.charAt(0).toUpperCase() + description.slice(1)}**`)
            .setThumbnail(iconUrl)
            .addFields(
                { name: "🌡️ Temperature",  value: `${w.main.temp}${unitSymbol} (feels like ${w.main.feels_like}${unitSymbol})`, inline: true },
                { name: "💧 Humidity",     value: `${w.main.humidity}%`,                                                         inline: true },
                { name: "💨 Wind",         value: `${w.wind.speed} ${speedUnit}`,                                                inline: true },
                { name: "👁️ Visibility",   value: `${(w.visibility / 1000).toFixed(1)} km`,                                     inline: true },
                { name: "🌅 Sunrise",      value: sunrise,                                                                       inline: true },
                { name: "🌇 Sunset",       value: sunset,                                                                        inline: true },
                { name: "📊 Pressure",     value: `${w.main.pressure} hPa`,                                                     inline: true },
                { name: "☁️ Cloud Cover",  value: `${w.clouds.all}%`,                                                           inline: true },
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag} • Powered by OpenWeatherMap`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};