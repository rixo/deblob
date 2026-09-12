import { defineConfig } from "deblob"

export default defineConfig({
  include: ["src/**"],
  // the Vite entry: builds the source, mounts the app
  assembly: ["src/main.ts"],
})
