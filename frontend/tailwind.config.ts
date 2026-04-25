import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        sidebar: '#0f0f11',
        'sidebar-hover': '#1a1a1f',
        'sidebar-border': '#1e1e24',
        canvas: '#ffffff',
        'canvas-secondary': '#f8f8fb',
        accent: '#6366f1',
        'accent-light': '#e0e7ff',
        'accent-dark': '#4338ca',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        border: '#e2e8f0',
        'border-strong': '#cbd5e1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
        modal: '0 20px 60px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
