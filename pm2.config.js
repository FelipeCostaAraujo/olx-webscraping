module.exports = {
  apps: [
    {
      name: 'olx-app',
      script: './dist/index.js',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
  ],
};
