var collections = new Array();
var GPlatesData = new Object();
var KMLLayers = new Array();
var APWPs, PLATE_NAMES;
var mapMakers = new Array();
var openedCollection;

$(".selectpicker").selectpicker("show");

var COORDINATES_COUNTER = 0;
var COORDINATES = "specimen";

const MARKER_SIZE = 100;
const MARKER_OPACITY = 0.5;

function addMap() {

  /*
   * Function addMap
   * Adds a Leaflet map to the application
   */

  const MAP_CONTAINER = "map";
  const TILE_LAYER_DEFAULT = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_LAYER_ARCGIS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const VIEWPORT = new L.latLng(35, 0);

  // Set map options (bounds)
  var mapOptions = {
    "minZoom": 2,
    "attributionControl": true
  }

  // Create the map and tile layer
  map = L.map(MAP_CONTAINER, mapOptions).setView(VIEWPORT, 1);

  window.defaultLayer = L.tileLayer(TILE_LAYER_DEFAULT);
  window.arcgisLayer = L.tileLayer(TILE_LAYER_ARCGIS);
  toggleSatelliteLayer();

  // Reload the map when the tab is focussed on
  $("#nav-apwp-tab").on("shown.bs.tab", map.invalidateSize.bind(map));

  // Other handlers
  map.on("popupopen", mapPopupHandler);
  map.on("click", mapClickHandler);

  // Add a lovely grid layer: good job guy who did this
  window.gridLayer = createGridLayer(map);

}

function mapPopupHandler(event) {

  /*
   * Function mapPopupHandler
   * Handler when a marker popup is opened
   */

  // Reference the opened collection
  openedCollection = collections[event.popup._source.options.index];

}

function createGridLayer(map) {

  /*
   * Function addGrid
   * Adds grid as Leaflet layer
   */

  return L.latlngGraticule({
    "opacity": 1,
    "color": HIGHCHARTS_WHITE,
    "fontColor": HIGHCHARTS_WHITE,
    "font": "12px Sans-Serif",
    "showLabel": true,
    "zoomInterval": [
      {"start": 2, "end": 3, "interval": 30},
      {"start": 4, "end": 4, "interval": 10},
      {"start": 5, "end": 7, "interval": 5},
      {"start": 8, "end": 10, "interval": 1},
      {"start": 10, "end": 12, "interval": 0.25}
    ]
  }).addTo(map);

}

function toggleSatelliteLayer() {

  if(document.getElementById("enable-satellite").checked) {
    map.removeLayer(window.defaultLayer);
    map.addLayer(window.arcgisLayer);
  } else {
    map.removeLayer(window.arcgisLayer);
    map.addLayer(window.defaultLayer);
  }

}

function toggleGridLayer() {

  /*
   * Function toggleGridLayer
   * Toggles the grid layer on/off
   */

  // Add or remove
  if(!document.getElementById("defaultCheck1").checked && map.hasLayer(window.gridLayer)) {
    map.removeLayer(window.gridLayer);
  } else {
    map.addLayer(window.gridLayer);
  }

}

function mapClickHandler(event) {

  /*
   * Function mapClickHandler
   * Handles mouse click event on the map
   */
 
  const LOCATION_PRECISION = 5;
 
  // Extract the latitude, longitude and put it in the HTML input
  document.getElementById("site-longitude-input").value = event.latlng.lng.toPrecision(LOCATION_PRECISION);
  document.getElementById("site-latitude-input").value = event.latlng.lat.toPrecision(LOCATION_PRECISION);
 
}

function __init__() {

  /*
   * Function __init__
   * Initializes the geography portal
   */

  document.title += " - Geography Portal";

  // Check local storage
  if(!window.localStorage) {
    return notify("warning", "Local storage is not supported by your browser. Save your work by exporting your data manually.");
  }

  // A database/collection from the data library is requested
  if(location.search) {
    return getPublicationFromPID();
  }

  // Load the specimens from local storage
  var item = localStorage.getItem("collections");

  // Something was returned from local storage
  if(item !== null) {
    // Convert the saved literals to components
    collections = JSON.parse(item).map(function(x) {
      x.components = x.components.map(function(y) {
        return new Component(y, y.coordinates);
      });
      return x;
    });
  }

  __unlock__();

}

function __unlock__() {

  /*
   * Function __unlock__
   * Unlocks the application
   */

  // Add Leaflet map to the Geography portal
  addMap();

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

function keyboardHandler(event) {

  /*
   * Function keyboardHandler
   * Handles keyboard inputs and delegates to functions
   */

  const CODES = {
    "KEYPAD_EIGHT": 56,
    "ESCAPE_KEY": 27,
    "E_KEY": 69,
    "Q_KEY": 81,
    "S_KEY": 83
  }

  if(collections.length === 0) {
    return;
  }

  // Only handle implemented key functions
  if(!Object.values(CODES).includes(event.keyCode)) {
    return;
  }

  // An input element is being focused: stop key events
  if(document.activeElement.nodeName === "INPUT" || document.activeElement.nodeName === "TEXTAREA") {
    return;
  }

  event.preventDefault();

  // Delegate to the appropriate handler
  switch(event.keyCode) {
    case CODES.KEYPAD_EIGHT:
      return switchCoordinateReference();
    case CODES.ESCAPE_KEY:
      return document.getElementById("notification-container").innerHTML = "";
    case CODES.E_KEY:
      return editSelectedCollection();
    case CODES.S_KEY:
      return exportSelectedCollections();
    case CODES.Q_KEY:
      return deleteSelectedCollections();
  }

}

function registerEventHandlers() {

  /*
   * Function registerEventHandlers
   * Registers DOM event listeners and handler
   */

  // Simple listeners
  document.getElementById("site-input-area").addEventListener("scroll", updateTextAreaCounter);
  document.getElementById("euler-upload").addEventListener("change", eulerSelectionHandler);
  document.getElementById("lit-upload").addEventListener("change", litSelectionHandler);
  document.getElementById("apwp-upload").addEventListener("change", APWPSelectionHandler);
  document.getElementById("kml-upload").addEventListener("change", kmlSelectionHandler);
  document.getElementById("customFile").addEventListener("change", fileSelectionHandler);
  document.getElementById("specimen-select").addEventListener("change", showCollectionsOnMap);
  document.getElementById("cutoff-selection").addEventListener("change", redrawCharts);
  document.addEventListener("keydown", keyboardHandler);
  document.getElementById("defaultCheck1").addEventListener("change", toggleGridLayer);
  document.getElementById("enable-satellite").addEventListener("change", toggleSatelliteLayer);
  document.getElementById("calculate-reference").addEventListener("click", plotPredictedDirections);

  document.getElementById("defer-input").addEventListener("click", inputFileWrapper);
  document.getElementById("add-site-input").addEventListener("click", addSiteWindow);
  document.getElementById("specimen-age-select").addEventListener("change", handleAgeSelection);

  // Always set grid to true
  document.getElementById("defaultCheck1").checked = true;

  // Enable the information popovers
  $(".example-popover").popover({"container": "body"});

  updateTextAreaCounter();
  loadDatabaseFiles();

}

function loadDatabaseFiles() {

  /*
   * Function loadDatabaseFiles
   * Adds JSON files from a database
   */

  HTTPRequest("db/apwp.json", "GET", function(data) {
    APWPs = data;
  });

  HTTPRequest("db/plates.json", "GET", function(data) {
    PLATE_NAMES = data;
  });

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
  var radAngle = Math.PI - angle * RADIANS;

  // SVG path for the marker (2px by 2px size) parachute based on the declination and error
  return new Array( 
    "M 1 1",
    "L", 1 + Math.sin(radAngle + radError), 1 + Math.cos(radAngle + radError),
    "A 1 1 0 0 1", 1 + Math.sin(radAngle - radError), 1 + Math.cos(radAngle - radError),
    "Z"
  ).join(" ");

}

function getFullSVG(path, color) {

  /*
   * Function getFullSVG
   * Returns the full SVG path
   */

  return encodeURI("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'><path d='" + path + "' stroke-width='0.025' stroke='black' fill='" + color + "'/></svg>").replace("#", "%23");

}

function showCollectionsOnMap() {

  /*
   * Function showCollectionsOnMap
   * Shows the collection on a map
   */

  // Drop references to old markers
  resetMarkers();
 
  // Individual specimens should be plotted
  if(!document.getElementById("group-collection").checked) {

    // Individual specimens have no confidence .. set it to 2.5 degrees to make it m
    const DEFAULT_ANGLE = 2.5;

    getSelectedComponents().forEach(function(component) {

      // Confirm the component location is valid
      if(isInvalidLocation(component)) {
        return;
      }

      if(!withinAge(component.age)) {
        return;
      }

      var direction = component.coordinates.toVector(Direction);
      var color = (direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK);
      var markerPath = getSVGPath(direction.dec, DEFAULT_ANGLE);

      var markerIcon = L.icon({
        "iconUrl": getFullSVG(markerPath, color),
        "opacity": MARKER_OPACITY,
        "iconSize": MARKER_SIZE
      });

      mapMakers.push(L.marker([component.latitude, component.longitude], {"icon": markerIcon, "name": null}).addTo(map));

    });

    return;

  }

  getSelectedCollections().forEach(function(collection) {

    // Only plot collections with a valid location
    if(collection.components.some(isInvalidLocation)) {
      return console.debug("Cannot plot collection " + collection.name + " because the location is invalid.");
    }

    // Determine an average age for the collection
    var avAge = getAverageAge(collection);

    // Respect the age filter
    if(!withinAge(avAge)) {
      return;
    }

    // Cutoff and statistics
    var cutofC = doCutoff(collection.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);

    // Get the average site location from all markers
    var averageLocation = getAverageLocation(collection);

    if(averageLocation === null) {
      return;
    }

    if(collection.color) {
      var color = collection.color;
    } else {
      var color = (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK);
    }

    var markerPath = getSVGPath(statistics.dir.mean.dec, statistics.butler.dDx);

    var achenSvgString = getFullSVG(markerPath, color);

    var markerIcon = L.icon({
       "iconUrl": getFullSVG(markerPath, color),
       "opacity": MARKER_OPACITY,
       "iconSize": MARKER_SIZE
    });

    var markerPopupContent = [
      "<h5>" + collection.name.slice(0, 16) + "</h5><i class='fas fa-map-marker' aria-hidden='true'></i> " + averageLocation.lng.toFixed(3) + "°E " + averageLocation.lat.toFixed(3) + "°N",
      "<b>Average Declination: </b>" + statistics.dir.mean.dec.toFixed(2) + " (" + statistics.butler.dDx.toFixed(2) + ")",
      "<b>Average Inclination: </b>" + statistics.dir.mean.inc.toFixed(2),
      "<b>Number of Specimens: </b>" + collection.components.length,
      "<hr><div id='color-picker'>" + generateColorPalette() + "</div>",
    ].join("<br>");

    mapMakers.push(L.marker([averageLocation.lat, averageLocation.lng], {"icon": markerIcon, "index": collection.index, "name": collection.name}).bindPopup(markerPopupContent).addTo(map));

  });


}

function isInvalidLocation(component) {

  /*
   * Function isInvalidLocation
   * Returns true when either the latitude or longitude is null
   * and the component has no geographic position
   */

  return component.latitude === null || component.longitude === null;

}

function changeColor(color) {

  /*
   * Function changeColor
   * Changes the color of the selected collection
   */

  // Set the new color
  openedCollection.color = color;

  saveLocalStorage();

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
    // First row
    "#F55", "#FA5", "#FF5",
    "#AF5", "#5F5", "#5FA",
    "#5FF", "#5AF", "#55F",
    "#A5F", "#F5F", "#F5A",
    // Second row
    "#A00", "#A50", "#AA0",
    "#5A0", "#0A0", "#0A5",
    "#0AA", "#05A", "#00A",
    "#50A", "#A0A", "#A05",
    // Third row
    "#FFF", "#DDD", "#AAA",
    "#888", "#555", "#222",
    "#000"
  );

  // Create color bar
  return COLOR_PALETTE.map(createColorItem).join("");

}

function downloadAsGeoJSON() {

  /*
   * Function downloadAsJSON
   * Opens download for station metata in KML format
   */

  function GeoJSONFeature(marker) {

    /*
     * Function downloadAsGeoJSON::GeoJSONFeatures
     * Converts collections to GeoJSON features
     */

    return {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": new Array(marker.getLatLng().lng, marker.getLatLng().lat)
      },
      "properties": {
        "icon": marker.options.icon.options.iconUrl
      }
    }

  }

  const GEO_JSON_MIME_TYPE = "data:application/vnd.geo+json;charset=utf-8";

  // No markers to export to GeoJSON
  if(mapMakers.length === 0) {
    return notify("warning", "No collections are selected for exporting.");
  }

  var payload = {
    "type": "FeatureCollection",
    "features": mapMakers.map(GeoJSONFeature)
  }

  downloadURIComponent("collections.json", GEO_JSON_MIME_TYPE + "," + JSON.stringify(payload));

}

function downloadAsKML() {

  /*
   * Function downloadAsKML
   * Opens download for station metata in KML format
   */

  function generateKMLPlacemark(marker, i) {

    /*
     * Function downloadAsKML::generateKMLPlacemarks
     * Generates KML string from station JSON for exporting
     */

    var iconURI = marker.options.icon.options.iconUrl;

    return new Array(
      "<Style id='" + i + "'>",
      "  <IconStyle>",
      "    <scale>3</scale>",
      "    <Icon>",
      "      <href>" + iconURI + "</href>",
      "    </Icon>",
      "  </IconStyle>",
      "</Style>",
      "<Placemark>",
      "  <name>" + marker.options.name + "</name>",
      "  <Point>",
      "    <styleUrl>#" + i + "</styleUrl>",
      "    <coordinates>" + marker.getLatLng().lng + "," + marker.getLatLng().lat + "</coordinates>",
      "  </Point>",
      "</Placemark>"
    ).join("\n");

  }

  if(mapMakers.length === 0) {
    return notify("warning", "No collections are selected for exporting.");
  }

  // Constant XML headers
  const XML_VERSION = "1.0";
  const XML_ENCODING = "UTF-8";
  const KML_VERSION = "2.2";
  const MIME_TYPE = "data:text/xml;charset=utf-8";

  // Encode the payload for downloading
  var payload = encodeURIComponent([
    "<?xml version='" + XML_VERSION + "' encoding='" + XML_ENCODING + "'?>",
    "<kml xmlns='http://earth.google.com/kml/" + KML_VERSION + "'>",
    "<Document>",
    mapMakers.map(generateKMLPlacemark).join("\n"),
    "</Document>",
    "</kml>"
  ].join("\n"));

  downloadURIComponent("collections.kml", MIME_TYPE + "," + payload);

}

function getAverageAge(collection) {

  /*
   * Function getAverageAge
   * Returns the average, minimum and maximum age of a collection
   */

  var age = 0;
  var min = -Number.MAX_SAFE_INTEGER;
  var max = Number.MAX_SAFE_INTEGER;

  collection.components.forEach(function(component) {
    min = Math.max(min, component.ageMin);
    max = Math.min(max, component.ageMax);
    age += component.age;
  });
  
  return {
    "value": age / collection.components.length,
    "min": min,
    "max": max
  }

}

function randomIntFromInterval(min,max) {

  /*
   * Function randomIntFromInterval
   * Returns a random integer from the requested interval
   */

  return Math.floor(Math.random() * (max - min + 1) + min);

}

function withinAge(age) {

  /*
   * Function withinAge
   * Checks whether a given age falls within the submitted range
   */

  // If not an age object is passed
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

function redrawCharts() {

  /*
   * Function redrawCharts
   * Functions that handles logic of which charts to redraw
   */

  // Save the current screen offset. A Highcharts redraw drags the scroll up to the top of the page
  var tempScrollTop = window.pageYOffset || document.scrollingElement.scrollTop || document.documentElement.scrollTop;

  showCollectionsOnMap();

  // Reset to previous scroll position
  window.scrollTo(0, tempScrollTop);

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

function mapPlate(id) {

  /*
   * Function mapPlate
   * Maps the GPlates plate identifier to a name
   * Taken from http://earthbyte.org/Resources/Seton_etal_ESR2012_PlateIDs.pdf
   */

  // Just return the ID
  if(!PLATE_NAMES.hasOwnProperty(id)) {
    return {
      "name": id, "id": id
    }
  }

  return {
    "name": PLATE_NAMES[id], "id": id
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
      throw(new Exception("Could not add overlay: invalid KML selected."));
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

    // Confirm all required corners are present
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
      if(!url.startsWith("http") && !url.startsWith("https")) {
        throw(new Exception("The selected groundOverlay image must be a valid URL."));
      }

      // Save reference for deletion
      KMLLayers.push(L.imageOverlay(url, box).addTo(map));
    
    });

  });

}

function APWPSelectionHandler(event) {

  /*
   * Function eulerSelectionHandler
   * Callback fired when a euler file is selected (.rot)
   */

  readMultipleFiles(Array.from(event.target.files), function(files) {

    // Create a hashmap for the plate ID
    try { 
      parseAPWPFile(files);
    } catch(exception) {
      notify("danger", exception.message);
    }

  });
 
}

function parseAPWPFile(files) {

  /*
   * Function parseAPWPFile
   * Parses a supplied APWP file
   */

  function parseAPWPLine(line) {

    /*
     * Function parseAPWPFile::parseAPWPLine
     * Parses a single line of the file
     */

    var values = line.split(",").map(Number);

    if(values.length !== 4) {
      throw(new Exception("Invalid APWP input file. Each row must contain pole longitude, latitude, A95, and age seperated by a comma."));
    }
	
    return {
      "lng": values[0],
      "lat": values[1],
      "A95": values[2],
      "age": values[3]
    }

  }

  // Add each file to the reference frames
  files.forEach(function(file) {

    // Add to the existing APWP object
    APWPs[file.name] = new Object({
      "name": file.name,
      "type": "custom",
      "poles": file.data.split(/\r?\n/).map(parseAPWPLine)
    });

    // Create an option
    document.getElementById("reference-select").add(createOption("*" + file.name, file.name));

  });

  // Update and notify
  $("#reference-select").selectpicker("refresh");
  notify("success", "Succesfully added information for <b>" + files.length + "</b> apparent polar wander path(s).");

}

function createOption(text, value) {

  /*
   * Function createOption
   * Creates an HTML option with a particular value and text
   */

  var option = document.createElement("option");

  option.text = text;
  option.value = value;

  return option;

}

function litSelectionHandler(event) {

  function parse(line) {

    parameters = line.split(/\s+/);

    return {
      "lat": Number(parameters[0]),
      "lng": Number(parameters[1]),
      "dec": Number(parameters[2]),
      "inc": Number(parameters[3]),
      "delta": Number(parameters[4]),
      "color": parameters[5]
    }

  }

  readMultipleFiles(Array.from(event.target.files), function(files) {

    lines = files[0].data.split(/\r?\n/).map(parse).slice(0, -1);

    lines.forEach(function(line) {

      var direction = new Direction(line.dec, line.inc);
      var color = (direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK);
      var markerPath = getSVGPath(direction.dec, line.delta);

      var markerIcon = L.icon({
        "iconUrl": getFullSVG(markerPath, line.color),
        "opacity": MARKER_OPACITY,
        "iconSize": MARKER_SIZE
      });

      mapMakers.push(L.marker([line.lat, line.lng], {"icon": markerIcon, "name": null}).addTo(map));

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

function fileSelectionHandler(event) {

  /*
   * Function fileSelectionHandler
   * Callback fired when input files are selected
   */

  readMultipleFiles(Array.from(event.target.files), loadCollectionFileCallback);

  // Reset value in case loading the same file
  this.value = null;

}

__init__();
