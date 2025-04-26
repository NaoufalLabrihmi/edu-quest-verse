
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// EduQuestVerse custom colors
				"edu-purple": {
					DEFAULT: "#6C63FF",
					50: "#F1F0FF",
					100: "#E3E1FF",
					200: "#C7C3FF",
					300: "#ABA5FF",
					400: "#8E87FF",
					500: "#6C63FF",
					600: "#4035FF",
					700: "#1507FF",
					800: "#0D00D9",
					900: "#0A00A6"
				},
				"edu-blue": {
					DEFAULT: "#4A94FF",
					50: "#EDF5FF",
					100: "#DBEAFF",
					200: "#B5D4FF",
					300: "#8FBEFF",
					400: "#69A9FF",
					500: "#4A94FF",
					600: "#0F70FF",
					700: "#0056D6",
					800: "#00429F",
					900: "#002E6F"
				},
				"edu-pink": {
					DEFAULT: "#FF6B9B",
					50: "#FFF0F5",
					100: "#FFE1EC",
					200: "#FFC3D9",
					300: "#FFA5C6",
					400: "#FF88B2",
					500: "#FF6B9B",
					600: "#FF3979",
					700: "#FF0758",
					800: "#D60043",
					900: "#A30033"
				},
				"edu-orange": {
					DEFAULT: "#FF9A4A",
					50: "#FFF3E9",
					100: "#FFE7D3",
					200: "#FFCFA6",
					300: "#FFB779",
					400: "#FFAC5F",
					500: "#FF9A4A",
					600: "#FF8117",
					700: "#E36A00",
					800: "#B05200",
					900: "#7D3A00"
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"float": {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-10px)" },
				},
				"pulse-soft": {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.8" },
				},
				"scale-in": {
					"0%": { transform: "scale(0)", opacity: "0" },
					"100%": { transform: "scale(1)", opacity: "1" },
				},
				"scale-out": {
					"0%": { transform: "scale(1)", opacity: "1" },
					"100%": { transform: "scale(0)", opacity: "0" },
				},
				"slide-up": {
					"0%": { transform: "translateY(20px)", opacity: "0" },
					"100%": { transform: "translateY(0)", opacity: "1" },
				},
				"celebrate": {
					"0%": { transform: "scale(0) rotate(0deg)" },
					"50%": { transform: "scale(1.2) rotate(10deg)" },
					"100%": { transform: "scale(1) rotate(0deg)" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"float": "float 3s ease-in-out infinite",
				"pulse-soft": "pulse-soft 2s ease-in-out infinite",
				"scale-in": "scale-in 0.2s ease-out",
				"scale-out": "scale-out 0.2s ease-in",
				"slide-up": "slide-up 0.3s ease-out",
				"celebrate": "celebrate 0.5s ease-out",
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
				display: ["Lexend", "sans-serif"],
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
