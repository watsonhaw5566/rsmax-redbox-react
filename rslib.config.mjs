import { defineConfig } from '@rslib/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  lib: [
    {
      format: 'cjs',
      output: {
        distPath: {
          root: './lib',
        },
        externals: {
          react: 'react',
        },
      },
    },
  ],
  output: {
    type: 'web',
  },
  plugins: [pluginReact()],
});
