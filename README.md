## leaflet-isolines
[Leaflet](http://www.leafletjs.com) plugin for draw isolines.
Used [turfjs](http://turfjs.org/).

### Example
[Open](https://github.com/grinat/leaflet-isolines/blob/master/examples/index.html) (see in /examples)


### Usage
```
import 'leaflet'
// import script after leaflet
import 'leaflet-isolines'
import 'leaflet-isolines/src/leaflet-isolines.css'

var options = {}
var isoline = L.leafletIsolines([
  [lat, lng, value],
  ...
], [1, 2, ...], options)
isoline.on('start', function () {
  // on start calc isolines in worker
})
isoline.on('end', function (evt) {
  // on end calc isolines in worker
})
isoline.on('error', function (evt) {
  // on error
  console.error(evt.msg)
})
isoline.addTo(map)
```

For use with https://github.com/bbecquet/Leaflet.PolylineDecorator
```
import 'leaflet'
import 'leaflet-polyline-decorator'
// import script after leaflet
import 'leaflet-isolines'
import 'leaflet-isolines/src/leaflet-isolines.css'

L.leafletIsolines([
  [lat, lng, value],
  ...
], [1, 2, ...], options).addTo(map)
```


### Events

start

end

error => ({msg})

isolineMarker.add => ({
 marker,
 coordinates,
 properties
})

polyline.add => ({
 layer,
 coordinates,
 properties
})

polygon.add => ({
 layer,
 coordinates,
 properties
})

### Options

```
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
    enableCache: false
```
