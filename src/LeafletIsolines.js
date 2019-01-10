/* global L */
// import IsolinesWorker from 'worker!./isolinesWorker.js'
import IsolinesWorker from 'worker!./isolinesWorker.compiled.js'
import {getDefaultColor, detectIE} from './utils'
import './IsolineMarker'
import WorkerEmulate from './WorkerEmulate'
import polyfills from './polyfills'

export const LeafletIsolines = L.Layer.extend({
  options: {
    propertyName: 'value',
    interpolateCellSize: 4,
    isolyneCaption: (propVal) => propVal.toString(),
    polylineOptions: (propVal, dataObj) => ({
      color: getDefaultColor(propVal),
      fillColor: getDefaultColor(propVal)
    }),
    polygonOptions: (propVal, dataObj) => ({
      color: getDefaultColor(propVal),
      fillColor: getDefaultColor(propVal)
    }),
    isolineMarkerOptions: (propVal, dataObj) => ({}),
    bounds: [],
    showPolylines: true,
    showPolygons: true,
    showIsolineMarkers: true,
    enableCache: false,
    dontUseWorker: false
  },
  outputCache: {},
  _data: null,
  _isolinesLayers: [],
  _points: [],
  _breaks: [0, 1, 2, 3, 4, 5],
  initialize (points = [], breaks = [], options = {}) {
    this._points = points
    this._breaks = breaks
    try {
      polyfills()
      for (let optKey in this.options) {
        if (options.hasOwnProperty(optKey) === false) {
          options[optKey] = this.options[optKey]
        } else if (typeof options[optKey] !== typeof this.options[optKey]) {
          throw new Error(optKey + ' option must be a ' + typeof this.options[optKey])
        }
      }
      L.Util.setOptions(this, options)
      if (!window.leafletIsolinesOutputCache) {
        window.leafletIsolinesOutputCache = {}
      }
      this.outputCache = window.leafletIsolinesOutputCache
    } catch (e) {
      this._handleError(e)
      return
    }

    try {
      this._createWorker()
    } catch (e) {
      console.warn('worker init error, calc may be slow')
      this._createEmulateWorker()
    }
  },
  _createWorker () {
    if (this.options.dontUseWorker === true) {
      this._createEmulateWorker()
      return
    }
    this._isolinesWorker = new IsolinesWorker()
    this._isolinesWorker.addEventListener('error', (e) => {
      if (detectIE()) {
        console.warn('ie worker error, recalc without worker')
        this._createEmulateWorker()
        this.calc()
      } else {
        this._handleError(e)
      }
    })
    this._isolinesWorker.addEventListener('message', (e) => this._onIsolinesCalcComplete(e))
  },
  _createEmulateWorker () {
    this._isolinesWorker = new WorkerEmulate()
    this._isolinesWorker.onComplete(e => this._onIsolinesCalcComplete(e))
  },
  _onIsolinesCalcComplete ({data}) {
    try {
      if (data.error) {
        throw new Error(data.error)
      }
      this._data = data
      this.saveInCache(data)
      this._drawIsolines()
    } catch (e) {
      this._handleError(e)
    } finally {
      const endAt = +new Date()
      const generatedTime = endAt - data.startAt
      this.fire('end', {
        generatedTime
      })
    }
  },
  onAdd (map) {
    this._map = map
    this.setData(this._points, this._breaks)
  },
  addTo (map) {
    map.addLayer(this)
    // this.setData(this._points, this._breaks)
    return this
  },
  onRemove () {
    this.removeIsolines()
    return this
  },
  setData (points, breaks) {
    this._points = points || this._points
    this._breaks = breaks || this._breaks
    this.calc()
  },
  calc () {
    this.fire('start')
    const data = {
      points: this._points,
      breaks: this._breaks,
      options: this.options
    }
    if (this._isInCache(data.points)) {
      this._onIsolinesCalcComplete({
        data: this._getFromCache(data.points)
      })
      return
    }
    this._isolinesWorker.postMessage(
      JSON.parse(
        JSON.stringify(
          data,
          this._avoidCircularReference(data)
        )
      )
    )
  },
  _avoidCircularReference (obj) {
    return function (key, value) {
      return key && typeof value === 'object' && obj === value ? undefined : value
    }
  },
  _drawPolylines () {
    this._data.polylines.forEach(v => {
      const {coordinates = [], properties = {}} = v
      if (coordinates.length > 0) {
        const caption = this.options.isolyneCaption
          ? this.options.isolyneCaption(properties[this.options.propertyName])
          : properties[this.options.propertyName]
        let layerPolyline = this.createPolyline(
          coordinates,
          this.options.polylineOptions(
            properties[this.options.propertyName],
            v
          )
        )
        layerPolyline.addTo(this._map)
        this._isolinesLayers.push(layerPolyline)
        if (caption && this.options.showIsolineMarkers) {
          const marker = this.createIsolineMarker(
            layerPolyline,
            caption,
            this.options.isolineMarkerOptions(
              properties[this.options.propertyName],
              v
            ),
            coordinates
          )
          marker.addTo(this._map)
          this._isolinesLayers.push(marker)
          this.fire('isolineMarker.add', {
            marker,
            coordinates,
            properties
          })
        }
        this.fire('polyline.add', {
          layerPolyline,
          coordinates,
          properties
        })
      }
    })
  },
  _drawPolygons () {
    this._data.polygons.forEach(v => {
      const {coordinates = [], properties = {}} = v
      if (coordinates.length > 0) {
        const layerPolygon = this.createPolygon(
          coordinates,
          this.options.polygonOptions(
            properties[this.options.propertyName],
            v
          )
        )
        layerPolygon.addTo(this._map)
        this._isolinesLayers.push(layerPolygon)
        this.fire('polygon.add', {
          layerPolygon,
          coordinates,
          properties
        })
      }
    })
  },
  _drawIsolines () {
    this.removeIsolines()
    this.options.showPolylines && this._drawPolylines()
    this.options.showPolygons && this._drawPolygons()
  },
  redrawIsolines () {
    this._drawIsolines()
  },
  createPolygon (coordinates, options) {
    return L.polygon(
      coordinates,
      options
    )
  },
  createIsolineMarker (polyline, caption, options, coordinates) {
    return L.marker.isolineMarker(
      polyline,
      caption,
      options,
      coordinates
    )
  },
  createPolyline (coordinates, options) {
    if (!L.polylineDecorator) {
      // console.warn('You can use https://github.com/bbecquet/Leaflet.PolylineDecorator for draw polylines')
      return L.polyline(
        coordinates,
        options
      )
    }
    return L.polylineDecorator(
      coordinates,
      options
    )
  },
  saveInCache (output) {
    this.outputCache[this._getCacheId(output.points)] = Object.assign(
      output,
      {
        savedAt: +new Date()
      }
    )
  },
  _isInCache (points = []) {
    return this.options.enableCache && this.outputCache.hasOwnProperty(
      this._getCacheId(points)
    )
  },
  _getFromCache (points = []) {
    return this.outputCache[this._getCacheId(points)]
  },
  /**
   * id = len-firstPoint.lat-firstPoint.lng-lastPoint.lat-lastPoint.lng
   * @param points
   * @returns {string}
   * @private
   */
  _getCacheId (points = []) {
    return `${points.length}-${points[0][0]}-${points[0][1]}${points[points.length - 1][0]}-${points[points.length - 1][1]}`
  },
  removeIsolines () {
    this._isolinesLayers.forEach(v => {
      v.remove()
    })
    this._isolinesLayers = []
  },
  _handleError (e) {
    console.error(e)
    setTimeout(() => {
      this.fire('error', {
        msg: e.toString()
      })
    }, 0)
  }
})

export default LeafletIsolines
