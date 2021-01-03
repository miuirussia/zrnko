module.exports = {
  'root': true,
  'env': {
    'node': true,
    'browser': true,
    'es2021': true
  },
  'globals': {
    '__DEV__': false
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:flowtype/recommended'
  ],
  'parser': 'babel-eslint',
  'plugins': [
    'react',
    'react-hooks',
    'flowtype',
  ],
  'rules': {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  }
};
