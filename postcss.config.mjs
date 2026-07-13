// localpulse-admin/postcss.config.mjs
// Tailwind v4 uses the dedicated @tailwindcss/postcss plugin (not the old
// `tailwindcss` + `autoprefixer` pair). This is the only PostCSS config needed.
const config = {
  plugins: ['@tailwindcss/postcss'],
};

export default config;
