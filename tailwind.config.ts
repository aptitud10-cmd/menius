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
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-sora)', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#effefb', 100: '#c7fff2', 200: '#90ffe5',
          300: '#51f7d5', 400: '#1de4c0', 500: '#05c8a7',
          600: '#00a189', 700: '#058070', 800: '#0a655a',
          900: '#0d544b', 950: '#00332f',
        },
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
    },
  },
  plugins: [typography],
};
export default config;
