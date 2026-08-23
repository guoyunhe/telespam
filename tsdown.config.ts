import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  dts: {
    tsgo: true,
  },
  exports: true,
});
