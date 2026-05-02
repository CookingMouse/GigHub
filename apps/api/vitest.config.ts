import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@gighub/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js")
    }
  },
  test: {
    globals: true,
    fileParallelism: false
  }
});
