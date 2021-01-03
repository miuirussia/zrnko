import fs from 'fs';
import path from 'path';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const SRC = path.resolve(__dirname, 'src');
const isDirectory = source => fs.lstatSync(path.join(SRC, source)).isDirectory();
const IMPORTEE_PATHS = fs.readdirSync(SRC).filter(isDirectory);

console.log(IMPORTEE_PATHS);

const rootImport = options => ({
  resolveId: importee => {
    if (IMPORTEE_PATHS.some(tag => importee.startsWith(tag))) {
      const rootPath = `${options.root}/${importee}.js`;
      const absPath = path.resolve(__dirname, rootPath);
      return fs.existsSync(absPath) ? absPath : null;
    } else {
      return null;
    }
  },
});

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
  },
  plugins: [
    babel({
      presets: ['@babel/preset-flow'],
      babelHelpers: 'bundled',
    }),
    rootImport({
      root: 'src',
    }),
    nodeResolve({}),
    commonjs(),
    terser(),
  ],
};
