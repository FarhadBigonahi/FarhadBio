// pm2 process definition for farhadbio-api.
//
// Deliberately a SEPARATE ecosystem file from the ProMall apps' shared one:
// this service must be startable, reloadable and removable without touching an
// unrelated project's config. Installed at
// /home/deploy/apps/farhadbio-api/ecosystem.config.js by provision.sh.
//
// Fork mode, 1 instance. SQLite has a single writer, and the in-process event
// retention timer must not run in parallel copies — cluster mode would give us
// both problems for a workload that is nowhere near needing it.

module.exports = {
  apps: [
    {
      name: "farhadbio-api",
      cwd: "/home/deploy/apps/farhadbio-api/current",
      script: "dist/index.js",
      // Absolute path so the env never depends on the cwd surviving a symlink
      // flip. Node reads it natively — no dotenv dependency in the app.
      node_args: "--env-file=/home/deploy/apps/farhadbio-api/shared/.env",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      // This box has 3.8 GB shared with two ProMall apps; a leak here must not
      // take the whole machine down with it.
      max_memory_restart: "250M",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s",
      merge_logs: true,
      time: true,
      // pm2 sends SIGINT on reload; index.ts drains connections on it.
      kill_timeout: 5000,
    },
  ],
};
