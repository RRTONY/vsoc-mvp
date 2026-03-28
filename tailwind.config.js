/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cabinet Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        display: ['"Bebas Neue"', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      fontSize: {
        // Bump everything up one notch
        'xs':   ['13px', { lineHeight: '1.5' }],
        'sm':   ['14px', { lineHeight: '1.55' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg':   ['18px', { lineHeight: '1.55' }],
        'xl':   ['20px', { lineHeight: '1.4' }],
        '2xl':  ['24px', { lineHeight: '1.3' }],
        '3xl':  ['30px', { lineHeight: '1.2' }],
        '4xl':  ['36px', { lineHeight: '1.1' }],
      },
      colors: {
        // Text
        ink:  '#111827',
        ink2: '#1F2937',
        ink3: '#6B7280',
        ink4: '#9CA3AF',
        // Surfaces
        sand:  '#FFFFFF',
        sand2: '#F9FAFB',
        sand3: '#F3F4F6',
        sand4: '#E5E7EB',
        // Accent
        accent:         '#4F46E5',
        'accent-dark':  '#4338CA',
        'accent-light': '#EEF2FF',
        // Status
        success: '#16A34A',
        'success-light': '#DCFCE7',
        warning: '#D97706',
        'warning-light': '#FEF3C7',
        danger:  '#DC2626',
        'danger-light':  '#FEE2E2',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
