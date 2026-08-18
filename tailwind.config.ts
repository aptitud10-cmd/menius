import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // 'display' NO se toca: lo usan el logo MENIUS, el hero de la landing,
        // el footer, error.tsx y not-found.tsx con font-extrabold + tracking
        // negativo. Instrument Serif (weight 400 único) los rompería.
        display: ['var(--font-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        // Display editorial de la TIENDA del comensal. Instrument Serif ya se
        // carga en layout.tsx como --font-serif, pero la tienda nunca la usó:
        // el comensal pagaba los bytes y veía Inter plano.
        menu: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
        heading: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        sidebar: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Escala neutra CÁLIDA para la tienda. El gray-* de Tailwind es frío
        // (azulado) y choca con el fondo #f5f5f3 del menú. Estos neutros
        // comparten la temperatura del fondo.
        ink: {
          50: '#faf9f7', 100: '#f5f4f1', 200: '#e8e6e1',
          300: '#d4d1ca', 400: '#a8a49b', 500: '#7d7970',
          600: '#5c5952', 700: '#44413c', 800: '#2b2926',
          900: '#1a1917', 950: '#0f0e0d',
        },
        brand: {
          50: '#effefb', 100: '#c7fff2', 200: '#90ffe5',
          300: '#51f7d5', 400: '#1de4c0', 500: '#05c8a7',
          600: '#00a189', 700: '#058070', 800: '#0a655a',
          900: '#0d544b', 950: '#00332f',
        },
      },
      borderRadius: {
        // La escala de la tienda es la de Tailwind: lg(8) → xl(14) → 2xl(18)
        // → 3xl(24), que ya cubre chip → botón → card → sheet.
        //
        // Se probó una escala 'store-*' paralela (12/16px) y se descartó: contra
        // los valores actuales movía 2px en dos pasos y 0px en los otros dos —
        // invisible en pantalla, a cambio de dos sistemas de radios conviviendo.
        // El defecto real de jerarquía de forma no eran los valores sino su uso
        // inconsistente (tres botones-ícono idénticos con tres radios distintos
        // en CustomizationSheet), y eso se corrigió en los componentes.
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [typography],
};
export default config;
