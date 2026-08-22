/**
 * Next busca la configuración de PostCSS en la raíz de CADA app, no en la del
 * monorepo. Sin este archivo aquí, apps/web compilaba el CSS sin pasar por
 * Tailwind: las clases de /b2b existían en el HTML pero no había hoja de
 * estilos que las definiera, así que la página salía sin formato.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
