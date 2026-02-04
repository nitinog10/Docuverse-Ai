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
        // Premium sophisticated color palette - Elegant dark theme
        'dv': {
          'bg': '#0f0f12',
          'surface': '#1a1a1f',
          'elevated': '#252530',
          'border': '#3a3a42',
          'text': '#e8e8ec',
          'text-muted': '#9a9aa8',
          'accent': '#64b5f6',
          'accent-hover': '#7fbfff',
          'accent-dark': '#42a5f5',
          'success': '#4caf50',
          'warning': '#ffb74d',
          'error': '#ef5350',
          'gold': '#d4af37',
          'teal': '#26c6da',
          'emerald': '#10b981',
          'indigo': '#6366f1',
        },
      },
      fontFamily: {
        'display': ['var(--font-dm-sans)', 'Cal Sans', 'Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
        'sans': ['var(--font-dm-sans)', 'DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 3s ease-in-out infinite',
        'glow-intense': 'glow-intense 2s ease-out infinite',
        'float': 'float 6s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-scale': 'fade-in-scale 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-subtle': 'bounce-subtle 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'pulse-accent': 'pulse-accent 2.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(100, 181, 246, 0.3), inset 0 0 20px rgba(100, 181, 246, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(100, 181, 246, 0.6), inset 0 0 30px rgba(100, 181, 246, 0.2)' },
        },
        'glow-intense': {
          '0%': { boxShadow: '0 0 30px rgba(100, 181, 246, 0.5)' },
          '100%': { boxShadow: '0 0 60px rgba(100, 181, 246, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-30px) scale(1.02)' },
        },
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-accent': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2330363d' fill-opacity='0.4'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
}

export default config

