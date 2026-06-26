/** @type {import('prettier').Config} */
module.exports = {
  // ── Strings ───────────────────────────────────────────────
  singleQuote: true,
  jsxSingleQuote: false,

  // ── Semicolons ────────────────────────────────────────────
  semi: true,

  // ── Indentation ───────────────────────────────────────────
  tabWidth: 2,
  useTabs: false,

  // ── Line length ───────────────────────────────────────────
  printWidth: 100,

  // ── Trailing commas ───────────────────────────────────────
  trailingComma: 'es5',

  // ── Brackets ─────────────────────────────────────────────
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',

  // ── File overrides ────────────────────────────────────────
  overrides: [
    {
      files: ['*.json'],
      options: { singleQuote: false },
    },
  ],
};
