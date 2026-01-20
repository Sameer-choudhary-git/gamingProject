import { withAccountKitUi, createColorSet } from "@account-kit/react/tailwind";

// This wraps your config to inject Alchemy styles
export default withAccountKitUi({
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./ui/**/*.{ts,tsx}", // Ensure this path exists
  ],
  theme: {
    // Keep your Cyberpunk font setup
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
}, {
  // Optional: Override Alchemy login colors to match your theme
  colors: {
    "btn-primary": createColorSet("#06b6d4", "#0891b2"), // Cyan
    "fg-accent-brand": createColorSet("#06b6d4", "#0891b2"), // Cyan Text
  }
});