/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cabinet Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        display: ['"Bebas Neue"', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      colors: {
        ink: '#000000',
        ink2: '#111111',
        ink3: '#444444',
        ink4: '#888888',
        sand: '#ffffff',
        sand2: '#f0f0f0',
        sand3: '#e0e0e0',
      },
    },
  },
  plugins: [],
}
