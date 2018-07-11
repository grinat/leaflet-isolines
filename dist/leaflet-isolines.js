(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global['leaflet-isolines'] = factory());
}(this, (function () { 'use strict';

var TARGET = typeof Symbol === 'undefined' ? '__target' : Symbol();
var SCRIPT_TYPE = 'application/javascript';
var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
var URL = window.URL || window.webkitURL;
var Worker = window.Worker;

/**
 * Returns a wrapper around Web Worker code that is constructible.
 *
 * @function shimWorker
 *
 * @param { String }    filename    The name of the file
 * @param { Function }  fn          Function wrapping the code of the worker
 */
function shimWorker (filename, fn) {
    return function ShimWorker (forceFallback) {
        var o = this;

        if (!fn) {
            return new Worker(filename);
        }
        else if (Worker && !forceFallback) {
            // Convert the function's inner code to a string to construct the worker
            var source = `${ fn }`.replace(/^function.+?{/, '').slice(0, -1),
                objURL = createSourceObject(source);

            this[TARGET] = new Worker(objURL);
            URL.revokeObjectURL(objURL);
            return this[TARGET];
        }
        else {
            var selfShim = {
                    postMessage: m => {
                        if (o.onmessage) {
                            setTimeout(() => o.onmessage({ data: m, target: selfShim }));
                        }
                    }
                };

            fn.call(selfShim);
            this.postMessage = m => {
                setTimeout(() => selfShim.onmessage({ data: m, target: o }));
            };
            this.isThisThread = true;
        }
    };
}

// Test Worker capabilities
if (Worker) {
    var testWorker,
        objURL = createSourceObject('self.onmessage = function () {}'),
        testArray = new Uint8Array(1);

    try {
        // No workers via blobs in Edge 12 and IE 11 and lower :(
        if (/(?:Trident|Edge)\/(?:[567]|12)/i.test(navigator.userAgent)) {
            throw new Error('Not available');
        }
        testWorker = new Worker(objURL);

        // Native browser on some Samsung devices throws for transferables, let's detect it
        testWorker.postMessage(testArray, [testArray.buffer]);
    }
    catch (e) {
        Worker = null;
    }
    finally {
        URL.revokeObjectURL(objURL);
        if (testWorker) {
            testWorker.terminate();
        }
    }
}

function createSourceObject(str) {
    try {
        return URL.createObjectURL(new Blob([str], { type: SCRIPT_TYPE }));
    }
    catch (e) {
        var blob = new BlobBuilder();
        blob.append(str);
        return URL.createObjectURL(blob.getBlob(type));
    }
}

var IsolinesWorker = new shimWorker("./isolinesWorker.js", function (window, document) {
  var self = this;
  // import IsolineCalc from './IsolineCalc'
  require('./IsolineCalc');

  self.addEventListener('message', function (_ref) {
    var data = _ref.data;

    var startAt = +new Date();
    try {
      var isolineCalc = new IsolineCalc(data);
      var computedData = isolineCalc.calcIsolines();
      self.postMessage(Object.assign(computedData, { startAt: startAt }));
    } catch (e) {
      var error = e.toString();
      self.postMessage({
        error: error,
        startAt: startAt
      });
    }
  });
});

function getDefaultColor(propValue) {
  console.log('defaultColor', propValue);
  var val = +propValue.toString().split('-')[0];
  if (val > 255) {
    val = 255;
  } else if (val < 0) {
    val = 0;
  }
  return 'rgb(' + val + ', ' + val + ', ' + val + ')';
}

/* global L */
var IsolineMarker = L.Layer.extend({
  options: {
    pane: 'markerPane',
    rotate: true,
    showedPosition: 'center'
  },
  initialize: function initialize(polylineLayer) {
    var caption = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var options = arguments[2];
    var coords = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

    L.setOptions(this, Object.assign(this.options, options));

    this._polylineLayer = polylineLayer;
    this._coords = coords.map(function (ll) {
      return L.latLng(ll);
    });
    this._caption = caption;
  },
  addTo: function addTo(map) {
    map.addLayer(this);
    return this;
  },
  onAdd: function onAdd(map) {
    this._map = map;
    var el = this._element = L.DomUtil.create('div', 'leaflet-zoom-animated leaflet-isolines-isoline-marker', this._getMarkerPane(map));
    L.DomUtil.create('div', '', el).innerHTML = this._caption;

    map.on('zoomanim', this._animateZoom, this);

    this._caclMarkerPos();
    this._setPosition();
  },
  onRemove: function onRemove(map) {
    map.off('zoomanim', this._animateZoom, this);
    this._getMarkerPane(map).removeChild(this._element);
    this._map = null;
  },
  _getMarkerPane: function _getMarkerPane(map) {
    return this.getPane ? this.getPane() : map.getPanes().markerPane;
  },
  _caclMarkerPos: function _caclMarkerPos() {
    var latLngs = this._polylineLayer.getLatLngs ? this._polylineLayer.getLatLngs() : this._coords;
    var showOn = this._getShowedIndex(latLngs.length);
    for (var i = 1, len = latLngs.length; i < len; i++) {
      if (i === showOn) {
        var ll1 = latLngs[i - 1];
        var ll2 = latLngs[i % len];
        this._setMarkerLatLng(ll1, ll2);
        this._setMarkerRotationAngle(ll1, ll2);
        break;
      }
    }
  },
  _getShowedIndex: function _getShowedIndex(len) {
    if (len > 1 && this.options.showedPosition === 'center') {
      return Math.round(len / 2);
    }
    return len - 1;
  },
  _setPosition: function _setPosition() {
    L.DomUtil.setPosition(this._element, this._map.latLngToLayerPoint(this._latlng));
    this._setElementRotate();
  },
  _animateZoom: function _animateZoom(options) {
    L.DomUtil.setPosition(this._element, this._map._latLngToNewLayerPoint(this._latlng, options.zoom, options.center).round());
    this._setElementRotate();
  },
  _setElementRotate: function _setElementRotate() {
    if (this.options.rotate) {
      this._element.style.transform += ' rotate(' + this._rotation + 'rad)';
    }
  },
  _setMarkerLatLng: function _setMarkerLatLng(ll1, ll2) {
    var p1 = this._map.latLngToLayerPoint(ll1);
    var p2 = this._map.latLngToLayerPoint(ll2);

    this._latlng = this._map.layerPointToLatLng([(p1.x + p2.x) / 2, (p1.y + p2.y) / 2]);
  },
  _setMarkerRotationAngle: function _setMarkerRotationAngle(ll1, ll2) {
    var p1 = this._map.project(ll1);
    var p2 = this._map.project(ll2);

    this._rotation = Math.atan((p2.y - p1.y) / (p2.x - p1.x));
  }
});

(function () {
  L.marker.isolineMarker = function (polylineLayer, caption, options, coords) {
    return new IsolineMarker(polylineLayer, caption, options, coords);
  };
})();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

/* global L */
var LeafletIsolines = L.Layer.extend({
  options: {
    propertyName: 'value',
    interpolateCellSize: 4,
    isolyneCaption: function isolyneCaption(propVal) {
      return propVal.toString();
    },
    polylineOptions: function polylineOptions(propVal, dataObj) {
      return {
        color: getDefaultColor(propVal),
        fillColor: getDefaultColor(propVal)
      };
    },
    polygonOptions: function polygonOptions(propVal, dataObj) {
      return {
        color: getDefaultColor(propVal),
        fillColor: getDefaultColor(propVal)
      };
    },
    isolineMarkerOptions: function isolineMarkerOptions(propVal, dataObj) {
      return {};
    },
    bounds: [],
    showPolylines: true,
    showPolygons: true,
    showIsolineMarkers: true,
    enableCache: false
  },
  outputCache: {},
  _data: null,
  _isolinesLayers: [],
  _points: [],
  _breaks: [0, 1, 2, 3, 4, 5],
  initialize: function initialize() {
    var points = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    var _this = this;

    var breaks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    L.Util.setOptions(this, Object.assign(this.options, options));
    this._points = points;
    this._breaks = breaks;
    this._isolinesWorker = new IsolinesWorker();
    this._isolinesWorker.addEventListener('message', function (e) {
      return _this._onIsolinesWorker(e);
    });
    if (!window.leafletIsolinesOutputCache) {
      window.leafletIsolinesOutputCache = {};
    }
    this.outputCache = window.leafletIsolinesOutputCache;
  },
  _onIsolinesWorker: function _onIsolinesWorker(_ref) {
    var data = _ref.data;

    console.log('onIsolinesWorker', data);
    try {
      if (data.error) {
        throw new Error(data.error);
      }
      this._data = data;
      this.saveInCache(data);
      this._drawIsolines();
    } catch (e) {
      console.error(e);
      this.fire('error', {
        msg: e.toString()
      });
    } finally {
      var endAt = +new Date();
      var generatedTime = endAt - data.startAt;
      console.log('generatedTime', generatedTime);
      this.fire('end', {
        generatedTime: generatedTime
      });
    }
  },
  onAdd: function onAdd(map) {
    this._map = map;
    this.setData(this._points, this._breaks);
  },
  addTo: function addTo(map) {
    map.addLayer(this);
    // this.setData(this._points, this._breaks)
    return this;
  },
  setData: function setData(points, breaks) {
    this._points = points || this._points;
    this._breaks = breaks || this._breaks;
    this.fire('start');
    var data = {
      points: this._points,
      breaks: this._breaks,
      options: this.options
    };
    if (this._isInCache(data.points)) {
      this._onIsolinesWorker({
        data: this._getFromCache(data.points)
      });
      return;
    }
    this._isolinesWorker.postMessage(JSON.parse(JSON.stringify(data, this._avoidCircularReference(data))));
  },
  _avoidCircularReference: function _avoidCircularReference(obj) {
    return function (key, value) {
      return key && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && obj === value ? undefined : value;
    };
  },
  _drawPolylines: function _drawPolylines() {
    var _this2 = this;

    this._data.polylines.forEach(function (v) {
      var _v$coordinates = v.coordinates,
          coordinates = _v$coordinates === undefined ? [] : _v$coordinates,
          _v$properties = v.properties,
          properties = _v$properties === undefined ? {} : _v$properties;

      if (coordinates.length > 0) {
        var caption = _this2.options.isolyneCaption ? _this2.options.isolyneCaption(properties[_this2.options.propertyName]) : properties[_this2.options.propertyName];
        var layerPolyline = _this2.createPolyline(coordinates, _this2.options.polylineOptions(properties[_this2.options.propertyName], v));
        layerPolyline.addTo(_this2._map);
        if (caption && _this2.options.showIsolineMarkers) {
          var marker = _this2.createIsolineMarker(layerPolyline, caption, _this2.options.isolineMarkerOptions(properties[_this2.options.propertyName], v), coordinates);
          marker.addTo(_this2._map);
          _this2.fire('isolineMarker.add', {
            marker: marker,
            coordinates: coordinates,
            properties: properties
          });
        }
        _this2.fire('polyline.add', {
          layerPolyline: layerPolyline,
          coordinates: coordinates,
          properties: properties
        });
      }
    });
  },
  _drawPolygons: function _drawPolygons() {
    var _this3 = this;

    this._data.polygons.forEach(function (v) {
      var _v$coordinates2 = v.coordinates,
          coordinates = _v$coordinates2 === undefined ? [] : _v$coordinates2,
          _v$properties2 = v.properties,
          properties = _v$properties2 === undefined ? {} : _v$properties2;

      if (coordinates.length > 0) {
        var layerPolygon = _this3.createPolygon(coordinates, _this3.options.polygonOptions(properties[_this3.options.propertyName], v));
        layerPolygon.addTo(_this3._map);
        _this3.fire('polygon.add', {
          layerPolygon: layerPolygon,
          coordinates: coordinates,
          properties: properties
        });
      }
    });
  },
  _drawIsolines: function _drawIsolines() {
    this.removeIsolines();
    this.options.showPolylines && this._drawPolylines();
    this.options.showPolygons && this._drawPolygons();
  },
  redrawIsolines: function redrawIsolines() {
    this._drawIsolines();
  },
  createPolygon: function createPolygon(coordinates, options) {
    return L.polygon(coordinates, options);
  },
  createIsolineMarker: function createIsolineMarker(polyline, caption, options, coordinates) {
    return L.marker.isolineMarker(polyline, caption, options, coordinates);
  },
  createPolyline: function createPolyline(coordinates, options) {
    if (!L.polylineDecorator) {
      console.warn('You can use https://github.com/bbecquet/Leaflet.PolylineDecorator for draw polylines');
      return L.polyline(coordinates, options);
    }
    return L.polylineDecorator(coordinates, options);
  },
  saveInCache: function saveInCache(output) {
    this.outputCache[this._getCacheId(output.points)] = Object.assign(output, {
      savedAt: +new Date()
    });
  },
  _isInCache: function _isInCache() {
    var points = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    return this.options.enableCache && this.outputCache.hasOwnProperty(this._getCacheId(points));
  },
  _getFromCache: function _getFromCache() {
    var points = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    return this.outputCache[this._getCacheId(points)];
  },

  /**
   * id = len-firstPoint.lat-firstPoint.lng-lastPoint.lat-lastPoint.lng
   * @param points
   * @returns {string}
   * @private
   */
  _getCacheId: function _getCacheId() {
    var points = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    return points.length + '-' + points[0][0] + '-' + points[0][1] + points[points.length - 1][0] + '-' + points[points.length - 1][1];
  },
  removeIsolines: function removeIsolines() {
    this._isolinesLayers.forEach(function (v) {
      v.remove();
    });
    this._isolinesLayers = [];
  }
});

/* global L */
var index = (function () {
  L.leafletIsolines = function (points, breaks, options) {
    return new LeafletIsolines(points, breaks, options);
  };
})();

return index;

})));
//# sourceMappingURL=leaflet-isolines.js.map
