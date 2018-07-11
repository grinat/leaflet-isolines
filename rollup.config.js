import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import bundleWorker from 'rollup-plugin-bundle-worker'
import sass from 'rollup-plugin-sass'
const pkg = require('./package')

export default [{
  input: 'src/isolinesWorker.js',
  output: {
    file: 'src/isolinesWorker.compiled.js',
    format: 'umd',
    name: pkg.name,
    sourcemap: false
  },
  plugins: [
    resolve(),
    babel(),
    commonjs(),
    uglify({
      compress: {
        drop_console: true,
        warnings: false,
        // set evaluate to false, for disable worker problems
        evaluate: false
      }
    })
  ]
}, {
  input: 'src/index.js',
  output: {
    file: 'dist/' + pkg.name + '.js',
    format: 'umd',
    name: pkg.name,
    sourcemap: true
  },
  plugins: [
    bundleWorker(),
    babel({
      exclude: ['**/*.compiled.js', '**/*.scss']
    }),
    resolve(),
    commonjs(),
    sass({
      output: 'dist/' + pkg.name + '.css'
    })
  ]
}]
