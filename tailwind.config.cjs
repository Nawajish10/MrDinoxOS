const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {

    darkMode: ["class"],

    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
                // Custom Customer Dashboard Colors
                "surface-container-low": "#1b1b1f",
                "surface-container-lowest": "#0e0e12",
                "tertiary-container": "#bdc7d9",
                "error": "#ffb4ab",
                "on-primary-fixed-variant": "#6d3733",
                "tertiary-fixed-dim": "#bdc7d9",
                "tertiary": "#d9e3f6",
                "on-surface-variant": "#d7c2bf",
                "amber-warning": "#F59E0B",
                "surface-dim": "#131317",
                "obsidian-base": "#0B0B0F",
                "inverse-on-surface": "#303034",
                "electric-red": "#FF3B3B",
                "outline-variant": "#524342",
                "primary-fixed-dim": "#ffb3ac",
                "on-secondary-fixed-variant": "#404758",
                "surface-variant": "#353439",
                "outline": "#9f8c8a",
                "on-error": "#690005",
                "on-secondary": "#2a3040",
                "charcoal-container": "#111827",
                "inverse-surface": "#e4e1e7",
                "on-surface": "#e4e1e7",
                "on-secondary-fixed": "#151b2b",
                "on-primary-fixed": "#370d0b",
                "on-error-container": "#ffdad6",
                "secondary-fixed": "#dce2f8",
                "secondary-fixed-dim": "#c0c6db",
                "on-tertiary-fixed": "#121c29",
                "surface-container": "#1f1f23",
                "primary-container": "#ffb3ac",
                "on-tertiary-fixed-variant": "#3e4756",
                "on-tertiary": "#27313f",
                "surface-container-high": "#2a292e",
                "inverse-primary": "#894e49",
                "surface-tint": "#ffb3ac",
                "cyan-info": "#06B6D4",
                "emerald-success": "#10B981",
                "on-tertiary-container": "#495362",
                "on-primary": "#51221e",
                "secondary-container": "#404758",
                "border-gray": "#1F2937",
                "tertiary-fixed": "#d9e3f6",
                "surface-container-highest": "#353439",
                "on-background": "#e4e1e7",
                "primary-fixed": "#ffdad6",
                "on-primary-container": "#7a423e",
                "surface-bright": "#39393d",
                "surface": "#131317",
                "error-container": "#93000a",
                "on-secondary-container": "#afb5c9"
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                DEFAULT: "0.25rem",
                full: "0.75rem"
            },
            spacing: {
                "base": "4px",
                "margin-mobile": "16px",
                "gutter": "24px",
                "spacing-sm": "16px",
                "spacing-md": "24px",
                "spacing-lg": "40px",
                "spacing-xs": "8px",
                "spacing-xl": "64px",
                "margin-desktop": "48px"
            },
            fontFamily: {
                "headline-lg-mobile": ["Geist"],
                "headline-lg": ["Geist"],
                "display-lg": ["Geist"],
                "label-md": ["Geist"],
                "headline-md": ["Geist"],
                "body-md": ["Geist"],
                "label-sm": ["Geist"],
                "body-lg": ["Geist"]
            },
            fontSize: {
                "headline-lg-mobile": ["28px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
                "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "700" }],
                "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800" }],
                "label-md": ["14px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
                "headline-md": ["24px", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "600" }],
                "body-md": ["16px", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }],
                "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }],
                "body-lg": ["18px", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }]
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
}


