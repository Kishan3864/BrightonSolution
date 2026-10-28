// pm2 process of the push server (index.js). Started and reloaded by scripts/deploy-push-server.mjs;
// `pm2 save` there keeps it in the list pm2 restores after a reboot.
module.exports = {
  apps: [
    {
      name: "brightonsolution-push",
      script: "index.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      exp_backoff_restart_delay: 2000,
      max_memory_restart: "300M",
      // index.js waits up to 10 s for pushes in flight before it exits.
      kill_timeout: 15000,
      time: true,
      env: { NODE_ENV: "production" },
    },
  ],
};
