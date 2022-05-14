import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { base64 } from 'rollup-plugin-base64';

const banner =
  `/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/
`;

export default {
  input: 'index.js',
  output: {
    file: 'main.js',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default',
    banner,
  },
  external: ['obsidian'],
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    base64({ include: "**/*.wasm" })
  ]
};