"use strict"

document.getElementById("button-submit").addEventListener("click", initialize); 

function initialize() {

  /*
   * Function initialize
   * Initializes the parametrically sampling procedure
   */

  // Load data from the interface
  var declination = Number(document.getElementById("input-declination").value);
  var inclination = Number(document.getElementById("input-inclination").value);

  var longitude = Number(document.getElementById("input-longitude").value);
  var latitude = Number(document.getElementById("input-latitude").value);

  var N = Number(document.getElementById("input-number").value);
  var K = Number(document.getElementById("input-dispersion").value);

  // Get the type of the distribution
  var distribution = document.getElementById("input-distribution").value;

  var direction = new Direction(declination, inclination);
  var site = new Site(longitude, latitude);

  // Stabilize the results by drawing 1000 bootstraps
  if(document.getElementById("sample-bootstrap-checkbox").checked) {
    var loc = bootstrapDistribution(direction, site, N, K, distribution);
  } else {
    var loc = getDistribution(direction, site, N, K, distribution); 
  }

  // Update mean table
  tableUpdate(loc.directions, loc.poles);

  // Create a plot
  hemispherePlot("hemispherePlot", loc.directions);
  hemispherePlot("hemispherePlot2", loc.poles);

}

function tableUpdate(directions, poles) {

  /*
   * Function tableUpdate
   * Updates table with distribution parameters
   */

  document.getElementById("parametric-table").innerHTML = [
    "<table class='table table-striped text-center'>",
    "  <thead>",
    "    <tr>",
    "      <th>Declination</th>",
    "      <th>Inclination</th>",
    "      <th>Longitude<small>VGP</small></th>",
    "      <th>Latitude<small>VGP</small></th>",
    "      <th>N</th>",
    "      <th>R</th>",
    "      <th>k</th>",
    "      <th>α95</th>",
    "      <th>R<small>VGP</small></th>",
    "      <th>K</th>",
    "      <th>A95</th>",
    "      <th>A95<small>min</small></th>",
    "      <th>A95<small>max</small></th>",
    "     </tr>",
    "   </thead>",
    "   <tbody>",
    "     <tr>",
    "       <td>" + directions.mean.dec.toFixed(1) + "</td>",
    "       <td>" + directions.mean.inc.toFixed(1) + "</td>",
    "       <td>" + poles.mean.lng.toFixed(1) + "</td>",
    "       <td>" + poles.mean.lat.toFixed(1) + "</td>",
    "       <td>" + directions.N + "</td>",
    "       <td>" + directions.R.toFixed(1) + "</td>",
    "       <td>" + directions.dispersion.toFixed(1) + "</td>",
    "       <td>" + directions.confidence.toFixed(1) + "</td>",
    "       <td>" + poles.R.toFixed(1) + "</td>",
    "       <td>" + poles.dispersion.toFixed(1) + "</td>",
    "       <td>" + poles.confidence.toFixed(1) + "</td>",
    "       <td>" + poles.confidenceMin.toFixed(1) + "</td>",
    "       <td>" + poles.confidenceMax.toFixed(1) + "</td>",
    "    </tr>",
    "  </tbody>",
    "</table>"
  ].join("");

}


function bootstrapDistribution(direction, site, N, K, distribution) {

  /*
   * Function bootstrapDistribution
   * Does a bootstrap for a parametric distribution to stabilize solution
   */

  const NUMBER_OF_BOOTSTRAPS = 1000;

  var results = new Array();

  // 1000 bootstraps
  for(var i = 0; i < NUMBER_OF_BOOTSTRAPS; i++) {
    results.push(getDistribution(direction, site, N, K, distribution));
  }

  // Sort the bootstraps by angle to requested direction
  results.sort(function(a, b) {
    return direction.angle(b.directions.mean) - direction.angle(a.directions.mean);
  });

  // Return the best result
  return results.pop();

}

function getDistribution(direction, site, N, K, distribution) {

  /*
   * Function getDistribution
   * Samples a single distribution with given parameters
   */

  // Make a Fisherian distribution on POLES or DIRECTIONS respectively
  if(distribution === "poles") {
    var pole = site.poleFrom(direction);
    var samples = new fisherianDistribution(PoleDistribution, N, K);
    var rotated = samples.rotateTo(pole.lng, pole.lat);
  } else {
    var samples = new fisherianDistribution(DirectionDistribution, N, K);
    var rotated = samples.rotateTo(direction.dec, direction.inc);
  }

  return new Location(site, rotated);

}

function getProjectionDescription() {

  /*
   * Function getProjectionDescription
   * Returns the description that belongs to the projection type
   */

  switch(PROJECTION_TYPE) {
    case "AREA":
      return "Equal Area Projection";
    case "ANGLE":
      return "Equal Angle Projection";
    default:
      throw(new Exception("Unknown projection type requested."));
  }

}

function hemispherePlot(id, distribution) {

  /*
   * Function hemispherePlot
   * Creates a hemisphere plot from a distribution
   */

  function formatLabel() {

    /*
     * Function hemispherePlot::formatLabel
     * Adds degree symbol to the axis labels
     */

    return this.value + DEGREE_SYMBOL;

  }

  function getVGPTooltip() {

    /*
     * Function hemispherePlot::getVGPTooltip
     * Handles tooltip for hemisphere plot for poles
     */

    return new Array(
      this.series.name,
      "<b>Longitude: </b>" + this.point.lng.toFixed(1),
      "<b>Latitude: </b>" + this.point.lat.toFixed(1)
    ).join("<br>");

  }

  function getDIRTooltip() {

    /*
     * Function hemispherePlot::getDIRTooltip
     * Handles tooltip for hemisphere plot for directions
     */

    return new Array(
      this.series.name,
      "<b>Declination: </b>" + this.point.dec.toFixed(1),
      "<b>Inclination: </b>" + this.point.inc.toFixed(1)
    ).join("<br>");

  }

  function getTooltip(constructor) {

    /*
     * Function hemispherePlot::getTooltip
     * Returns the tooltip callback as a function of the constructor
     */

    if(constructor === PoleDistribution) {
      return getVGPTooltip;
    } else if(constructor === DirectionDistribution) {
      return getDIRTooltip;
    }

  }

  function prepareDirectionData(direction, index) {

    /*
     * Function hemispherePlot::prepareData
     * Prepares directional data (dec, inc) for plotting in hemisphere plot
     */

    function getMarker(value) {

      /*
       * Function hemispherePlot::prepareData::getMarker
       * Returns different markers for different hemispheres
       */

      var markerColor = (index === undefined ? HIGHCHARTS_RED : HIGHCHARTS_BLUE);

      if(value < 0) {
        return new Object({
          "lineColor": markerColor,
          "fillColor": HIGHCHARTS_WHITE
        });
      } else {
        return new Object({
          "lineColor": markerColor,
          "fillColor": markerColor
        });
      }

    }

    if(direction === null) {
      return null;
    }

    if(direction instanceof Direction) {
      return new Object({
        "x": direction.dec,
        "y": projectInclination(direction.inc),
        "dec": direction.dec,
        "inc": direction.inc,
        "marker": getMarker(direction.inc)
      });
    } else if(direction instanceof Pole) {
      return new Object({
        "x": direction.lng,
        "y": projectInclination(direction.lat),
        "lng": direction.lng,
        "lat": direction.lat,
        "marker": getMarker(direction.lat)
      });
    } else {
      throw(new Exception("Got unexpected constructor."));
    }

  }
  
  function getTitle(constructor) {

    /*
     * Function hemispherePlot::getTitle
     * Returns the title as a function of the constructor
     */

    if(constructor === PoleDistribution) {
      return "Parametric Virtual Geomagnetic Poles";
    } else if(constructor === DirectionDistribution) {
      return "Parametric Directions";
    } else {
      throw(new Exception("Got unexpected constructor."));
    }

  }

  const ENABLE_45_CUTOFF = true;
  const ENABLE_ANIMATION = false;
  const ENABLE_DEENEN = true;

  if(!(distribution instanceof Distribution)) {
    throw(new Exception("Input is not of class Distribution."));
  }

  // Create the HighCharts data structures
  var data = distribution.vectors.map(prepareDirectionData);
  var mean = prepareDirectionData(distribution.mean);

  // Get the confidence interval around the mean
  var ellipse = distribution.getConfidenceEllipse().map(prepareDirectionData);

  var series = [{
    "name": getTitle(distribution.constructor),
    "data": data,
    "type": "scatter",
    "marker": {
      "symbol": "circle",
      "lineWidth": 1,
    }
  }, {
    "name": "Mean",
    "data": new Array(mean),
    "type": "scatter",
    "color": HIGHCHARTS_RED,
    "marker": {
      "symbol": "circle",
      "lineWidth": 2,
    }
  }, {
    "name": "95% Confidence",
    "data": ellipse,
    "type": "line",
    "color": HIGHCHARTS_ORANGE,
    "enableMouseTracking": false,
    "dashStyle": "ShortDash",
    "marker": {
      "enabled": false
    }
  }];

  if(ENABLE_DEENEN && distribution.constructor === PoleDistribution) {

    // Get the Deenen et al., 2011 maximum & minimum scatter
    var deenen = distribution.getConfidenceEllipseDeenen();

    series.push({
      "name": "Deenen Criteria",
      "data": deenen.maximum.map(prepareDirectionData),
      "type": "line",
      "color": HIGHCHARTS_GREEN,
      "enableMouseTracking": false,
      "dashStyle": "ShortDash",
      "marker": { 
        "enabled": false
      } 
    }, {
      "linkedTo": ":previous",
      "data": deenen.minimum.map(prepareDirectionData),
      "type": "line",
      "color": HIGHCHARTS_GREEN,
      "enableMouseTracking": false,
      "dashStyle": "ShortDash",
      "marker": { 
        "enabled": false
      }
    });

  }

  function exportCSV() {

    /*
     * Function exportCSV
     * Exports parametrically sampled data to CSV
     */

    if(this === DirectionDistribution) {

      const HEADER = new Array("Declination, Inclination");

      var csv = HEADER.concat(distribution.vectors.map(function(direction) {
        return new Array(direction.dec, direction.inc).join(ITEM_DELIMITER);
      })).join(LINE_DELIMITER);

    } else if(this === PoleDistribution) {

      const HEADER = new Array("Longitude, Latitude");

      var csv = HEADER.concat(distribution.vectors.map(function(pole) {
        return new Array(pole.lng, pole.lat).join(ITEM_DELIMITER);
      })).join(LINE_DELIMITER);

    }

    downloadAsCSV("parametric-distribution.csv", csv);

  }

  Highcharts.chart(id, {
    "chart": {
      "polar": true,
      "animation": ENABLE_ANIMATION,
    },
    "tooltip": {
      "formatter": getTooltip(distribution.constructor)
    },
    "exporting": {
      "getCSV": exportCSV.bind(distribution.constructor),
      "width": 600,
      "height": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": HIGHCHARTS_BLUE,
          "align": "right"
        }
      }
    },
    "subtitle": {
      "text": ""
    },
    "title": {
      "text": getTitle(distribution.constructor)
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
      "tickInterval": (ENABLE_45_CUTOFF ? 45 : 90),
      "min": 0,
      "max": 90,
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [Parametric Sampling]",
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
      "minorTickWidth": 1,
      "labels": {
        "formatter": formatLabel
      }
    },
    "plotOptions": {
      "series": {
        "turboThreshold": 0,
        "animation": ENABLE_ANIMATION,
      }
    },
    "series": series
  });

}

document.getElementById("export-png").addEventListener("click", exportHandler);
document.getElementById("export-pdf").addEventListener("click", exportHandler);
document.getElementById("export-svg").addEventListener("click", exportHandler);

function exportHandler(event) {

  /*
   * Function exportHandler
   * Export handler for geomagnetic directions & poles
   */

  var charts = [
    $("#hemispherePlot").highcharts(),
    $("#hemispherePlot2").highcharts()
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  exportChartsWrapper("geomagnetic-directions", charts, event.target.id);

}
