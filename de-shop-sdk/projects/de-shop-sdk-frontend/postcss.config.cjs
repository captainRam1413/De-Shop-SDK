// Local PostCSS config so Vite does not walk up the directory tree and pick up
// unrelated PostCSS configs from parent folders (a common cause of deploy-time
// "Invalid PostCSS Plugin found" errors). Autoprefixer is already a devDependency.
// Using .cjs because package.json sets "type": "module".
module.exports = {
  plugins: {
    autoprefixer: {},
  },
}
