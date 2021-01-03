module.exports = {
  presets: ['@babel/preset-flow'],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
