module.exports = {
  apps: [
    {
      name: "server",
      script: "server.js",   // <-- Your main server file
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
