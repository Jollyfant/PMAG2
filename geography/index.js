var collections = new Array();
var eulerData = new Object();
var KMLLayers = new Array();
var mapMakers = new Array();
var openedCollection;

function addMap() {

  const MAP_CONTAINER = "map";
  const TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const GEOLOGY_LAYER = "https://mrdata.usgs.gov/services/worldgeol?";

  const VIEWPORT = new L.latLng(35, 0);

  // Reload the map when the tab is focussed on
  $("#nav-apwp-tab").on("shown.bs.tab", mapTabFocusHandler);

  // Set map options (bounds)
  var mapOptions = {
    "minZoom": 2,
    "maxBounds": new L.latLngBounds(new L.latLng(-90, -180), new L.latLng(90, 180)),
    "maxBoundsViscosity": 0.5,
    "attributionControl": true
  }

  // Create the map and tile layer
  map = L.map(MAP_CONTAINER, mapOptions).setView(VIEWPORT, 1);
  L.tileLayer(TILE_LAYER).addTo(map);
  //window.geologyLayer = L.tileLayer.wms(GEOLOGY_LAYER, {"layers": "geology", "opacity": 0.5}).addTo(map);

  map.on("popupopen", function(e) {
    openedCollection = collections[e.popup._source.options.index];
  });

  // Add a lovely grid layer: good job guy who did this
  window.gridLayer = L.latlngGraticule({
    "opacity": 0.5,
    "color": HIGHCHARTS_WHITE,
    "fontColor": HIGHCHARTS_BLACK,
    "font": "12px Helvetica",
    "showLabel": true,
    "zoomInterval": [
      {"start": 2, "end": 3, "interval": 30},
      {"start": 4, "end": 4, "interval": 10},
      {"start": 5, "end": 7, "interval": 5},
      {"start": 8, "end": 10, "interval": 1},
      {"start": 10, "end": 12, "interval": 0.25}
    ]
  }).addTo(map);

  // Attach a click handler
  map.on("click", mapClickHandler);

}

function toggle() {

  if(!document.getElementById("defaultCheck1").checked && map.hasLayer(window.gridLayer)) {
    map.removeLayer(window.gridLayer);
  } else {
    map.addLayer(window.gridLayer);
  }

}

function toggleGeology() {

  if(!document.getElementById("geology-layer-toggle").checked && map.hasLayer(window.geologyLayer)) {
    map.removeLayer(window.geologyLayer);
  } else {
    map.addLayer(window.geologyLayer);
  }

}

function mapClickHandler(event) {

  /*
   * Function mapClickHandler
   * Handles mouse click event on the map
   */
 
  const LOCATION_PRECISION = 5;
 
  // Extract the latitude, longitude
  document.getElementById("site-longitude-input").value = event.latlng.lng.toPrecision(LOCATION_PRECISION);
  document.getElementById("site-latitude-input").value = event.latlng.lat.toPrecision(LOCATION_PRECISION);
 
}

function mapTabFocusHandler() {

  map.invalidateSize();


}

function getPublicationFromPID() {

  /*
   * Function getPublicationFromPID
   * Returns the resource that belogns to the PID
   */

  // Get the publication from the URL
  var SHA256 = location.search.substring(1);

  HTTPRequest("publications.json", "GET", function(PUBLICATIONS) {

    var pid = SHA256;
    var publication = PUBLICATIONS.filter(x => x.pid === pid);

    if(!publication.length) {
      return notify("danger", "Data from this persistent identifier could not be found.");
    }

    // Request the persistent resource from disk
    HTTPRequest("./publications/" + pid + ".pid", "GET", function(json) {
      addData({"data": json, "name": publication[0].filename});
      __unlock__();
    });

  });

}

function __init__() {

  document.title += " - Geography Portal";

  // Check local storage
  if(!window.localStorage) {
    return notify("warning", "Local storage is not supported by your browser. Save your work manually by exporting your data.");
  }

  if(location.search) {
    return getPublicationFromPID();
  }

  // Load the specimens from local storage
  var item = localStorage.getItem("collections");

  // Nothing returned from local storage
  if(item === null) {
    collections = new Array();
  } else {

    // Convert literals to components
    collections = JSON.parse(item).map(function(x) {
      x.components = x.components.map(function(y) {
        return new Component(y, y.coordinates);
      });
      return x;
    });

  }

  addMap();

  __unlock__();

}

function saveLocalStorage(force) {

  /*
   * Function saveLocalStorage
   * Saves sample object to local storage
   */

  if(!force && !document.getElementById("auto-save").checked) {
    return;
  }

  if(!force && window.location.search) {
    return;
  }

  // Attempt to set local storage
  try {
    localStorage.setItem("collections", JSON.stringify(collections));
  } catch(exception) {
    notify("danger", "Could not write to local storage. Export your data manually to save it.");
  }

}

function __unlock__() {

  if(collections.length) {
    notify("success", "Welcome back! Succesfully loaded <b>" + collections.length + "</b> collection(s).");
    enable();
  } else {
    notify("success", "Welcome to <b>Paleomagnetism.org</b>! Import data from the <b>Paleomagnetism 2.0.0</b> format below to get started.");
  }

  registerEventHandlers();

}

function enable() {

  $("#nav-apwp-tab").tab("show");

  updateSpecimenSelect();

  $("#specimen-select").selectpicker("refresh");

}

  $(".selectpicker").selectpicker("show");

var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keypresses on keyboard
   */

  const CODES = {
    "KEYPAD_EIGHT": 56,
    "ESCAPE_KEY": 27
  }

  if(collections.length === 0) {
    return;
  }

  // Override the default handlers
  if(!Object.values(CODES).includes(event.keyCode)) {
    return;
  }

  event.preventDefault();

  // Delegate to the appropriate handler
  switch(event.keyCode) {
    case CODES.KEYPAD_EIGHT:
      return switchCoordinateReference();
    case CODES.ESCAPE_KEY:
      return document.getElementById("notification-container").innerHTML = "";
  }

}

function registerEventHandlers() {

  /*
   * Function registerEventHandlers
   * Registers DOM event listeners and handler
   */

  // Simple listeners
  document.getElementById("euler-upload").addEventListener("change", eulerSelectionHandler);
  document.getElementById("kml-upload").addEventListener("change", kmlSelectionHandler);
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", siteSelectionHandler);
  document.getElementById("cutoff-selection").addEventListener("change", redrawCharts);
  document.getElementById("polarity-selection").addEventListener("change", redrawCharts);
  document.addEventListener("keydown", keyboardHandler);
  document.getElementById("defaultCheck1").addEventListener("change", toggle);
  document.getElementById("geology-layer-toggle").addEventListener("change", toggleGeology);

  // Always set grid to false
  document.getElementById("defaultCheck1").checked = true;
  document.getElementById("geology-layer-toggle").checked = true;

}

function getSelectedItems(id) {

  /*
   * Function getSelectedPlates
   * Returns a reference to the sites that were selected
   */

  function isSelected(option) {
    return option.selected;
  }

  function getIndex(option) {
    return option.value;
  }

  return Array.from(document.getElementById(id).options).filter(isSelected).map(getIndex);

}

document.getElementById("calculate-reference").addEventListener("click", plotPredictedDirections);

function plotPredictedDirections() {

  function mapPlateName(name) {

    switch(name) {
      case "AF":
        return "Africa";
      case "AR":
        return "Arabia";
      case "AU":
        return "Australia";
      case "CA":
        return "Caribbean";
      case "EA":
        return "East Antarctica";
      case "EU":
        return "Eurasia";
      case "GR":
        return "Greenland";
      case "IB":
        return "Iberia";
      case "IN":
        return "India";
      case "MA":
        return "Madagascar";
      case "NA":
        return "North America";
      case "PA":
        return "Pacific";
      case "SA":
        return "South America";
      default:
        return name;
    }

  }

  const APWP_FIXED_PLATE_ID = "701";

  var site = new Site(
    Number(document.getElementById("site-latitude-input").value),
    Number(document.getElementById("site-longitude-input").value)
  );

  var dataSeriesDeclination = new Array();
  var dataSeriesInclination = new Array();
  var dataSeriesPaleolatitude = new Array();
  var dataSeriesPoles = new Array();

  var counter = 0;

  var plates = getSelectedItems("plate-select");
  var references = getSelectedItems("reference-select").map(x => APWPs[x]);

  if(plates.length === 0) {
    return notify("danger", "Select at least one plate on the right hand side.");
  }

  if(references.length === 0) {
    return notify("danger", "Select at least one reference model on the left hand side.");
  }

  // Go over all plates
  plates.forEach(function(plate) {

    // All references frames
    references.forEach(function(APWP) {

      var dataDeclination = new Array();
      var dataInclination = new Array();
      var dataPaleolatitude = new Array();

      var poleSeries = new Array();

      var dataDeclinationRange = new Array();
      var dataInclinationRange = new Array();
      var dataPaleolatitudeRange = new Array();

      var poleSeriesConfidence = new Array();

      // Go over each pole
      APWP.poles.forEach(function(pole) {

        // Respect the age constraints
        if(!withinAge(pole.age)) {
          return;
        }

        // Check if the user has added euler poles
        // Fixed plate must be 701 (SOUTH AFRICA)
        if(eulerData.hasOwnProperty(plate)) {

          try {
            var eulerPole = extractEulerPole(plate, APWP_FIXED_PLATE_ID, pole.age, pole.age, 1).pop().pole;
          } catch(exception) {
            return;
          }

        } else if(!pole.euler.hasOwnProperty(plate)) {
          return;
        } else {
          var eulerPole = new EulerPole(pole.euler[plate].lng, pole.euler[plate].lat, pole.euler[plate].rot);
        }

        // The rotated pole
        var rPole = getRotatedPole(eulerPole, new Pole(pole.lng, pole.lat));
        var directions = site.directionFrom(rPole);

        if(directions.dec > 180) {
          directions.dec -= 360;
        }

        // Use A95, palat to get confidence regions
        var A95 = pole.A95 * RADIANS;
        var palat = paleolatitude(directions.inc);

        var dIx = A95 * (2 / (1 + 3 * Math.pow(Math.cos((90 - palat) * RADIANS), 2))) / RADIANS;
        var dDx = Math.asin(Math.sin(A95) / Math.cos(palat * RADIANS)) / RADIANS;
        var minPaleolatitude = paleolatitude(directions.inc - dIx);
        var maxPaleolatitude = paleolatitude(directions.inc + dIx);

        // Data series
        dataDeclination.push({"x": pole.age, "y": directions.dec, "lower": dDx, "upper": dDx});
        dataInclination.push({"x": pole.age, "y": directions.inc, "lower": dIx, "upper": dIx});
        dataPaleolatitude.push({"x": pole.age, "y": palat, "lower": minPaleolatitude, "upper": maxPaleolatitude});

        // Confidence ranges
        dataDeclinationRange.push({"x": pole.age, "low": directions.dec - dDx, "high": directions.dec + dDx});
        dataInclinationRange.push({"x": pole.age, "low": directions.inc - dIx, "high": directions.inc + dIx});
        dataPaleolatitudeRange.push({"x": pole.age, "low": minPaleolatitude, "high": maxPaleolatitude});

        poleSeries.push({"x": rPole.lng, "y": projectInclination(rPole.lat), "inc": rPole.lat, "age": pole.age});
        poleSeriesConfidence = poleSeriesConfidence.concat(getPlaneData({"dec": rPole.lng, "inc": rPole.lat}, A95 / RADIANS));
        poleSeriesConfidence.push({"x": null, "y": null});

      });

      poleSeries.push({"x": null, "y": null});

      // Make sure that the area range and line share a color
      var color = Highcharts.getOptions().colors[counter++ % 8];

      dataSeriesDeclination.push({
        "name": mapPlateName(plate) + " (" + APWP.name + ")",
        "data": dataDeclination,
        "color": color
      }, {
        "data": dataDeclinationRange,
        "type": "arearange",
        "linkedTo": ":previous",
        "marker": {
          "enabled": false
        }
      });

      dataSeriesInclination.push({
        "name": mapPlateName(plate) + " (" + APWP.name + ")",
        "data": dataInclination,
        "color": color
      }, {
        "data": dataInclinationRange,
        "type": "arearange",
        "linkedTo": ":previous",
        "marker": {
          "enabled": false
        }
      });

      dataSeriesPaleolatitude.push({
        "name": mapPlateName(plate) + " (" + APWP.name + ")",
        "data": dataPaleolatitude,
        "color": color
      }, {
        "data": dataPaleolatitudeRange,
        "type": "arearange",
        "linkedTo": ":previous",
        "marker": {
          "enabled": false
        }
      });

      dataSeriesPoles.push({
        "name": mapPlateName(plate) + " (" + APWP.name + ")",
        "data": poleSeries,
        "lineWidth": 2,
        "color": color,
        "marker": {
          "symbol": "circle"
        }
      }, {
        "data": poleSeriesConfidence,
        "type": "line",
        "lineWidth": 2,
        "dashStyle": "ShortDash",
        "enableMouseTracking": false,
        "linkedTo": ":previous",
        "marker": {
          "enabled": false
        }
      });

    });

  });

  const CHART_CONTAINER_DECLINATION = "declination-container";
  const CHART_CONTAINER_INCLINATION = "inclination-container";
  const CHART_CONTAINER_PALEOLATITUDE = "paleolatitude-container";

  plotExpected(CHART_CONTAINER_DECLINATION, dataSeriesDeclination, site);
  plotExpected(CHART_CONTAINER_INCLINATION, dataSeriesInclination, site);
  plotExpected(CHART_CONTAINER_PALEOLATITUDE, dataSeriesPaleolatitude, site);

  plotPoles(dataSeriesPoles);

  window.scrollTo(0,document.body.scrollHeight);

}

function showCollectionsOnMap() {

  /*
   * Function showCollectionsOnMap
   * Shows the collection on a map
   */

  function resetMarkers() {

    /*
     * Function getSVGPath
     * Returns an SVG path (parachute) based on an angle and error
     */

    mapMakers.forEach(x => map.removeLayer(x));
    mapMakers = new Array();

  }

  function getSVGPath(angle, error) {

    /*
     * Function getSVGPath
     * Returns an SVG path (parachute) based on an angle and error
     */


    var radError = error * RADIANS;
    var radAngle = angle * RADIANS;

    // SVG path for the marker (2px by 2px size)
    return new Array( 
      "M 1 1",
      "L", 1 + Math.sin(radAngle + radError), 1 + Math.cos(radAngle + radError),
      "A 1 1 0 0 1", 1 + Math.sin(radAngle - radError), 1 + Math.cos(radAngle - radError),
      "Z"
    ).join(" ");

  }

  function getFullSVG(path, color) {

    return encodeURI("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'><path d='" + path + "' stroke-width='0.025' stroke='black' fill='" + color + "'/></svg>").replace("#", "%23");

  }

  const MARKER_SIZE = 100;
  const MARKER_OPACITY = 0.5;

  var polarity = document.getElementById("polarity-selection").value || null;

  // Drop references to old markers
  resetMarkers();
 
  var PLOT_SPECIMENS = !document.getElementById("group-collection").checked;

  if(PLOT_SPECIMENS) {

    const DEFAULT_ANGLE = 2.5;

    getSelectedComponents().forEach(function(component) {

      var direction = component.coordinates.toVector(Direction);
      var color = (direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK);
      var markerPath = getSVGPath((180 - direction.dec), DEFAULT_ANGLE);

      var markerIcon = L.icon({
        "iconUrl": getFullSVG(markerPath, color),
        "opacity": MARKER_OPACITY,
        "iconSize": MARKER_SIZE
      });

      mapMakers.push(L.marker([component.latitude, component.longitude], {"icon": markerIcon}).addTo(map));

    });

    return;

  }

  getSelectedCollections().forEach(function(collection) {

    // Cutoff and statistics
    var cutofC = doCutoff(collection.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);

    // Get the average site location from all markers
    var averageLocation = getAverageLocation(collection);

    if(averageLocation === null) {
      return;
    }

    // Flip polarity if requested
    if((polarity === "REVERSED" && statistics.dir.mean.inc > 0) || (polarity === "NORMAL" && statistics.dir.mean.inc < 0)) {
      statistics.dir.mean.inc = -statistics.dir.mean.inc
      statistics.dir.mean.dec = (statistics.dir.mean.dec + 180) % 360; 
    }

    if(collection.color) {
      var color = collection.color;
    } else {
      var color = (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK);
    }

    var markerPath = getSVGPath((180 - statistics.dir.mean.dec), statistics.butler.dDx);

    var achenSvgString = getFullSVG(markerPath, color);

    var markerIcon = L.icon({
       "iconUrl": getFullSVG(markerPath, color),
       "opacity": MARKER_OPACITY,
       "iconSize": MARKER_SIZE
    });

    var markerPopupContent = [
      "<b>Collection " + collection.name.slice(0, 16) + "</b>",
      "<b>Longitude: </b>" + averageLocation.lng.toFixed(5),
      "<b>Latitude: </b>" + averageLocation.lat.toFixed(5),
      "<b>Average Declination: </b>" + statistics.dir.mean.dec.toFixed(2) + " (" + statistics.butler.dDx.toFixed(2) + ")",
      "<b>Average Inclination: </b>" + statistics.dir.mean.inc.toFixed(2),
      "<b>Number of Specimens: </b>" + collection.components.length,
      "<div id='color-picker'>",
        generateColorPalette(),
      "</div>"
    ].join("<br>");

    mapMakers.push(L.marker([averageLocation.lat, averageLocation.lng], {"icon": markerIcon, "index": collection.index}).bindPopup(markerPopupContent).addTo(map));

  });


}

function changeColor(color) {

  /*
   * Function changeColor
   * Changes the color of the selected collection
   */

  // Set the new color
  openedCollection.color = color;

  // Overkill but redraw all markers
  showCollectionsOnMap();

}

function generateColorPalette() {

  /*
   * Function generateColorPalette
   * Generates the color palette for site color picking
   */

  function createColorItem(color) {

    /*
     * Function generateColorPalette::createColorItem
     * Generates a div for a particular color that can be clicked
     */

    return "<div style='background-color: " + color + ";' class='color-item' onclick='changeColor(\"" + color + "\")'></div>";

  }

  // Choose from a nice saturated gradient
  const COLOR_PALETTE = new Array(
    "#F55", "#FA5", "#FF5",
    "#AF5", "#5F5", "#5FA",
    "#5FF", "#5AF", "#55F",
    "#A5F", "#F5F", "#F5A"
  );

  // Create color bar
  return COLOR_PALETTE.map(createColorItem).join("");

}

function downloadAsGeoJSON() {

  /*
   * Function downloadAsGeoJSON
   * Opens download for station metata in KML format
   */

  function GeoJSONFeatures() {

    return mapMakers.map(function(marker) {

      var iconURI = marker.options.icon.options.iconUrl;

      return {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [marker.getLatLng().lng, marker.getLatLng().lat]
        },
        "properties": {
          "icon": iconURI
        }
      }

    });

  }

  if(mapMakers.length === 0) {
    return notify("warning", "No collections are selected for exporting.");
  }

  var payload = {
    "type": "FeatureCollection",
    "features": GeoJSONFeatures()
  }

  const MIME_TYPE = "data:application/vnd.geo+json;charset=utf-8";

  downloadURIComponent("collections.json", MIME_TYPE + "," + JSON.stringify(payload));

}

function downloadAsKML() {

  /*
   * Function downloadAsKML
   * Opens download for station metata in KML format
   */

  function generateKMLPlacemarks() {

    /*
     * Function downloadAsKML::generateKMLPlacemarks
     * Generates KML string from station JSON for exporting
     */

    return mapMakers.map(function(marker, i) {

      var iconURI = marker.options.icon.options.iconUrl;

      return [
        "<Style id='" + i + "'>",
        "  <IconStyle>",
        "    <scale>3</scale>",
        "    <Icon>",
        "      <href>" + iconURI + "</href>",
        "    </Icon>",
        "  </IconStyle>",
        "</Style>",
        "<Placemark>",
        "  <Point>",
        "    <styleUrl>#" + i + "</styleUrl>",
        "    <coordinates>" + marker.getLatLng().lng + "," + marker.getLatLng().lat + "</coordinates>",
        "  </Point>",
        "</Placemark>"
      ].join("\n");
    }).join("\n");

  }

  if(mapMakers.length === 0) {
    return notify("warning", "No collections are selected for exporting.");
  }

  const XML_VERSION = "1.0";
  const XML_ENCODING = "UTF-8";
  const KML_VERSION = "2.2";
  const MIME_TYPE = "data:text/xml;charset=utf-8";

  // Encode the payload for downloading
  var payload = encodeURIComponent([
    "<?xml version='" + XML_VERSION + "' encoding='" + XML_ENCODING + "'?>",
    "<kml xmlns='http://earth.google.com/kml/" + KML_VERSION + "'>",
    generateKMLPlacemarks(),
    "</kml>"
  ].join("\n"));

  downloadURIComponent("collections.kml", MIME_TYPE + "," + payload);

}

function getAverageLocation(site) {

  /*
   * Function getAverageLocation
   * Returns the average specimen location of a collection
   */

  // We can use declination instead of poles.. doens't really matter
  var locations = site.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
    return new Direction(x.longitude, x.latitude);
  });

  if(locations.length === 0) {
    return null;
  }

  var meanLocation = meanDirection(locations);

  // Keep longitude within [-180, 180]
  if(meanLocation.dec > 180) {
    meanLocation.dec -= 360;
  }

  return {
    "lng": meanLocation.dec,
    "lat": meanLocation.inc
  }

}

function plotPoles(dataSeries) {

  /*
   * Function plotPoles
   * Plotting function for APWPs
   */

  function tooltip() {

    /*
     * Function plotPoles::tooltip
     * Handles tooltip for the Poles chart
     */

    return [
      "<b>" + this.series.name + "</b>",
      "<b>Age: </b>" + this.point.age + "Ma",
      "<b>Longitude: </b>" + this.x.toFixed(2),
      "<b>Latitude: </b>" + this.point.inc.toFixed(2)
    ].join("<br>");

  }

  // Add collection data
  getSelectedCollections().forEach(function(collection) {

    // Cutoff and statistics
    var cutofC = doCutoff(collection.components.map(x => x.inReferenceCoordinates()));

    convertedComps = cutofC.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
      var site = new Site(x.longitude, x.latitude);
      return new Component(x, site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)).toCartesian());
    });

    var statistics = getStatisticalParameters(convertedComps);

    // Plot individual specimens
    if(!document.getElementById("group-collection").checked) {

      var data = convertedComps.map(function(x) {

        var pole = x.coordinates.toVector(Pole);

        return {
          "x": pole.lng,
          "y": projectInclination(pole.lat),
          "inc": pole.lat,
          "age": x.age ? x.age.value : 0,
          "marker": {
            "symbol": "circle"
          }
        }

      });

      dataSeries.push({
        "name": "Poles",
        "type": "scatter",
        "data": data
      });

    }

    dataSeries.push({
      "name": collection.name,
      "data": [{
        "x": statistics.dir.mean.dec,
        "y": projectInclination(statistics.dir.mean.inc),
        "inc": projectInclination(statistics.dir.mean.inc),
        "age": 0
      }],
      "lineWidth": 1,
      "color": HIGHCHARTS_ORANGE,
      "marker": {
        "symbol": "circle"
      }
    }, {
      "data": getPlaneData({"dec": statistics.dir.mean.dec, "inc": statistics.dir.mean.inc}, statistics.pole.confidence),
      "type": "line",
      "color": HIGHCHARTS_ORANGE,
      "lineWidth": 1,
      "dashStyle": "ShortDash",
      "enableMouseTracking": false,
      "linkedTo": ":previous",
      "marker": {
        "enabled": false
      }
    });

  });

  const CHART_CONTAINER = "poles-container";

  Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "polar": true,
      "animation": false,
      "height": 800,
    },
    "exporting": {
      "filename": "hemisphere-projection",
      "sourceWidth": 600,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": HIGHCHARTS_BLUE,
          "align": "right"
        }
      }
    },
    "title": {
      "text": "Apparant Polar Wander Paths"
    },
    "pane": {
      "startAngle": 0,
      "endAngle": 360
    },
    "yAxis": {
      "type": "linear",
      "reversed": true,
      "labels": {
        "enabled": false
      },
      "tickInterval": 90,
      "min": 0,
      "max": 90,
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org (Equal Area Projection)",
      "href": ""
    },
    "xAxis": {
      "minorTickPosition": "inside",
      "type": "linear",
      "min": 0,
      "max": 360,
      "minorGridLineWidth": 0,
      "tickPositions": [0, 90, 180, 270, 360],
      "minorTickInterval": 10,
      "minorTickLength": 5,
      "minorTickWidth": 1
    },
    "tooltip": {
      "formatter": tooltip
    },
    "plotOptions": {
      "series": {
        "turboThreshold": 0,
        "animation": false
      }
    },
    "series": dataSeries
  });

}

function getAverageAge(collection) {

  var age = 0;
  var min = -Number.MAX_SAFE_INTEGER;
  var max = Number.MAX_SAFE_INTEGER;

  collection.components.forEach(function(component) {
    min = Math.max(min, component.ageMin);
    max = Math.min(max, component.ageMax);
    age += component.age;
  });
  
  return {
    "value": Number(age / collection.components.length),
    "min": Number(min),
    "max": Number(max)
  }

}

function randomIntFromInterval(min,max) {

  return Math.floor(Math.random()*(max-min+1)+min);

}

function withinAge(age) {

  if(typeof(age) === "number") {
    age = {"min": age, "max": age}
  }

  var min = document.getElementById("site-age-min-input").value;
  var max = document.getElementById("site-age-max-input").value;

  if(min === "") {
    min = 0;
  }

  if(max === "") {
    max = Number.MAX_SAFE_INTEGER;
  }

  return age.min >= Number(min) && age.max <= Number(max);

}

function plotExpected(container, dataSeries, site) {

  /*
   * Function plotExpected
   * Plots the sites or specimens on the APWP curves
   */

  var title;

  if(container === "declination-container") {
    title = "Predicted Declination";
  } else if(container === "inclination-container") {
    title = "Predicted Inclination";
  } else if(container === "paleolatitude-container") {
    title = "Predicted Paleolatitude";
  }

  function tooltip() {

    /*
     * Function plotExpected::tooltip
     * Handles tooltip for the Poles chart
     */

    return [
      "<b>" + this.series.name + "</b>",
      "<b>Age: </b>" + this.x + "Ma",
      "<b>" + title +": </b>" + this.y.toFixed(2),
      (this.point.lower && this.point.upper) ? "<b>Interval: </b> " + (this.y - this.point.lower).toFixed(2) + ", " + (this.y + this.point.upper).toFixed(2) : ""
    ].join("<br>");

  }

  // Plotting options
  var PLOT_SPECIMENS = !document.getElementById("group-collection").checked;
  var AGE_SCATTER = document.getElementById("age-scatter").checked;

  // Add collection data
  getSelectedCollections().forEach(function(collection) {

    // Cutoff and statistics
    var cutofC = doCutoff(collection.components.map(x => x.inReferenceCoordinates()));

    // Convert each direction to a pole and get the direction at the reference point
    var convertedComps = cutofC.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
      var realPole = new Site(x.longitude, x.latitude, x.age).poleFrom(literalToCoordinates(x.coordinates).toVector(Direction));
      return new Component(x, site.directionFrom(realPole).toCartesian());
    });

    // Plot individual specimens
    if(PLOT_SPECIMENS) {

      var data = convertedComps.map(function(x) {

        if(!x.age) {
          return;
        }

        var direction = x.coordinates.toVector(Direction);
        if(direction.dec > 180) {
          direction.dec -= 360;
        }

        // When age scatter is requested pick a random value between min & max
        return {
          "x": AGE_SCATTER ? randomIntFromInterval(x.ageMin, x.ageMax) : x.age,
          "y": direction.dec
        }

      });

      // Respect the age filters
      data = data.filter(function(x) {
        return withinAge(x.x);
      });

      dataSeries.push({
        "name": "Specimens",
        "type": "scatter",
        "data": data,
        "marker": {
          "symbol": "circle"
        }
      });

      return;

    }

    var statistics = getStatisticalParameters(convertedComps);

    // Determine an average age for the collection
    var avAge = getAverageAge(collection);

    // Respect the age filter
    if(!withinAge(avAge)) {
      return;
    }

    // Bind the declination between -180 and 180
    if(statistics.dir.mean.dec > 180) {
      statistics.dir.mean.dec -= 360;
    }

    if(container === "declination-container") {

      dataSeries.push({
        "name": collection.name,
        "color": HIGHCHARTS_ORANGE,
        "data": [{
          "x": avAge.value,
          "y": statistics.dir.mean.dec,
          "lower": statistics.butler.dDx,
          "upper": statistics.butler.dDx
        }]
      }, {
        "name": "Confidence",
        "type": "line",
        "linkedTo": ":previous",
        "enableMouseTracking": false,
        "lineWidth": 1,
        "color": HIGHCHARTS_ORANGE,
        "marker": {
          "enabled": false
        },
        "data": [{
          "x": avAge.min,
          "y": statistics.dir.mean.dec
        }, {
          "x": avAge.max,
          "y": statistics.dir.mean.dec
        }, {
          "x": null,
          "y": null
        }, {
          "x": avAge.value,
          "y": statistics.dir.mean.dec + statistics.butler.dDx
        }, {
          "x": avAge.value,
          "y": statistics.dir.mean.dec - statistics.butler.dDx
        }]
      });

    } else if(container === "inclination-container") {

      dataSeries.push({
        "name": collection.name,
        "color": HIGHCHARTS_ORANGE,
        "data": [{
          "x": avAge.value,
          "y": statistics.dir.mean.inc,
          "lower": statistics.butler.dIx,
          "upper": statistics.butler.dIx
        }]
      }, {
        "name": "Confidence",
        "type": "line",
        "linkedTo": ":previous",
        "enableMouseTracking": false,
        "lineWidth": 1,
        "color": HIGHCHARTS_ORANGE,
        "marker": {
          "enabled": false
        },
        "data": [{
          "x": Number(avAge.min),
          "y": statistics.dir.mean.inc
        }, {
          "x": Number(avAge.max),
          "y": statistics.dir.mean.inc
        }, {
          "x": null,
          "y": null
        }, {
          "x": Number(avAge.value),
          "y": statistics.dir.mean.inc + statistics.butler.dIx
        }, {
          "x": Number(avAge.value),
          "y": statistics.dir.mean.inc - statistics.butler.dIx
        }]
      });

    } else if(container === "paleolatitude-container") {

      // Paleolatitude confidence is assymetrical
      var minPaleolatitude = paleolatitude(statistics.dir.mean.inc - statistics.butler.dIx);
      var maxPaleolatitude = paleolatitude(statistics.dir.mean.inc + statistics.butler.dIx);

      dataSeries.push({
        "name": collection.name,
        "color": HIGHCHARTS_ORANGE,
        "data": [{
          "x": avAge.value,
          "y": statistics.dir.lambda,
          "lower": minPaleolatitude,
          "upper": maxPaleolatitude
        }]
      }, {
        "name": "Confidence",
        "type": "line",
        "linkedTo": ":previous",
        "enableMouseTracking": false,
        "lineWidth": 1,
        "color": HIGHCHARTS_ORANGE,
        "marker": {
          "enabled": false
        },
        "data": [{
          "x": Number(avAge.min),
          "y": statistics.dir.lambda
        }, {
          "x": Number(avAge.max),
          "y": statistics.dir.lambda
        }, {
          "x": null,
          "y": null
        }, {
          "x": Number(avAge.value),
          "y": minPaleolatitude
        }, {
          "x": Number(avAge.value),
          "y": maxPaleolatitude
        }]
      });

    }

  });

  new Highcharts.chart(container, {
    "chart": {
      "zoomType": "xy",
      "animation": false,
      "renderTo": container
    },
    "title": {
      "text": title
    },
    "subtitle": {
      "text": "At site <b>" + site.lat + "</b>°N, <b>" + site.lng + "</b>°E"
    },
    "xAxis": {
      "reversed": true,
      "title": {
        "text": "Age (Ma)"
      }
    },
    "yAxis": {
      "title": {
        "text": title + " (°)"
      }
    },
    "plotOptions": {
      "series": {
        "animation": false
      },
      "arearange": {
        "enableMouseTracking": false,
        "fillOpacity": 0.3,
      },
      "line": {
        "turboThreshold": 0,
        "marker": {
          "symbol": "circle"
        }
      }
    },
    "exporting": {
      "filename": "expected-" + title,
      "sourceWidth": 1200,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": HIGHCHARTS_BLUE,
          "align": "right"
        }
      }
    },
    "legend": {
      "maxHeight": 60
    },
    "tooltip": {
      "formatter": tooltip
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [Expected Polar wander] - <i>after van Hinsbergen et al., 2015 </i>",
      "href": ""
    },
    "series": dataSeries
  });

}

function redrawCharts() {

  /*
   * Function redrawCharts
   * Functions that handles logic of which charts to redraw
   */

  var tempScrollTop = window.pageYOffset || document.scrollingElement.scrollTop || document.documentElement.scrollTop;

  showCollectionsOnMap();
  plotPredictedDirections();

  window.scrollTo(0, tempScrollTop);

}

function siteSelectionHandler() {

  /*
   * Function siteSelectionHandler
   * Handler fired when the collection selector changes
   */

  redrawCharts();

}

var Component = function(specimen, coordinates) {

  this.name = specimen.name
  this.rejected = false;

  this.latitude = specimen.latitude;
  this.longitude = specimen.longitude;
  this.age = specimen.age;
  this.ageMin = specimen.ageMin;
  this.ageMax = specimen.ageMax;

  this.coreAzimuth = specimen.coreAzimuth
  this.coreDip = specimen.coreDip
  this.beddingStrike = specimen.beddingStrike
  this.beddingDip = specimen.beddingDip

  this.coordinates = literalToCoordinates(coordinates);

}

Component.prototype.inReferenceCoordinates = function(coordinates) {

  if(coordinates === undefined) {
    coordinates = COORDINATES;
  }

  // Return a itself as a new component but in reference coordinates
  return new Component(this, inReferenceCoordinates(coordinates, this, this.coordinates));

}

function addData(file) {

  if(file.data instanceof Object) {
    var json = file.data;
  } else {
    var json = JSON.parse(file.data);
  }

  var siteName = file.name;
  var reference = json.pid;
  var components = new Array();

  json.specimens.forEach(function(specimen) {

     specimen.interpretations.forEach(function(interpretation) {

       // Skip components that are great circles
       if(interpretation.type === "TAU3") {
         return;
       }

       components.push(new Component(specimen, interpretation.specimen.coordinates));

     });

  });

  // Do the cutoff and accept/reject direction
  collections.push({
    "name": siteName,
    "reference": reference,
    "components": components,
    "created": new Date().toISOString()
  });

}

function addPrototypeSelection(x, i) {

  /*
   * Function addPrototypeSelection
   * Adds a prototype to the user prototype selection box
   */

  var option = document.createElement("option");

  option.text = x.name;
  option.value = i;

  document.getElementById("specimen-select").add(option);

}

function updateSpecimenSelect() {

  /*
   * Function updateSpecimenSelect
   * Updates the specimenSelector with new samples
   */

  removeOptions(document.getElementById("specimen-select"));

  collections.forEach(addPrototypeSelection);

}

function removeOptions(selectbox) {

  /*
   * Function removeOptions
   * Removes options from a select box
   */

  Array.from(selectbox.options).forEach(function(x) {
    selectbox.remove(x);
  });

}

function getCutoffAngle(type) {

  switch(type) {
    case "CUTOFF45":
      return 45;
    default:
      return 0;
  }

}

function doCutoff(directions) {

  /*
   * Function doCutoff
   * Does the Vandamme or 45-cutoff
   */

  // Get the cutoff type from the DOM
  var cutoffType = document.getElementById("cutoff-selection").value || null;

  // Create a fake site at 0, 0
  var site = new Site(0, 0);

  // Create a copy in memory
  var iterateDirections = memcpy(directions);

  while(true) {

    var index;
    var deltaSum = 0;
    var cutoffValue = getCutoffAngle(cutoffType);

    // Calculate the poles & mean pole from the accepted group
    var poles = iterateDirections.filter(x => !x.rejected).map(x => site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)));
    var poleDistribution = new PoleDistribution(poles);

    // Go over all all poles
    iterateDirections.forEach(function(component, i) {

      // Do not incude directions that were already rejected
      if(component.rejected) {
        return;
      }

      var pole = site.poleFrom(literalToCoordinates(component.coordinates).toVector(Direction));

      // Find the angle between the mean VGP (mLon, mLat) and the particular VGPj.
      var angleToMean = poleDistribution.mean.toCartesian().angle(pole.toCartesian());

      // Capture the maximum angle from the mean and save its index
      if(angleToMean > cutoffValue) {
        cutoffValue = angleToMean;
        index = i;
      }

      // Add to t he sum of angles
      deltaSum += Math.pow(angleToMean, 2);

    });

    // Calculate ASD (scatter) and optimum cutoff angle (A) (Vandamme, 1994)
    var ASD = Math.sqrt(deltaSum / (poles.length - 1));
    var A = 1.8 * ASD + 5;

    if(cutoffType === null) {
      break;
    }

    // Vandamme cutoff
    if(cutoffType === "VANDAMME") {
      if(cutoffValue < A) {
        break;
      }
    }

    // 45 Cutoff
    if(cutoffType === "CUTOFF45") {
       if(cutoffValue <= getCutoffAngle("CUTOFF45")) {
        break;
      }   
    }

    iterateDirections[index].rejected = true;

  }

  return {
    "components": iterateDirections,
    "cutoff": cutoffValue,
    "scatter": ASD
  }

}

function sortSamples(type) {

  /*
   * Function sortSamples
   * Mutates the samples array in place sorted by a particular type
   */

  function getSortFunction(type) {

    /*
     * Function getSortFunction
     * Returns the sort fuction based on the requested type
     */

    function nameSorter(x, y) {
      return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
    }

    function randomSorter(x, y) {
      return Math.random() < 0.5;
    }

    switch(type) {
      case "name":
        return nameSorter;
      case "bogo":
        return randomSorter;
    }

  }

  // Sort the samples in place
  collections.sort(getSortFunction(type));

  notify("success", "Succesfully sorted specimens by <b>" + type + "</b>.");

  updateSpecimenSelect();

}

function mapPlate(id) {

  // Taken from http://earthbyte.org/Resources/Seton_etal_ESR2012_PlateIDs.pdf
  const plateNames = {
    "101": "North American Craton",
    "102": "Greenland",
    "103": "North Slope Alaska",
    "104": "Mexico",
    "105": "Baja California",
    "106": "Northern Baja California",
    "107": "Baffin Island, North America",
    "108": "Avalon-Acadia, Alaska",
    "109": "Piedmont-Florida, North America",
    "110": "Alpha Cordillera Ridge, Arctic",
    "111": "Mendeleev Ridge, Arctic",
    "112": "Chukchi Plateau, Arctic",
    "113": "Northwind Ridge, Arctic",
    "114": "Lomonosov Ridge, Arctic",
    "115": "Northern Northwind Ridge, Arctic",
    "116": "Marvin Spur Ridge, Arctic",
    "117": "Lomonosov Ridge 2, Arctic",
    "118": "North Slope Alaska 2",
    "119": "Amerasia Basin, Arctic",
    "120": "Canadian Arctic Islands",
    "121": "East Ellesmere Island, Arctic",
    "122": "East-Central Ellesmere Island, Arctic",
    "123": "West-Central Ellesmere Island, Arctic",
    "124": "West Ellesmere Island, Arctic",
    "125": "Stikine Terrane, British Columbia",
    "126": "Wrangelia and Alexander Terrane, Alaska",
    "127": "Faeroe Plate (trapped Greenland crust north of Faeroe Islands)",
    "128": "Trapped Greenland crust off Voring Plateau Plate 1",
    "129": "Trapped Greenland crust off Voring Plateau Plate 2",
    "130": "Baffin Bay, North America",
    "141": "South East Indian Ridge",
    "142": "Coral Sea Ridge, Australia",
    "143": "Tasman Ridge, Australia",
    "147": "North Sea/Icealand 1",
    "148": "North Sea/Icealand 2",
    "149": "North Sea/Icealand 3",
    "150": "Chortis, North America",
    "151": "North America, Eurasia Ridge",
    "152": "South America/North America Ridge",
    "153": "Izanagi/Pacific Ridge",
    "154": "India/Africa Ridge",
    "155": "Farewell Terrane, North America",
    "156": "Africa/Antartica Ridge",
    "157": "Banda Sea, South East Asia",
    "158": "Marie Byrd Land Ridge 1",
    "159": "Marie Byrd Land Ridge 2",
    "160": "North America Craton Margin",
    "161": "Ruby Terrrane, North America",
    "162": "West Phillipine Basin, South East Asia",
    "163": "Mellish Ridge, Australia",
    "165": "Chugach Terrane, North America",
    "166": "Wharton Ridge, Indian Ocean",
    "167": "India-Antarctica Ridge 1",
    "168": "India-Antarctica Ridge 2",
    "169": "Argo Abyssal Plain Ridge 1",
    "170": "Southern Margin Composite Terrane, North America",
    "171": "Yakutat Terrane, North America",
    "172": "Canadian Cordillera, North America",
    "173": "Belt Purcell, North America",
    "174": "Stikinia Arc, North America",
    "175": "Slide Mountain Ocea, North America",
    "176": "East Klamath, North America",
    "177": "Wrangellia 2, North America",
    "178": "Roberts Mountain and Golkonda, North America",
    "179": "Argo Abyssal Plain Ridge 2",
    "180": "Wrangellia and Alexander Terrane, North America",
    "181": "Central Aleutians, North America",
    "182": "Koyukuk, Nyak, Togiak Terranes, North America",
    "183": "Western Aleutians, North America",
    "185": "South Fiji Basin",
    "187": "Solomon Sea Ridge",
    "188": "Cache Creek Ocean, North America",
    "189": "Anarctica-Africa Ridge Segment",
    "190": "Stikinia Arc, North America",
    "191": "North America/Greenland Ridge",
    "192": "South East Indian Ridge Segment",
    "193": "North Sea-Icealand Ridge Segment",
    "194": "Kula-Farallon Ridge Segment",
    "195": "Kula-Pacific Ridge Segment",
    "196": "Canada Basin-North America Ridge Segments 1",
    "197": "Alaska-North America Ridge Segements",
    "198": "Canada Basin-North America Ridge Segments 2",
    "199": "Laurentia (Paleozoic North America)",
    "201": "South American Craton",
    "202": "Parana Basin Plate, South America",
    "203": "Phoenix-Izanagi Ridge Segments",
    "204": "Honduras-Chortis, Central America",
    "205": "Yucatan, Central America",
    "206": "Cuba, Caribbean",
    "207": "Phoenix-Pacific Ridge Segments",
    "208": "Chiapas, Central America",
    "209": "Cuchumantanes, Central America",
    "210": "Polochic-Motahua, Central America",
    "211": "Santa Cruz, Central America",
    "212": "Guayape, Central America",
    "213": "Motagua-Jocotan, Central America",
    "214": "Osbourne-Pacific Ridge",
    "215": "Guerrero, Central America",
    "216": "Cayman Ridge, Caribbean",
    "217": "West Cayman Trough, Caribbean",
    "218": "East Cayman Trough, Caribbean",
    "219": "Thunder Knoll, Caribbean",
    "220": "Rosiland Bank, Caribbean",
    "221": "Pedro Bank, Caribbean",
    "222": "Jamaica, Caribbean",
    "223": "Quinto Sueno, Caribbean",
    "224": "Caribbean Ocean Floor, Caribbean",
    "225": "Maricaibo, Venezuela, South America",
    "226": "Romeral, Colombia, South America",
    "227": "Santa Marta, South America",
    "228": "Perija, South America",
    "229": "Eastern Panama, Central America",
    "230": "Central Panama, Central America",
    "231": "Western Panama, Central America",
    "232": "Phoenix-Farallon Ridge Segements",
    "233": "Florida Straits Block, Caribbean",
    "234": "Lesser Antilles Arc, Caribbean",
    "235": "Aves Ridge, Caribbean",
    "236": "Saint Christopher Block, Caribbean",
    "237": "Puerto Rico, Caribbean",
    "238": "East Puerto Rican Trough, Caribbean",
    "239": "West Puerto Rican Trough, Caribbean",
    "240": "Muertos Trough, Caribbean",
    "241": "Caroline Ridge",
    "242": "Nazca-Izanagi Ridge Segments",
    "243": "Nazca-Kula Ridge Segments",
    "244": "Kula-Izanagi Ridge Segments",
    "245": "Pacific-Kula Ridge Segments",
    "246": "Accreted Antilles Barbados, Caribbean",
    "247": "Tasman Ridge",
    "248": "Marianna-East Parce Vela Ridge",
    "249": "East Parca Vela Basin 1",
    "250": "East Parca Vela Basin 2",
    "251": "South Fiji Basin Ridge",
    "252": "Southern Hispaniola, Caribbean",
    "253": "San Juan/Hispaniola, Caribbean",
    "254": "Hispaniola Cordillera, Caribbean",
    "255": "Northern Hispaniola, Caribbean",
    "256": "Pinar del Rio, Caribbean",
    "257": "Carribean Fault Zone 1",
    "258": "Southeastern Cuba, Caribbean",
    "259": "Sierra Meastra of Cuba, Caribbean",
    "260": "Carribean Fault Zone 2",
    "261": "Macquarie Ridge",
    "262": "North Fiji Basin",
    "263": "North Coral Sea Ridge Segements",
    "264": "Beta=2, Northern Gulf of Mexico, Caribbean",
    "265": "Beta=2, Southern Gulf of Mexico, Caribbean",
    "266": "Beta=3, Northern Gulf of Mexico, Caribbean",
    "267": "Beta=3, Central Gulf of Mexico, Caribbean",
    "268": "Beta=3, Southern Gulf of Mexico, Caribbean",
    "269": "Beta=4, Northern Gulf of Mexico, Caribbean",
    "270": "Beta=4, Southern Gulf of Mexico, Caribbean",
    "271": "Sigsbee Block, Caribbean",
    "272": "Beta=4, Central Gulf of Mexico, Caribbean",
    "273": "Puerto Rico Trench, Caribbean",
    "274": "North Cuban Thrust Sheet, Caribbean",
    "275": "South Cuban Thrust Sheet, Caribbean",
    "276": "Sandwich Plate East, Scotia Sea",
    "277": "Drake Passage North, Scotia Sea",
    "278": "Central Scotia Sea South, Scotia Sea",
    "280": "Burdwood Plate, Scotia Sea",
    "281": "Sandwich Plate West, Scotia Sea",
    "282": "North Scotia Ridge East, Scotia Sea",
    "283": "Shag Rock West, South Atlantic",
    "284": "Phillipine Sea Ridge",
    "285": "South Georgia Islands, South Atlantic",
    "286": "North Scotia Ridge, Scotia Sea",
    "287": "South Sandwich Islands, Scotia Sea",
    "288": "Falkland Islands, South Atlantic/South America",
    "289": "Falklands Plateau-Antarcica Ridge 1",
    "290": "Salado subplate on South America",
    "291": "Colorado subplate on South America",
    "292": "Pacific-Izanagi Ridge",
    "293": "Southern South America",
    "294": "Falkland Plateau (North Weddell Sea), South America",
    "298": "Juan De Fuca-Pacific Ridge Segment",
    "299": "South American subplate",
    "301": "Northern European Craton and Eurasia",
    "302": "Baltic Shield, Europe",
    "303": "Northern Highlands (Scotland), Northern Europe",
    "304": "Iberia, Southern Europe",
    "305": "Central Europe",
    "306": "Corsica/Sardinia, Southern Europe",
    "307": "Apulia/Adria, Italy, Southern Europe",
    "308": "Dinardes, Greece, Southern Europe",
    "309": "Western Svalbard, Northern Europe",
    "310": "Central Svalbard, Northern Europe",
    "311": "Barentsia, Northern Europe",
    "312": "Grampian Highlands, Northern Europe",
    "313": "Midland Valley, Europe",
    "314": "Southern Uplands, Europe",
    "315": "England-Brabant (Southern Ireland & England, northern France)",
    "316": "Cocos-Pacific Ridge Segment",
    "317": "Porcupine Plate, North Atlantic",
    "318": "Rockall Bank, Rockall Plateau, North Atlantic",
    "319": "Mosesia, Europe",
    "320": "Balearics, Europe",
    "321": "Western Europe",
    "322": "Calabria/Campania, Southern Europe",
    "323": "Northern Sicily, Southern Europe",
    "324": "Vöring Plateau",
    "325": "Nazca-Cocos Ridge Segment",
    "326": "Nazca-Pacific Ridge Segment",
    "327": "Pelagonia (Greece)",
    "328": "Vardar (Greece)",
    "329": "Betic (Spain)",
    "330": "Tornquist Block on Eurasia",
    "331": "United Kingdom Block on Eurasia",
    "332": "Pacific-Farallon Ridge Segment",
    "333": "Central Appenines (Italy)",
    "334": "Junction Plate, South East Asia",
    "335": "Eastern (Calcareous) Alps, Europe",
    "336": "Carpathia, Europe",
    "337": "Tisa, Europe",
    "338": "Rhodopes, Europe",
    "340": "Antarcica-Nazca Ridge Segment",
    "341": "Antarcica-Pacific Ridge Segment",
    "342": "Farallon-Phoneix Ridge Segment 1",
    "343": "Farallon-Phoneix Ridge Segment 2",
    "344": "Western Alps, Europe",
    "345": "Ionia (Greece), Southern Europe",
    "346": "Greece, Southern Europe",
    "347": "Crete and Southern Aegean (Greece), Southern Europe",
    "348": "Transylvania, Europe",
    "349": "Serbo-Macedonia, Europe",
    "350": "Eastern Eurasia",
    "351": "Southern Eurasia, conjugate to Greater India",
    "352": "Farallon-Phoneix Ridge Segment 3",
    "353": "Farallon-Pacific Ridge Segment 1",
    "354": "Farallon-Pacific Ridge Segment 2",
    "355": "Farallon-Pacific Ridge Segment 3",
    "358": "Kula Ridge Segment",
    "359": "Farallon-Izanagi Ridge Segment",
    "360": "Western Mesotethys Rdige Segment",
    "361": "Somalia/Africa Ridge Segment",
    "362": "Drake Passage, South, South America",
    "363": "Central Scotia Sea, South America",
    "364": "Sandwich Plate East, South America",
    "365": "Southern South America-Colorado Subplate Ridge",
    "366": "Falklands Plateau-Antarcica Ridge 2",
    "379": "Proto South China Sea Ridge, South East Asia",
    "380": "Mongol Okhotsk Plate",
    "381": "Izanagi-Pacific Ridge Segment",
    "383": "Kula-Pacific Ridge Segment",
    "384": "Nazca-Pacific Ridge Segment",
    "385": "Cocos-Pacific Ridge Segment",
    "386": "Vancouver-Pacific Ridge Segment",
    "387": "Rivera-Pacific Ridge Segment",
    "388": "Cuvier Abyssal Plain",
    "389": "North America-Africa Ridge Segment",
    "401": "Siberian Craton, North Asia",
    "402": "Kazahkstan, Central Asia",
    "403": "Kolyma, Northeast Asia",
    "405": "Verkhoyansk Plate, North Asia",
    "406": "Kamchatka Peninsula, Northeast Asia",
    "407": "Chukotsky Peninsula, Northeast Asia",
    "408": "Omolon Block, Northeast Asia",
    "409": "Northeast Siberia, Northeast Asia",
    "410": "Mongolia Block, North Asia",
    "411": "Okotsk/Chukotkaia Plate, Northeast Asia",
    "412": "Udo(Kony) Murgalia, Northeast Asia",
    "413": "Shirshov Ridge, Northeast Asia",
    "414": "Bowers Ridge, Northeast Asia",
    "415": "Amuria, Russia",
    "416": "Northeast Asia near Japan",
    "417": "Mongol-Okhotsk Basin, Russia",
    "418": "North Asian Craton Margin",
    "419": "Mainitskiy Arc, Russia",
    "421": "Anyui, Russia",
    "422": "Khanka, Russia",
    "430": "Henrietta Block, Russia",
    "431": "Chukotka, Russia",
    "432": "Amuria 2, Russia",
    "433": "East Samarka, Russia",
    "435": "Yarakvaam Plate, Russia",
    "436": "Oloy Plate, Russia",
    "437": "East Asia Basin",
    "438": "East Asia Basin 2",
    "440": "Wrangel Island, Russia",
    "446": "Burma Plate",
    "447": "Somalia Plate",
    "448": "Proto South China Sea Plate",
    "449": "West Gondwana Plate",
    "450": "East Samarka, Russia",
    "451": "Gondwana Plate",
    "452": "Laurasia Plate",
    "454": "Phoenix-Pacific Ridge",
    "455": "Ontong Java-Hikurangi Ridge",
    "456": "Ontong Java-Ellice Basin",
    "457": "Manihiki-Hikurangi Ridge",
    "458": "Norwest Manihiki Ridge",
    "459": "Cache Creek Ridge",
    "461": "Siberia 2",
    "462": "Siberia 3",
    "463": "Siberia 4",
    "464": "Siberia 5",
    "473": "Bellinghausen Sea-Pacific Ridge",
    "474": "Northeast-Southeast Manihiki Ridge",
    "475": "Farallon-Aluk Ridge",
    "476": "South Pacific Traingel Ridge 1",
    "478": "South Loyalty Basin Ridge",
    "479": "Argo Abyssal Plain-Burma Ridge",
    "481": "Phoenix-Izanagi Ridge Segment 1",
    "482": "Phoenix-Izanagi Ridge Segment 2",
    "483": "South Pacific Traingel Ridge 2",
    "484": "Manihiki-Southeast Manihiki Ridge",
    "485": "Central Mesotethys Ridge 1",
    "486": "Eastern Mesotethys Ridge 1",
    "487": "Western Mesotethys Ridge",
    "488": "Argo Abyssal Plain Ridge",
    "490": "Central Mesotethys Ridge 2",
    "491": "Eastern Mesotethys Ridge 2",
    "492": "Manihiki",
    "493": "Farallon-Phoneix Ridge 1",
    "494": "Farallon-Phoneix Ridge 2",
    "495": "Nazca-Bauer Ridge",
    "496": "Junction Ridge Segment",
    "497": "East Gondwana Plate",
    "498": "Junction Back Arc, South East Asia",
    "501": "Indian Craton",
    "502": "Sri Lanka (Ceylon)",
    "503": "Arabia",
    "504": "Taurus (southern Turkey), Eurasia",
    "505": "Iran, Asia",
    "506": "Farah (Northern Afghanistan), Eurasia",
    "507": "Helmand (Sistan, Central Afghanistan), Eurasia",
    "508": "Sinai, Arabia",
    "509": "Lebanon, Central/West Asia",
    "510": "Greater India",
    "511": "Central Indian Basin",
    "512": "Cuvier Microplate, East Indian Ocean",
    "513": "Gascoyne Microplate, East Indian Ocean",
    "514": "Elan Bank Plate (Enderby Basin), Antarctica/Indian Ocean",
    "515": "Southern Kerguelen Plateau, Antarctica/Indian Ocean",
    "516": "Enderby Basin, Antarctica/Indian Ocean",
    "519": "Jurassic Ocean Crust North of Africa",
    "520": "Western Pontides, Eurasia",
    "521": "Sakhariya, Eurasia",
    "522": "Menderes (Turkey), Eurasia",
    "523": "Lycia (Turkey), Eurasia",
    "524": "Bey Daglari (Turkey), Eurasia",
    "525": "Kirsehir (Turkey), Eurasia",
    "526": "East Pontides (northeastern Turkey), Eurasia",
    "530": "Central MesoTethys North",
    "531": "Western MesoTethys",
    "532": "Eastern MesoTethys North",
    "533": "Eastern MesoTethys",
    "534": "Central MesoTethys South",
    "535": "Central NeoTethys South",
    "537": "North Australian Basin 1",
    "538": "North Australian Basin 2",
    "540": "Palaeo Tethys",
    "541": "Palaeo Tethys North",
    "542": "Zagros, Middle East",
    "543": "North Arabia",
    "544": "Lut Block, Middle East",
    "545": "North-east Arabia",
    "546": "Soythian-Turan Block, Middle East",
    "547": "Hindu Kush, Middle East",
    "548": "Urals, Eurasia",
    "550": "North India",
    "551": "Gagra, India",
    "552": "East Argo Abyssal Plain, Eastern MesoTethys",
    "553": "West Australian Basins",
    "555": "Tarim, Asia",
    "556": "Qilan Shan, Asia",
    "573": "Malaysian Peninsula",
    "575": "Cuvee Abbysal Plain",
    "576": "India/Antarctica Spreading",
    "578": "South East Indian Ridge",
    "579": "Central India Ridge 1",
    "580": "Carlsberg Ridge 1, Indian Ocean",
    "581": "Marie Byrd Land",
    "583": "Loyalty Basin, Australia",
    "585": "Wharton Ridge, Indian Ocean",
    "586": "East Caroline Basin",
    "587": "Argo Abyssal Plain, Australia",
    "588": "Maddagascar/Africa Ridge",
    "589": "Enderby Ridge, Indian Ocean",
    "590": "Wharton Ridge (Extinct), Indian Ocean",
    "591": "Central Indian Ridge 2",
    "592": "Carlsberg Ridge 2, Indian Ocean",
    "593": "Aden Ridge, Indian Ocean",
    "594": "Red Sea, Arabia",
    "595": "Central India 1",
    "596": "Mascarene, Africa",
    "597": "Central India 2",
    "598": "Australia-India Spreading 1",
    "599": "Australia-India Spreading 2",
    "601": "North China Platform",
    "602": "South China Platform",
    "603": "Sino/Malaya, SE Asia",
    "604": "Indochina, SE Asia",
    "605": "Burma, Indian Ocean",
    "606": "South Tibet, South Asia",
    "607": "West Burma Plate, Indian Ocean",
    "608": "South Phillipine Sea",
    "609": "North Phillipine Sea",
    "610": "East Parece Vela, Philippine Sea",
    "611": "West Parece Vela Basin and West Shikoku Basin, Philippine Sea",
    "612": "Northside South China Sea, SE Asia",
    "613": "Southside South China Sea, SE Asia",
    "614": "Kalimantan/Borneo, SE Asia",
    "615": "Papua New Guinea, SE Asia",
    "616": "North Tibet, South-Central Asia",
    "617": "Reed Bank, SE Asia",
    "618": "Macclesfield Bank, SE Asia",
    "619": "Sikhate Alin, East Asia",
    "620": "Vladivostok sliver, East Asia",
    "621": "North Central Sikhate Alin sliver, East Asia",
    "622": "North Sikhate Alin sliver, East Asia",
    "623": "N-most Sikhate Alin sliver, East Asia",
    "624": "Sakhalin, East Asia",
    "625": "Central Hokkaido, East Asia",
    "626": "West Hokkaido, East Asia",
    "627": "Northeast Honshu, East Asia",
    "628": "Central Honshu, East Asia",
    "629": "Kanto Region, East Asia",
    "630": "North Southwest Honshu and Kyushu, East Asia",
    "631": "South Southwest Honshu and Kyushu, East Asia",
    "632": "Tsoshima-Strati Block, East Asia",
    "633": "North Korean Plate, East Asia",
    "634": "South Korean Plate, East Asia",
    "635": "Kita-Yamato Ridge, East Asia",
    "636": "Yamato Ridge, East Asia",
    "637": "Oki Ridge, Philippine Sea",
    "638": "Sado Ridge, East Asia",
    "639": "North Korean Margin Banks, East Asia",
    "640": "Northeast Margin-Japan Basin, East Asia",
    "641": "Japan Basin Spreading Center, East Asia",
    "642": "Yamato Basin Spreading Center, East Asia",
    "643": "Laptev Sea Margin, East Asia",
    "644": "Paracel Islands, SE Asia",
    "645": "Celebes Basin, SE Asia",
    "646": "Zamboanga Peninsula of Phillipines, SE Asia",
    "647": "Malay Peninsula, SE Asia",
    "648": "South Okinawa Trough, SE Asia",
    "649": "North Okinawa Trough, SE Asia",
    "650": "Mapia Ridge, SE Asia",
    "651": "Lombok-Sumbawa Islands, SE Asia",
    "652": "Flores-Alor Islands, SE Asia",
    "653": "Northwest Caroline Sea, Caroline Sea",
    "654": "Western Caroline Sea 1, Caroline Sea",
    "655": "Western Caroline Sea 2, Caroline Sea",
    "656": "Western Ayu Trench, Philippine Sea",
    "658": "South China Sea, SE Asia",
    "659": "East Shikoku Basin, Philippine Sea",
    "660": "Northwest South China Sea, SE Asia",
    "661": "Sundaland Piece, SE Asia",
    "662": "Eastern Japan Sea, East Asia",
    "663": "Proto South China Sea, SE and East Asia",
    "664": "Banda Sea, SE Asia",
    "665": "Celebes Sea Spreading Centre, SE Asia",
    "667": "East Sulawesi, SE Asia",
    "668": "West Sulawesi, SE Asia",
    "669": "North Sulawesi, SE Asia",
    "670": "Sula-Banggai, SE Asia",
    "671": "Manchuria, SE Asia",
    "672": "Bangka-Belitung, SE Asia",
    "673": "North Sumatra, SE Asia",
    "674": "West Philippines, SE Asia",
    "675": "Sumba, SE Asia",
    "676": "Banda Arc, SE Asia",
    "677": "Palawan Block, SE Asia",
    "678": "East Philippines, SE Asia",
    "679": "West Halmahera Block, SE Asia",
    "680": "East Halmahera Block, SE Asia",
    "681": "Seram, SE Asia",
    "682": "Kep Tanimbar, SE Asia",
    "683": "Wetar, SE Asia",
    "684": "Timor, SE Asia",
    "685": "Ayu ridge, South East Asia",
    "686": "Barisan - South Sumatra, SE Asia",
    "687": "Andaman-Nicobar Ridge, SE Asia",
    "688": "Southwest Caroline Basin, Caroline Sea",
    "689": "Northeast Caroline Basin, Caroline Sea",
    "690": "Southeast Caroline Basin, Caroline Sea",
    "691": "Central Luzon Block, SE Asia",
    "692": "Western Caroline Sea 3, Caroline Sea",
    "693": "West Caroline Ridge, Caroline Sea",
    "694": "North Luzon Arc, SE Asia",
    "695": "Amami Plateau, Philippine Sea",
    "696": "Bonin Ridge, Philippine Sea",
    "697": "North New Guinea, SE Asia",
    "698": "Central New Guinea, SE Asia",
    "699": "Mariana Ridge, Philippine Sea",
    "701": "African Craton",
    "702": "Madagascar",
    "703": "Madagascar Ridge",
    "704": "Seychelles",
    "705": "Saya de Maya-Mascarene",
    "706": "Oran Meseta",
    "707": "Moroccan Meseta",
    "708": "Kalbylies (north Africa)",
    "709": "Somalia Plate",
    "710": "Danakil Plate",
    "712": "Lake Victoria Block",
    "713": "North Mozambique",
    "714": "Northwest Africa",
    "715": "Northeast Africa",
    "718": "Tellian, Africa",
    "719": "Hyblean/Malta, Africa",
    "720": "Alboran, Africa",
    "721": "Rif, Africa",
    "750": "Malvinas Plate",
    "772": "Malvinas-Africa Ridge",
    "801": "Australia",
    "802": "Antarctica and East Antarctica",
    "803": "Antarctic Peninsula",
    "804": "Marie Byrdland (Ross Terrane) and West Antarctica",
    "805": "Ellsworth Mountains, Antarctica",
    "806": "North New Zealand (Western Province), SW Pacific",
    "807": "South New Zealand/Chatham Rise (Western Province), SW Pacific",
    "808": "Thurston Island, Antarctica",
    "809": "Whitmore Mountains, Antarctica",
    "810": "Berkner Island, Antarctica",
    "811": "South Shetland Islands, Antarctica",
    "812": "South Orkney Islands Block, Antarctica",
    "813": "Campbell Plateau (Southern part), SW Pacific",
    "814": "Bellinghausen, Pacific",
    "815": "Bruce Bank, Antarctica",
    "816": "Discovery Bank West, Antarctica",
    "817": "Discovery Bank East, Antarctica",
    "818": "Herdman Bank, Antarctica",
    "819": "Orkney Bank West, Antarctica",
    "820": "Drake Passage South, Scotia Sea",
    "821": "Tonga Ridge, SW Pacific",
    "822": "North Lau Basin, SW Pacific",
    "823": "Lau Ridge, SW Pacific",
    "824": "Vitiaz Trench, , SW Pacific",
    "825": "Fiji, SW Pacific",
    "826": "Mid-North Fiji (Basin), SW Pacific",
    "827": "New Hebrides, SW Pacific",
    "828": "Johnson Trench (western Vitiaz Trench), SW Pacific",
    "829": "North Woodlark Basin, SW Pacific",
    "830": "South Bismark Basin, SW Pacific",
    "831": "North Kerguellen, Indian Ocean",
    "832": "North Bismark, SW Pacific",
    "833": "Lord Howe Rise, SW Pacific",
    "834": "Norfolk Ridge, SW Pacific",
    "835": "Three Kings Ridge, SW Pacific",
    "836": "Louisiade Plataeu, SW Pacific",
    "837": "Kermadec Ridge, SW Pacific",
    "838": "Northwest South Fiji Basin, SW Pacific",
    "839": "East South Fiji Basin, SW Pacific",
    "842": "Mid Norfolk Ridge, SW Pacific",
    "843": "East Norfolk Ridge, SW Pacific",
    "844": "Loyalty Ridge (east of Australia), SW Pacific",
    "845": "South Loyalty Basin, Australia",
    "846": "East Papuan Composite Terrane, SW Pacific",
    "847": "North Bismark Basin, SW Pacific",
    "849": "Solomon Sea (Australia Part), SW Pacific",
    "850": "Tasmania, Australia",
    "851": "Western South Tasman Rise, Australia",
    "852": "Eastern South Tasman Rise, Australia",
    "855": "North Loyalty Basin South, SW Pacific",
    "856": "South South Fiji Basin, SW Pacific",
    "857": "North Loyalty Basin North, , SW Pacific",
    "858": "Norfolk Ridge Block 2, SW Pacific",
    "859": "Norfolk Basin Block 1, SW Pacific",
    "860": "Norfolk Basin Block 2, SW Pacific",
    "861": "Norfolk Basin Block 3, SW Pacific",
    "862": "Norfolk Basin Block 4, SW Pacific",
    "863": "Norfolk Basin Block 5, SW Pacific",
    "864": "Niuafoou (Lau Basin), SW Pacific",
    "866": "Chesterfield Plataeu, SW Pacific",
    "867": "Gilbert Seamount Complex (southeast of Tasmania), Australia",
    "868": "Challenger Plateau, SW Pacific",
    "869": "Northern Lord Howe Rise, SW Pacific",
    "870": "Lau Basin Tonga Side, SW Pacific",
    "871": "Gascoyne Abyssal Plain 1, Eastern Indian Ocean",
    "872": "Gascoyne Abyssal Plain 2, Eastern Indian Ocean",
    "873": "Gascoyne Abyssal Plain 3, Eastern Indian Ocean",
    "874": "Cuvier Abyssal Plain 1, Eastern Indian Ocean",
    "875": "Cuvier Abyssal Plain 2, Eastern Indian Ocean",
    "876": "Cuvier Abyssal Plain 3, Eastern Indian Ocean",
    "877": "Cuvier Abyssal Plain 4, Eastern Indian Ocean",
    "878": "Papuan Plataeu, SW Pacific",
    "879": "Chatham Rise, New Zealand",
    "880": "Perth Abyssal Plain 1, Eastern Indian Ocean",
    "881": "Perth Abyssal Plain 2, Eastern Indian Ocean",
    "882": "Microplate Middle Lord Howe Rise/Challenger Plataeu, SW Pacific",
    "883": "North Dampier Ridge, SW Pacific",
    "884": "Middle 1 Dampier Ridge, SW Pacific",
    "885": "Middle 2 Dampier Ridge, SW Pacific",
    "886": "South Dampier Ridge, SW Pacific",
    "887": "East Tasman Plataeu, Australia",
    "888": "Eastern Papuan Plataeu, SW Pacific",
    "889": "Mellish Rise, SW Pacific",
    "890": "Kenn Plataeu, SW Pacific",
    "891": "Iselin Bank, Antarctica",
    "892": "Northern Papua New Guinea 1, SW Pacific",
    "893": "Northern Papua New Guinea 2, SW Pacific",
    "894": "Eastern Australia",
    "895": "Eastern NeoTethys South",
    "896": "Perth Abyssal Plain, Australia",
    "897": "North Cato Trough 1, SW Pacific",
    "898": "North Cato Trough 2, SW Pacific",
    "899": "Cato Trough, SW Pacific",
    "901": "Pacific Plate",
    "902": "Farallon Plate, East Pacific",
    "903": "Vancouver Plate, North Pacific",
    "904": "Aluk Plate, South Pacific",
    "905": "Hikurangi Plataeu (Moa Plate), Pacific",
    "906": "Henry Hudson Plate, Pacific",
    "907": "Jan Mayen Plate, North Atlantic",
    "908": "East Manihiki, Pacific Ocean",
    "909": "Cocos Plate, East Pacific",
    "910": "Juan de Fuca Plate, North Pacific",
    "911": "Nazca Plate, East Pacific",
    "912": "North Magellan, Pacific",
    "913": "South Magellan, Pacific",
    "914": "Chinook Plate, North Pacific",
    "915": "Mathematician Plate, East Pacific",
    "916": "Rivera Plate, East Pacific",
    "917": "Guadelupe Plate, East Pacific",
    "918": "Kula Plate, North Pacific",
    "919": "Phoenix Plate, Pacific",
    "920": "Manihiki, Pacific Ocean",
    "921": "Osbourn Trough Phoenix Plate, Pacific",
    "922": "Easter Island Plate, East Pacific",
    "923": "Juan Fernandez Plate, East Pacific",
    "924": "Farallon Plate to Cocos Plate, East Pacific",
    "925": "Leif Plate, Pacific",
    "926": "Izanagi Plate 1, Northwest Pacific",
    "927": "Izanagi Plate 2, Northwest Pacific",
    "928": "Farallon Plate to Phoenix Plate, Pacific",
    "929": "Aluk Plate 2, South Pacific",
    "930": "Phoenix Plate to Nazca Plate, Pacific",
    "931": "Bellinghausen Plate 2, South Pacific",
    "932": "Farallon Plate to Kula Plate, North Pacific",
    "933": "Izanagi Plate 3, Northwest Pacific",
    "934": "Izanagi Plate 4, Northwest Pacific",
    "935": "Present Day Nazca, East Pacific",
    "936": "Henry Hudson Plate, Pacific",
    "937": "Marie Byrd Land 2, South Pacific",
    "938": "Izanagi Plate to Kula Plate, North Pacific",
    "939": "Pacific Plate to Kula Plate, North Pacific",
    "940": "Farallon Plate Becomes Caribeean",
    "941": "Aleutian Basin, Pacifc Ocean",
    "942": "Filchner Block, Antarctica",
    "943": "Haag, Antarctica",
    "944": "Dronning Maud Land, Antarctica",
    "945": "Lutzow-Holm Bay, Antarctica",
    "946": "Raynor Provine, Antarctica",
    "960": "Phoenix Plate to Phillipine Sea Plate, Northwest Pacific",
    "961": "North Bismark Basin",
    "962": "Celebes Sea",
    "970": "Rivera Microplate, East Pacific",
    "971": "Bauer Microplate, East Pacific",
    "972": "Bauer Microplate Core, East Pacific",
    "973": "Trapped Carribean",
    "981": "Ontong Java Plateau fixed to Pacific",
    "982": "Manihiki fixed to Ontong Java",
    "983": "Hikurangi fixed to Manihiki",
    "984": "Southeast Manihiki 1",
    "985": "Southeast Manihiki 2",
    "986": "Southeast Manihiki 3",
    "987": "Southeast Manihiki 4",
    "988": "North Birds Head, Papua New Guinea",
    "989": "Birds Head, Papua New Guinea",
    "990": "North Iberia, Europe",
    "991": "West Panthalassa Spreading Centre 1",
    "992": "West Panthalassa Spreading Centre 2",
    "993": "South Panthalass Spreading Centre 1",
    "994": "South Panthalass Spreading Centre 2",
    "995": "East Panthalass Spreading Centre 1",
    "996": "East Panthalass Spreading Centre 2"
  }

  if(!plateNames.hasOwnProperty(id)) {
    return {
      "name": null, "id": id
    }
  }

  return {
    "name": plateNames[id], "id": id
  }

}

function removeKMLLayers() {

  /*
   * Function 
   * Handles selection of KML file from disk
   */

  // Remove all layers
  KMLLayers.forEach(x => map.removeLayer(x));
  KMLLayers = new Array();

}

function kmlSelectionHandler(event) {

  /*
   * Function kmlSelectionHandler
   * Handles selection of KML file from disk
   */

  function file2XMLDOM(file) {

    /*
     * Function kmlSelectionHandler::file2XMLDOM
     * Converts file data to DOMParser object and throws during error
     */

    var XMLDocument = new DOMParser().parseFromString(file.data, "text/xml");

    if(XMLDocument.getElementsByTagName("parsererror").length) {
      throw(new Exception("Could not add overlay: invalid KML."));
    }

    return XMLDocument;

  }

  // Read all selected files from disk and add them to the map
  readMultipleFiles(Array.from(event.target.files), function(files) {

    // Convert KML to DOM element
    var domElements = files.map(file2XMLDOM);

    // Convertions to GeoJSON
    try { 
      parseGroundOverlay(domElements);
      var layers = domElements.map(toGeoJSON.kml).map(L.geoJSON);
    } catch(exception) {
      return notify("danger", exception);
    }

    // Add all the layers
    layers.forEach(x => KMLLayers.push(x.addTo(map)));

    notify("success", "Succesfully added " + layers.length + " overlay(s) to map.");

  });

}

function parseGroundOverlay(documents) {

  /*
   * Function parseGroundOverlay
   * Parses a groundOverlay child to image on map
   */

  function parseLatLonBox(element) {

    /*
     * Function parseLatLonBox
     * Parses latitude, longitude KML LatLonBox to Leaflet bounds
     */

    var north, east, south, west;

    Array.from(element.children).forEach(function(child) {

      switch(child.nodeName) {
        case "north":
          return north = Number(child.innerHTML);
        case "south":
          return south = Number(child.innerHTML);
        case "east":
          return east = Number(child.innerHTML);
        case "west":
          return west = Number(child.innerHTML);
        default:
          return;
      };

    });

    // Confirm all corners are present
    if([north, east, south, west].some(x => x === undefined)) {
      throw(new Exception("Could not determine groundOverlay bounding box."));
    }

    // Convert to Leaflet bounds
    return L.latLngBounds([north, east], [south, west]);

  }

  // Go over each submitted document
  documents.forEach(function(doc) {

    Array.from(doc.firstChild.children).forEach(function(child) {
    
      // Skip anything that is not a groundOverlay
      if(child.nodeName !== "GroundOverlay") {
        return;
      }

      var url, box;

      Array.from(child.children).forEach(function(x) {
    
        switch(x.nodeName) {
          case "Icon":
            return url = x.children[0].innerHTML;
          case "LatLonBox":
            return box = parseLatLonBox(x);
          default:
            return;
        }
    
      });
    
      // Validate the URI
      if(!url.startsWith("http")) {
        throw(new Exception("The selected groundOverlay image must be a valid URL."));
      }

      // Save reference for deletion
      KMLLayers.push(L.imageOverlay(url, box).addTo(map));
    
    });

  });

}

function eulerSelectionHandler(event) {

  /*
   * Function eulerSelectionHandler
   * Callback fired when a euler file is selected (.rot)
   */

  readMultipleFiles(Array.from(event.target.files), function(files) {

    // Create a hashmap for the plate ID
    try { 
      parseGPlatesRotationFile(files);
    } catch(exception) {
      notify("danger", exception.message);
    }

  });
 
}

function parseGPlatesRotationFile(files) {

  /*
   * Function parseGPlatesRotationFile
   * Parses and loads a selected GPlates rotation file
   */

  function parseLine(line) {

    /*
     * Function eulerSelectionHandler::parseLine
     * Parses a single line of the file
     */

    var values = line.split(/\s+/);

    if(values.length < 6) {
      throw(new Exception("Invalid GPlates rotation file."));
    }

    return {
      "id": values[0],
      "age": Number(values[1]),
      "lat": Number(values[2]),
      "lng": Number(values[3]),
      "rot": Number(values[4]),
      "rel": values[5]
    }

  }


  // Create a hashmap for the plate ID
  files.pop().data.split(/\r?\n/).slice(1, -1).map(parseLine).forEach(function(x) {

    if(!eulerData.hasOwnProperty(x.id)) {
      eulerData[x.id] = new Array();
    }

    eulerData[x.id].push(x);

  });

  function byName(a, b) {

    if((a.name || a.id) < (b.name || b.id)) return -1;
    if((a.name || a.id) > (b.name || b.id)) return 1;
    return 0;

  }

  var optionGroup = document.createElement("optgroup");
  optionGroup.label = "Custom Rotations";

  // Add Euler poles to plates
  Object.keys(eulerData).map(mapPlate).sort(byName).forEach(function(plate) {

    // Skip unconstrained plate
    if(plate.id === "1001") {
      return;
    }

    var option = document.createElement("option");

    option.text = plate.name || plate.id;
    option.value = plate.id;

    optionGroup.appendChild(option);

  })

  document.getElementById("plate-select").add(optionGroup);

  $("#plate-select").selectpicker("refresh");

  notify("success", "Succesfully added rotation information for <b>" + Object.keys(eulerData).length + "</b> plates.");

}

function extractEulerPole(plate, fixed, min, max, increment) {

  /*
   * Function extractEulerPole
   * Gets arbitrary rotation poles
   */

  if(Object.keys(eulerData).length === 0) {
    return notify("danger", "No custom Euler poles are loaded.");
  }

  if(!eulerData.hasOwnProperty(plate)) {
    return notify("danger", "Could not plate with id <b>" + plate + "</b>.");
  }

  if(plate === fixed) {
    return notify("danger", "The fixed plate and relative plate are equal.");
  }

  var plate = plate.toString();
  var fixed = fixed.toString();

  var poles = new Array();

  // Go over all requested ages
  for(var age = min; age <= max; age += increment) {
    
    // same
    var a = getStagePoleAge(plate, age);
    var b = getStagePoleAge(fixed, age);

    // Could not determine the pole (age problem?)
    if(a === null || b === null) {
      throw("Could not deterine Euler pole.");
    }

    // Reverse the angle
    var b = new EulerPole(b.lng, b.lat, -b.angle);
    var pole = convolvePoles(a, b);

    // Save this pole
    poles.push({"pole": pole, "age": age});

  }

  return poles;

}


function getStagePoleAge(ID, age) {

  // Create an empty total reconstruction pole
  var totalPole = new EulerPole(0, 0, 0);

  // Uh.. nothing
  if(age === 0) {
    return totalPole;
  }

  // Continue when we are referencing the fixed plate ID
  while(ID !== "000") {

    var plateData = eulerData[ID];

    // Search input for matching plateID & age
    for(var i = 0; i < plateData.length; i++) {
      
      if(plateData[i].age < age) {

        // Last age checked: return the total pole
        if(i === plateData.length - 1) {
          return null;
        } 

        continue;

      }

      // Get the previous pole
      var poleYoung = new EulerPole(plateData[i - 1].lng, plateData[i - 1].lat, plateData[i - 1].rot);
      var poleOld = new EulerPole(plateData[i].lng, plateData[i].lat, plateData[i].rot);

      // Calculate the stage pole
      var stagePole = getStagePole(poleOld, poleYoung);

      // Interpolate the stage pole to a given age
      var interPole = getInterPole(poleOld, stagePole, plateData[i].age, plateData[i - 1].age, age);

      // Add the interpolated pole to the total reconstruction pole
      totalPole = convolvePoles(totalPole, interPole);

      // Update the relative plate identifier and move up the GPlates tree
      ID = plateData[i].rel;
      break;

    }

  }

  return totalPole;

}

function addCollectionData(files, format) {

  switch(format) {
    case "DIR2":
      return files.forEach(addData);
    case "PMAG":
      return files.forEach(importPmag);
    default:
      throw(new Exception("Unknown importing format requested."));
  }

}

function importPmag(file) {

  /*
   * Function importPmag
   * Imports deprecated Paleomagnetism.org 1.0.0 format to the application
   */

  var json = JSON.parse(file.data);

  json.data.forEach(function(site) {

    var metadata = site.metaData;
    var components = site.data.map(function(x, i) {

      var dec = x[0];
      var inc = x[1];
      var coords = new Direction(dec, inc).toCartesian().toLiteral();

      if(x.length > 2) {
        var strike = x[2];
        var dip = x[3];
      } else {
        var strike = 0;
        var dip = 0;
      }

      if(x.length > 4) {
        var name = x[4];
      } else {
        var name = metadata.name + "." + i;
      }

      return new Component({
        "name": name,
        "latitude": metadata.latitude,
        "longitude": metadata.longitude,
        "age": Number(metadata.age),
        "ageMin": Number(metadata.minAge),
        "ageMax": Number(metadata.maxAge),
        "coreAzimuth": 0,
        "coreDip": 90,
        "beddingStrike": strike,
        "beddingDip": dip,
      }, coords);

    });

    collections.push({
      "name": metadata.name,
      "reference": "specimen",
      "components": components,
      "created": json.dateExported
    });

  });

}

function fileSelectionHandler(event) {

  /*
   * Function fileSelectionHandler
   * Callback fired when input files are selected
   */

  const format = document.getElementById("format-selection").value;

  readMultipleFiles(Array.from(event.target.files), function(files) {

    // Drop the samples if not appending
    if(!document.getElementById("append-input").checked) {
      collections = new Array();
    }

    var nCollections = collections.length;

    // Try adding the demagnetization data
    try {
      addCollectionData(files, format);
    } catch(exception) {
      return notify("danger", exception);
    }

    enable();
    saveLocalStorage();
    $("#specimen-select").selectpicker("refresh");
    notify("success", "Succesfully added <b>" + (collections.length - nCollections) + "</b> specimen(s).");

  });

}

__init__();
