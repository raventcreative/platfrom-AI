// Konfigurasi Tailwind CSS untuk app web.
// `content` menentukan file yang dipindai agar kelas util yang dipakai tidak ter-purge.
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palet mengikuti DESIGN.md (dashboard gelap "Power BI"): dark flat,
      // aksen cyan neon untuk data/aksi, merah alert, hijau status live.
      colors: {
        brand: {
          bg: '#121212', // Background primario (dark mode)
          panel: '#1e1e1e', // Superficie de tarjetas
          panel2: '#252525', // hover fila / superficie naik
          line: '#2c2c2e', // borde sutil
          accent: '#00e5ff', // Acento primario (cian/neón)
          accentHover: '#4debff',
          text: '#ffffff', // Texto principal
          muted: '#98989d', // Texto secundario
          danger: '#ff453a', // Acento de alerta (rojo)
          success: '#32d74b', // Acento secundario (verde lima / live)
        },
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '1rem', // kartu = 16px (sesuai DESIGN.md)
        '2xl': '1.15rem',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
