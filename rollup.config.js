import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import bundleWorker from 'rollup-plugin-bundle-worker'

export default [{
  input: 'src/isolinesWorker.js',
  output: {
    file: 'src/isolinesWorker.compiled.js',
    format: 'umd',
    name: 'leaflet-isolines',
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
    file: 'dist/leaflet-isolines.js',
    format: 'umd',
    name: 'leaflet-isolines',
    sourcemap: true
  },
  plugins: [
    bundleWorker(),
    resolve(),
    commonjs()
  ]
}]
