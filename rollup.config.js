import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import bundleWorker from 'rollup-plugin-bundle-worker'
import preset2015 from 'babel-preset-es2015-rollup'

export default {
  entry: 'src/index.js',
  format: 'umd',
  moduleName: 'leaflet-isolines',
  plugins: [
    resolve(),
    bundleWorker(),
    babel({
      exclude: 'node_modules/**',
      presets: [ preset2015 ]
    }),
    uglify({
      compress: {
        drop_console: true,
        warnings: false,
        // set evaluate to false, for disable worker problems
        evaluate: false
      }
    }),
    commonjs()
  ],
  external: [ 'leaflet' ],
  sourceMap: true,
  dest: 'dist/leaflet-isolines.js'
}
