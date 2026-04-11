import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.css = {
      ...config.css,
      postcss: {
        plugins: [(await import("@tailwindcss/postcss")).default],
      },
    };
    return config;
  },
};

export default config;
