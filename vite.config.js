const { defineConfig } = require("vite");
const reactPlugin = require("@vitejs/plugin-react");

module.exports = defineConfig({
  root: "react-app",
  plugins: [reactPlugin()],
  server: {
    port: 5000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // Avoid browser CORS / blocked third-party fetch issues in dev
      "/coinlore-api": {
        target: "https://api.coinlore.net",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinlore-api/, ""),
      },
    },
  },
});
