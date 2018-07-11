/* global L */
export const IsolineMarker = L.Layer.extend({
  options: {
    pane: 'markerPane',
    rotate: true,
    showedPosition: 'center'
  },
  initialize (polylineLayer, caption = '', options, coords = []) {
    L.setOptions(this, Object.assign(this.options, options))

    this._polylineLayer = polylineLayer
    this._coords = coords.map(ll => L.latLng(ll))
    this._caption = caption
  },
  addTo (map) {
    map.addLayer(this)
    return this
  },
  onAdd (map) {
    this._map = map
    let el = this._element = L.DomUtil.create(
      'div',
      'leaflet-zoom-animated leaflet-isolines-isoline-marker',
      this._getMarkerPane(map))
    L.DomUtil.create('div', '', el).innerHTML = this._caption

    map.on('zoomanim', this._animateZoom, this)

    this._caclMarkerPos()
    this._setPosition()
  },
  onRemove (map) {
    map.off('zoomanim', this._animateZoom, this)
    this._getMarkerPane(map).removeChild(this._element)
    this._map = null
  },
  _getMarkerPane (map) {
    return this.getPane
      ? this.getPane()
      : map.getPanes().markerPane
  },
  _caclMarkerPos () {
    let latLngs = this._polylineLayer.getLatLngs
      ? this._polylineLayer.getLatLngs()
      : this._coords
    const showOn = this._getShowedIndex(latLngs.length)
    for (let i = 1, len = latLngs.length; i < len; i++) {
      if (i === showOn) {
        const ll1 = latLngs[i - 1]
        const ll2 = latLngs[i % len]
        this._setMarkerLatLng(ll1, ll2)
        this._setMarkerRotationAngle(ll1, ll2)
        break
      }
    }
  },
  _getShowedIndex (len) {
    if (len > 1 && this.options.showedPosition === 'center') {
      return Math.round(len / 2)
    }
    return len - 1
  },
  _setPosition () {
    L.DomUtil.setPosition(
      this._element,
      this._map.latLngToLayerPoint(this._latlng)
    )
    this._setElementRotate()
  },
  _animateZoom (options) {
    L.DomUtil.setPosition(
      this._element,
      this._map._latLngToNewLayerPoint(
        this._latlng,
        options.zoom,
        options.center
      ).round()
    )
    this._setElementRotate()
  },
  _setElementRotate () {
    if (this.options.rotate) {
      this._element.style.transform += ' rotate(' + this._rotation + 'rad)'
    }
  },
  _setMarkerLatLng (ll1, ll2) {
    const p1 = this._map.latLngToLayerPoint(ll1)
    const p2 = this._map.latLngToLayerPoint(ll2)

    this._latlng = this._map.layerPointToLatLng(
      [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2]
    )
  },
  _setMarkerRotationAngle (ll1, ll2) {
    let p1 = this._map.project(ll1)
    let p2 = this._map.project(ll2)

    this._rotation = Math.atan((p2.y - p1.y) / (p2.x - p1.x))
  }
})

export default (() => {
  L.marker.isolineMarker = function (polylineLayer, caption, options, coords) {
    return new IsolineMarker(polylineLayer, caption, options, coords)
  }
})()
