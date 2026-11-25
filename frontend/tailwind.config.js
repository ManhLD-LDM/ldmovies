/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary theo chế độ: violet (Phim) / teal (Truyện).
                // Giá trị thật nằm ở CSS variable trong index.css, đổi theo <html data-mode="comic">.
                primary: Object.fromEntries(
                    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
                        shade,
                        `rgb(var(--tw-primary-${shade}) / <alpha-value>)`,
                    ])
                ),
                // Dark Backgrounds
                dark: {
                    50: '#18181f',
                    100: '#141418',
                    200: '#0f0f14',
                    300: '#0d0d12',
                    400: '#0a0a0f',
                    500: '#09090b',
                },
                // Surface (for cards)
                surface: {
                    100: 'rgba(139, 92, 246, 0.05)',
                    200: 'rgba(139, 92, 246, 0.08)',
                    300: 'rgba(139, 92, 246, 0.12)',
                },
                // Accent Colors
                accent: {
                    gold: '#FBBF24',
                    green: '#22C55E',
                    red: '#EF4444',
                }
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            boxShadow: {
                'glow-sm': '0 0 15px rgba(139, 92, 246, 0.2)',
                'glow': '0 0 30px rgba(139, 92, 246, 0.3)',
                'glow-lg': '0 0 60px rgba(139, 92, 246, 0.4)',
                'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
                'card-hover': '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.2)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'slide-in-right': 'slideInRight 0.5s ease-out forwards',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'slow-zoom': 'slow-zoom 20s ease-in-out infinite alternate',
                'shimmer': 'shimmer 1.5s infinite',
            },
            transitionTimingFunction: {
                'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
