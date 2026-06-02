module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['CG Omega', 'Segoe UI', 'system-ui', '-apple-system', 'Arial', 'sans-serif'],
      },
      colors: {
        // Azul institucional TCE-CE — derivado do brand color #194383 (SVG oficial)
        tce: {
          950: '#0C1E3D',
          900: '#102649',
          800: '#143060',
          700: '#194383',  // BRAND COLOR OFICIAL
          600: '#1E52A0',
          500: '#2D66B8',
          400: '#5585C8',
          300: '#85AADB',
          200: '#B5CAEA',
          100: '#D8E5F4',
          50:  '#EEF4FB',
        },
        // Neutros institucionais — derivados do #3C3C3B (texto do SVG oficial)
        neutral: {
          900: '#1A1A19',
          800: '#2A2A29',
          700: '#3C3C3B',  // COR OFICIAL DE TEXTO
          600: '#555554',
          500: '#6E6E6D',
          400: '#8F8F8E',
          300: '#B8B8B7',
          200: '#D8D8D7',
          100: '#EFEFEF',
          50:  '#F8F8F8',
        },
      },
    },
  },
  plugins: [],
}
