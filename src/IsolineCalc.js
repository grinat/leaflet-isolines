import interpolate from "@turf/interpolate"
import isobands from "@turf/isobands"
import isolines from "@turf/isolines"

export default class IsolineCalc {
  constructor (data) {
    this.setData(data)
  }

  setData (data) {
    this._data = data
  }

  calcIsolines () {
    const {points, breaks, options} = this._data
    const pointGrid = this._getPointGrid(
      points,
      options
    )
    // get isolines
    const multiLineStringFeatures = this._getLines(
      pointGrid,
      breaks,
      options
    )
    let polylines = this._transformMultiToArray(
      multiLineStringFeatures
    )
    // get polygons
    let multiPolygonFeature = this._getPolygons(
      pointGrid,
      breaks,
      options
    )
    let polygons = this._transformMultiToArray(
      multiPolygonFeature
    )
    return {
      points,
      pointGrid,
      multiLineStringFeatures,
      multiPolygonFeature,
      polylines,
      polygons
    }
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

  _getPolygons (pointGrid, breaks, options) {
    return isobands(
      pointGrid,
      breaks,
      {
        zProperty: options.propertyName
      }
    )
  }

  _getLines (pointGrid, breaks, options) {
    return isolines(
      pointGrid,
      breaks,
      {
        zProperty: options.propertyName
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
    let min = [999, 999]
    let max = [-999, -999]
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

  _getPointGrid (inputPoints, options) {
    let points = inputPoints.slice()
    if (options.bounds && options.bounds.length > 0) {
      let {min, max} = this._getMinAndMax(options.bounds)
      points.push([...min, 0])
      points.push([...max, 0])
    }
    const feature = this._pointsToFeatureCollection(
      points,
      options.propertyName
    )
    return interpolate(
      feature,
      options.interpolateCellSize,
      {
        gridType: 'points',
        property: options.propertyName
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
