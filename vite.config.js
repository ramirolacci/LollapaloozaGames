import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    base: './',
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'games',
                    dest: '.'
                },
                {
                    src: 'libs',
                    dest: '.'
                }
            ]
        }),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Aperture Games',
                short_name: 'ApertureGames',
                description: 'Empanada Arcade - Menú de Juegos',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'assets/LogoMiGusto2025.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'assets/LogoMiGusto2025.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: 'index.html',
                catch: 'games/Catch-the-Empanada/index.html',
                crush: 'games/Empanada-Crush/index.html',
                puzzle: 'games/Empanada-Puzzle/index.html',
                pacman: 'games/PacMan-Empanada/index.html',
            }
        }
    }
});
