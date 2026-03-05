module.exports = {
  apps: [{
    name: 'labsis-modern-qa',
    script: 'server/index.js',
    node_args: '--env-file=.env.qa',
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
