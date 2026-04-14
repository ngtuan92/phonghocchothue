import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindScrollbarHide from "tailwind-scrollbar-hide";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      data: {
        active: "active~='true'",
      },
      screens: {
        '1400px': '1400px',
        '1700px': '1700px',
      },
      colors: {
        primary: "#1A94FF",
        red: {
          DEFAULT: "#dc2626",
          600: "#dc2626",
        },
        danger: {
          DEFAULT: "#FF424E",
          100: "#F56157",
        },
        foreground: {
          DEFAULT: "#323232",
          100: "#302E2F",
        },
        info: {
          DEFAULT: "#2196F3",
          100: "#EAF0FC",
          200: "#5CB5FC",
          300: "#567DF4",
          400: "#e0e9fd",
        },
        gray: {
          200: "#EDF7FF",
          300: "#D9D9D9",
          400: "#e5e5e5",
          500: "#ABABAB",
          600: "#888888",
          700: "#515158",
          800: "#fdf6f5",
          900: "#E4E4E5",
        },
        warning: {
          DEFAULT: "#FFC400",
          800: "#EE3313",
          900: "#FF0000",
        },
        light: {
          DEFAULT: "#F4F4F4",
          100: "#F2F9FF",
          200: "#F5F5F5",
          500: "#515158",
          600: "#FAFAFA",
          700: "#F2F2F2",
          800: "#F8F8F8",
        },
        neutral: {
          200: "#23262F",
        },
        success: {
          DEFAULT: "#20C976",
        },
      },
      height: {
        topbar: "36px",
        navbar: "54px",
      },
      spacing: {
        0.5: "2px",
        1.25: "5px",
        1.5: "6px",
        1.75: "7px",
        3.75: "15px",
        4.5: "18px",
        5.5: "22px",
        6.5: "26px",
        7.5: "30px",
        12.5: "50px",
        15: "60px",
        18: "72px",
        21: "84px",
        22.5: "90px",
        25: "100px",
        30: "120px",
        31.5: "126px",
        39: "136px",
        70: "280px",
        90: "360px",
        100: "400px",
        111: "444px",
        165: "660px",
      },
      lineHeight: {
        "18px": "18px",
      },
      boxShadow: {
        normal: "0px 3.2px 16.1px 0px rgba(223, 223, 223, 0.4)",
        "action-button": "0px 4px 20px 0 #DFDFDF66",
      },
      fontSize: {
        tiny: "11px",
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-slower': 'spin 15s linear infinite',
        'scroll-left': 'scroll-left 15s linear infinite',
      },
      keyframes: {
        'scroll-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [
    tailwindScrollbarHide,
    plugin(function ({
      addComponents,
      addUtilities,
      matchUtilities,
      theme,
      addBase,
    }) {
      addBase({
        body: {
          color: "#323232",
        },
      });

      addUtilities({
        ".flex-center": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        ".flex-between": {
          display: "flex",
          justifyContent: "space-between",
        },
        ".flex-center-between": {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
        ".flex-center-y": {
          display: "flex",
          alignItems: "center",
        },
        ".flex-center-x": {
          display: "flex",
          justifyContent: "center",
        },
        ".absolute-center-y": {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
        },
        ".absolute-center-x": {
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        },
        ".absolute-center": {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        },
        ".shadow-default": {
          boxShadow: "0px 4px 20px 0 rgba(223, 223, 223, 0.4)",
        },
      });

      matchUtilities(
        {
          circle: (value) => ({
            borderRadius: "100rem",
            width: value,
            height: value,
            minWidth: value,
            minHeight: value,
          }),
        },
        {
          values: theme("spacing"),
        }
      );

      addComponents({
        ".text-body-sm": {
          fontSize: "14px",
          lineHeight: "18px",
        },
        ".text-body": {
          fontSize: "16px",
          lineHeight: "20px",
        },
        ".title-6": {
          fontSize: "16px",
          fontWeight: "700",
        },
        ".img-fluid": {
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        },
      });
    }),
  ],
};

export default config;
