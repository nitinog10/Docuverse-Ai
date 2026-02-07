import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dv': {
          'bg':            '#09090b',
          'surface':       '#18181b',
          'elevated':      '#27272a',
          'border':        '#3f3f46',
          'border-subtle': '#27272a',
          'text':          '#fafafa',
          'text-secondary':'#a1a1aa',
          'text-muted':    '#71717a',
          'accent':        '#6366f1',
          'accent-hover':  '#818cf8',
          'accent-subtle': 'rgba(99,102,241,0.10)',
          'success':       '#22c55e',
          'warning':       '#f59e0b',
          'error':         '#ef4444',
          'purple':        '#a78bfa',
          'pink':          '#f472b6',
          'cyan':          '#22d3ee',
          'orange':        '#fb923c',
        },
      },
      fontFamily: {
        'display': ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        'mono':    ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
        'sans':    ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem',  { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-lg': ['3.5rem',  { lineHeight: '1.1',  letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-md': ['2.5rem',  { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '600' }],
        'body-lg':    ['1.125rem',{ lineHeight: '1.6' }],
        'body':       ['0.9375rem',{ lineHeight: '1.6' }],
        'body-sm':    ['0.8125rem',{ lineHeight: '1.5' }],
        'caption':    ['0.75rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'glow':       'glow 3s ease-in-out infinite alternate',
        'float':      'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient':   'gradient 8s linear infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'slide-up':   'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in':    'fade-in 0.4s ease-out',
        'scale-in':   'scale-in 0.2s ease-out',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 20px rgba(99,102,241,0.2)' },
          '100%': { boxShadow: '0 0 60px rgba(99,102,241,0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-down': {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-sm':  '0 0 10px rgba(99,102,241,0.15)',
        'glow':     '0 0 20px rgba(99,102,241,0.2)',
        'glow-lg':  '0 0 40px rgba(99,102,241,0.3)',
        'elevated': '0 8px 32px rgba(0,0,0,0.4)',
        'card':     '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}

export default config

