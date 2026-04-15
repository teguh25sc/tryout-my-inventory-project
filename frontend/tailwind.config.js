/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Ini akan men-scan semua file di folder src
  ],
  theme: {
    extend: {
      // Kamu bisa menambah custom warna atau font di sini jika mau
      colors: {
        indigo: {
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [],
}
