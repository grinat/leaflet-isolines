/* global L */
import LeafletIsolines from './LeafletIsolines'
import './leaflet-isolines.scss'

export default (() => {
  L.leafletIsolines = function (points, breaks, options) {
    return new LeafletIsolines(points, breaks, options)
  }
})()
