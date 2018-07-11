import LeafletIsolines from './LeafletIsolines'

export default (() => {
  L.leafletIsolines = function (points, breaks, options) {
    return new LeafletIsolines(points, breaks, options)
  }
})()
