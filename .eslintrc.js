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
        // Catch Common Mistakes
        "no-unused-vars":  ["warn", { argsIgnorePattern: "^_" }],
        "no-console":      "off",
        "no-await-in-loop": "error",
        
        // Style
        "eqeqeq":          ["error", "always"],
        "prefer-const":    "warn",
        "no-var":          "error",
    },
};