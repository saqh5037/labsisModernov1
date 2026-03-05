module.exports = {
  apps: [{
    name: 'labsis-modern-qa',
    script: 'server/index.js',
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
