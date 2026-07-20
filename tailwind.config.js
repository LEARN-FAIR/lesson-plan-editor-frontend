import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    // Preflight is disabled on purpose: MUI's <CssBaseline> already provides a
    // global reset (incl. box-sizing:border-box), so we only want Tailwind's
    // component/utility layers and avoid clobbering MUI/MDXEditor styles.
    corePlugins: {
        preflight: false,
    },
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                // Brand tokens (the design's navy / teal accents)
                navy: {
                    DEFAULT: '#0c3450',
                    dark: 'rgb(10,44,68)',
                },
                teal: {
                    DEFAULT: '#19857b',
                    ink: '#0c574b',
                    surface: '#eaf5f3',
                    'surface-mid': '#d7ece8',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                card: '10px',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
            },
            keyframes: {
                'slide-in-right': {
                    from: {transform: 'translateX(100%)'},
                    to: {transform: 'translateX(0)'},
                },
                'slide-out-right': {
                    from: {transform: 'translateX(0)'},
                    to: {transform: 'translateX(100%)'},
                },
                'fade-in': {from: {opacity: '0'}, to: {opacity: '1'}},
                'fade-out': {from: {opacity: '1'}, to: {opacity: '0'}},
            },
            animation: {
                'slide-in-right': 'slide-in-right 0.25s ease-out',
                'slide-out-right': 'slide-out-right 0.2s ease-in',
                'fade-in': 'fade-in 0.2s ease-out',
                'fade-out': 'fade-out 0.2s ease-in',
            },
        },
    },
    plugins: [tailwindcssAnimate],
};
