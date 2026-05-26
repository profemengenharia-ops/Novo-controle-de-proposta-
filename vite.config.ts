import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Separa as libs pesadas em chunks próprios: reduz o bundle inicial
          // e melhora o cache (cada lib só é rebaixada quando muda de versão).
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('docx')) return 'vendor-docx';
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
            if (id.includes('react-dom') || id.includes('scheduler') || /node_modules\/react\//.test(id)) return 'vendor-react';
            if (id.includes('motion') || id.includes('framer')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'vendor-markdown';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
