module.exports = {
    env: {
        node:   true,
        es2022: true,
    },
    parserOptions: {
        ecmaVersion: 2022,
        sourceType:  "commonjs",
    },
    extends: "eslint:recommended",
    rules: {
        // Catch common mistakes
        "no-unused-vars":    ["warn", { argsIgnorePattern: "^_" }],
        "no-console":         "off",   // console.log is intentional in a bot
        "no-process-exit":    "warn",
        "no-await-in-loop":   "warn",

        // Style
        "eqeqeq":             ["error", "always"],
        "prefer-const":       "warn",
        "no-var":             "error",
    },
};
