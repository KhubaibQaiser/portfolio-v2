import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    config.css = {
      ...config.css,
      postcss: {
        plugins: [(await import("@tailwindcss/postcss")).default],
      },
    };
    config.optimizeDeps = {
      ...config.optimizeDeps,
      include: [...(config.optimizeDeps?.include ?? []), "framer-motion", "lenis"],
    };
    return config;
  },
};

export default config;
