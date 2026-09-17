// PM2 ecosystem for mohallaMitr self-contained EC2 deployment.
// Place this file at /var/www/mohallamitr/apps/backend/deployment/ec2/ecosystem.config.cjs
// and run: pm2 start ecosystem.config.cjs --env production

const path = require("path");

const backendRoot = path.resolve(__dirname, "../..");
const webRoot = path.resolve(__dirname, "../../../web");

module.exports = {
  apps: [
    {
      name: "mohallamitr-backend",
      cwd: backendRoot,
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      // The backend entrypoint imports 'dotenv/config', which loads ./.env from cwd.
      log_file: "/var/log/pm2/mohallamitr-backend.log",
      error_file: "/var/log/pm2/mohallamitr-backend-error.log",
      out_file: "/var/log/pm2/mohallamitr-backend-out.log",
      merge_logs: true,
      max_memory_restart: "1G",
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: "10s",
      kill_timeout: 5000,
      listen_timeout: 5000,
    },
    {
      name: "mohallamitr-web",
      cwd: webRoot,
      script: "npx",
      args: "serve out -l 3000 -s",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      log_file: "/var/log/pm2/mohallamitr-web.log",
      error_file: "/var/log/pm2/mohallamitr-web-error.log",
      out_file: "/var/log/pm2/mohallamitr-web-out.log",
      merge_logs: true,
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: "10s",
    },
  ],
};
