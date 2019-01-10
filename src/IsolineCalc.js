import interpolate from "@turf/interpolate"
import isobands from "@turf/isobands"
import isolines from "@turf/isolines"

export default class IsolineCalc {
  constructor (data = {}) {
    this.setData(data)
  }

  setData ({points, breaks, options}) {
    this._points = points
    this._breaks = breaks
    this._options = options
  }

  /**
   * @returns {IsolineCalc}
   */
  calcIsolines () {
    this.pointGrid = this._getPointGrid()
    // get isolines
    this.multiLineStringFeatures = this._getLines(this.pointGrid)
    this.polylines = this._transformMultiToArray(this.multiLineStringFeatures)
    // get polygons
    this.multiPolygonFeature = this._getPolygons(this.pointGrid)
    this.polygons = this._transformMultiToArray(this.multiPolygonFeature)
    return this
  }

  createBoundsFromPoints () {
    const {min, max} = this._getMinAndMax(this._points)
    this._options.bounds = [
      [min[0] - 0.3, min[1] - 0.3],
      [max[0] + 0.3, max[1] + 0.3]
    ]
  }

  /**
   * @returns {IsolineCalc}
   */
  recaclOnEmpty () {
    if (this.hasBoundsInOptions() === false && this.lastCalcGeometryEmpty() === true) {
      const warnMsg = 'Polylines and polygons are empty, recacl with bounds from points. ' +
        'You can set isolines bounds manually: ' +
        'L.leafletIsolines(points, breaks, {bounds: [[lat,lng],[lat,lng]]})'
      if (self && self.console) {
        self.console.warn(warnMsg)
      } else {
        console.warn(warnMsg)
      }
      this.createBoundsFromPoints()
      this.calcIsolines()
    }
    return this
  }

  hasBoundsInOptions () {
    return this._options.bounds && this._options.bounds.length > 0
  }

  lastCalcGeometryEmpty () {
    return this._geometryEmpty(this.multiLineStringFeatures) === true && this._geometryEmpty(this.multiPolygonFeature) === true
  }

  getComputedPoly () {
    return {
      points: this._points,
      breaks: this._breaks,
      polygons: this.polygons,
      polylines: this.polylines
    }
  }

  _geometryEmpty (feature = {}) {
    for (let i = 0; i < feature.features.length; i++) {
      if (feature.features[i].geometry && feature.features[i].geometry.coordinates.length > 0) {
        return false
      }
    }
    return true
  }

  _transformMultiToArray (multi) {
    let polylines = []
    multi.features.forEach(v => {
      if (v.geometry.coordinates.length > 0) {
        v.geometry.coordinates.forEach(coordinates => {
          polylines.push({
            coordinates,
            properties: v.properties
          })
        })
      }
    })
    return polylines
  }

  _getPolygons (pointGrid) {
    return isobands(
      pointGrid,
      this._breaks,
      {
        zProperty: this._options.propertyName
      }
    )
  }

  _getLines (pointGrid) {
    return isolines(
      pointGrid,
      this._breaks,
      {
        zProperty: this._options.propertyName
      }
    )
  }

  _getFlatArray (input, tmp) {
    if (Array.isArray(input) && Array.isArray(input[0])) {
      input.forEach(v => {
        this._getFlatArray(v, tmp)
      })
    } else {
      tmp.push([input[0], input[1]])
    }
  }

  _getMinAndMax (bounds) {
    let flatBounds = []
    this._getFlatArray(bounds, flatBounds)
    let min = [Infinity, Infinity]
    let max = [-Infinity, -Infinity]
    flatBounds.forEach(p => {
      if (p[0] > max[0]) {
        max[0] = p[0]
      }
      if (p[1] > max[1]) {
        max[1] = p[1]
      }
      if (p[0] < min[0]) {
        min[0] = p[0]
      }
      if (p[1] < min[1]) {
        min[1] = p[1]
      }
    })
    return {
      min,
      max
    }
  }

  _getPointGrid () {
    let points = this._points.slice()
    if (this.hasBoundsInOptions()) {
      let {min, max} = this._getMinAndMax(this._options.bounds)
      points.push([...min, 0])
      points.push([...max, 0])
    }
    const feature = this._pointsToFeatureCollection(
      points,
      this._options.propertyName
    )
    return interpolate(
      feature,
      this._options.interpolateCellSize,
      {
        gridType: 'points',
        property: this._options.propertyName
      }
    )
  }

  _pointsToFeatureCollection (points, prop) {
    const features = []
    points.forEach(v => {
      if (v[0] && v[1]) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [+v[0], +v[1]]
          },
          properties: {
            [prop]: (v[2] || 0)
          }
        })
      }
    })
    return {
      type: 'FeatureCollection',
      features
    }
  }
}
