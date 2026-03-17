import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
        muted: '#64748b',
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};

export default config;
