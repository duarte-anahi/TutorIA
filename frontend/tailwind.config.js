/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Acá podés agregar colores personalizados si querés más adelante
    },
  },
  plugins: [
    // Este es el que hace que el texto de la IA se vea bien
    require('@tailwindcss/typography'),
  ],
}