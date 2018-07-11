import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import bundleWorker from 'rollup-plugin-bundle-worker'

export default [{
  entry: 'src/isolinesWorker.js',
  format: 'umd',
  moduleName: 'leaflet-isolines',
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
  ],
  sourceMap: true,
  dest: 'src/isolinesWorker.compiled.js'
}, {
  entry: 'src/index.js',
  format: 'umd',
  moduleName: 'leaflet-isolines',
  plugins: [
    bundleWorker(),
    resolve(),
    commonjs()
  ],
  external: ['leaflet'],
  sourceMap: true,
  dest: 'dist/leaflet-isolines.js'
}]
