"use strict";

const HIGHCHARTS_BLUE = "#7CB5EC";
const HIGHCHARTS_BLACK = "#434348";
const HIGHCHARTS_GREEN = "#90ED7D";
const HIGHCHARTS_ORANGE = "#F7A35C";
const HIGHCHARTS_PURPLE = "#8085E9";
const HIGHCHARTS_CYAN = "#91E8E1";
const HIGHCHARTS_PINK = "#F15C80";
const HIGHCHARTS_YELLOW = "#E4D354";
const HIGHCHARTS_TURQUOISE = "#2B908F";
const HIGHCHARTS_RED = "#F45B5B";
const HIGHCHARTS_WHITE = "#FFFFFF";

Highcharts.seriesTypes.line.prototype.requireSorting = false;

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

function projectInclination(inc) {

  /*
   * Function projectInclination
   * Converts the inclination to a project inclination (equal area; equal angle)
   * used in the equal area projection plots
   */

  // Value can be treated as being absolute since the
  // lower & upper hemisphere are both being projected
  var inc = Math.abs(inc);

  switch(PROJECTION_TYPE) {
    case "AREA":
      return 90 - (Math.sqrt(2) * 90 * Math.sin(Math.PI * (90 - inc) / 360));
    case "ANGLE":
      return 90 - (90 * Math.tan(Math.PI * (90 - inc) / 360));
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
      return "Poles";
    } else if(constructor === DirectionDistribution) {
      return "Directions";
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

  Highcharts.chart(id, {
    "chart": {
      "polar": true,
      "animation": ENABLE_ANIMATION,
    },
    "tooltip": {
      "formatter": getTooltip(distribution.constructor)
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
      "text": "GAPWAP.org (" + getProjectionDescription() + ")",
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
