module.exports = {
    apps: [{
        name: "greenhouse-api",
        script: "./server.js",
        mode: "fork",
        watch: false,
        env: {
            NODE_ENV: "production"
        }
    }]
};
