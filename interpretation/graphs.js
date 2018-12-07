/*
 * File graphs.js
 * Plotting functions for the interpretation portal
 */

"use strict";

const MARKER_RADIUS_SELECTED = 6;

function getUBS(intensityData) {

  /*
   * Function getUBS
   * Returns the unblocking spectrum
   */

  var UBS = new Array();

  for(var i = 1; i < intensityData.length + 1; i++) {
    if(i !== intensityData.length) {
      UBS.push({
        "x": intensityData[i - 1].x,
        "y": Math.abs(intensityData[i - 1].y - intensityData[i].y),
        "stepIndex": intensityData[i - 1].stepIndex
      });
    }
  }

  // Add the first point
  if(UBS.length) {
    UBS.push({
      "x": intensityData[intensityData.length - 1].x,
      "y": UBS[UBS.length - 1].y,
      "stepIndex": intensityData[intensityData.length - 1].stepIndex
    });
  }

  return UBS;

}


function getVDS(intensityData) {

  /*
   * Function getVDS
   * Returns the vector difference sum based on an intensity array
   */

  // Get the vector difference sum
  var VDS = new Array();
  var sum;

  for(var i = 1; i < intensityData.length + 1; i++) {

    sum = 0;

    for(var j = i; j < intensityData.length + 1; j++) {

      if(j === intensityData.length) {
        sum += Math.abs(intensityData[j-1].y);
      } else {
        sum += Math.abs(intensityData[j-1].y - intensityData[j].y);
      }

    }

    VDS.push({
      "x": intensityData[i-1].x,
      "y": sum,
      "marker": intensityData[i-1].marker,
      "stepIndex": intensityData[i-1].stepIndex
    });

  }

  return VDS;

}

function plotIntensityDiagram(hover) {

  /*
   * Function plotIntensityDiagram
   * Call to create the intensity diagram at bottom of page
   */

  function normalize(intensities) {

    // Normalize the intensities to the maximum resultant intensity
    if(document.getElementById("normalize-intensities").checked) {
      var normalizationFactor = Math.max.apply(null, intensities.map(x => x.y));
    } else {
      var normalizationFactor = 1;
    }

    return intensities.map(function(x) {
      return {
        "x": x.x,
        "y": x.y / normalizationFactor,
        "marker": x.marker,
        "stepIndex": x.stepIndex
      }
    });

  }

  var specimen = getSelectedSpecimen();

  var intensities = new Array();
  var hoverIndex = null;

  specimen.steps.forEach(function(step, i) {

    // On show steps that are visible
    //Remove mT, μT, C or whatever from step - just take a number
    if(!step.visible) {
      return;
    }

    if(stepSelector._selectedStep === i) {
      hoverIndex = intensities.length;
    }

    // Get the treatment step as a number
    var treatmentStep = extractNumbers(step.step);

    intensities.push({
      "x": treatmentStep,
      "y": new Coordinates(step.x, step.y, step.z).length,
      "stepIndex": i
    });

  });

  var normalizedIntensities = normalize(intensities);
  var VDS = getVDS(normalizedIntensities);
  var UBS = getUBS(normalizedIntensities);
  var aHover, bHover;

  // Not hovering over a step: hide points
  if(hoverIndex === null) {
    aHover = {"x": null, "y": null}
    bHover = {"x": null, "y": null}
  } else {
    aHover = normalizedIntensities[hoverIndex];
    bHover = VDS[hoverIndex];
  }

  var chart = $("#intensity-container").highcharts();

  // Only redraw the hover series
  if(chart && hover) {

    chart.series[0].data[0].update(aHover);
    chart.series[1].data[0].update(bHover);

    return;

  }

  var hoverResultant = {
     "type": "scatter",
     "data": [aHover],
     "zIndex": 2,
     "linkedTo": "resultant",
     "marker": {
       "lineWidth": 1,
       "symbol": "circle",
       "radius": MARKER_RADIUS_SELECTED,
       "lineColor": HIGHCHARTS_BLUE,
       "fillColor": HIGHCHARTS_BLUE
     }
   }

  var hoverVDS = {
     "type": "scatter",
     "data": [bHover],
     "zIndex": 2,
     "linkedTo": "vds",
     "marker": {
       "lineWidth": 1,
       "symbol": "circle",
       "radius": MARKER_RADIUS_SELECTED,
       "lineColor": HIGHCHARTS_ORANGE,
       "fillColor": HIGHCHARTS_ORANGE
     }
   }

  // Get the unblocking spectrum (UBS) and vector difference sum (VDS)
  var plotSeries = new Array(hoverResultant, hoverVDS, {
    "name": "Resultant Intensity",
    "id": "resultant",
    "data": normalizedIntensities,
    "color": HIGHCHARTS_BLUE,
    "zIndex": 1
  }, {
    "name": "Vector Difference Sum",
    "id": "vds",
    "data": VDS,
    "color": HIGHCHARTS_ORANGE,
    "marker": {
      "symbol": "circle"
    },
    "zIndex": 1
  }, {
    "type": "area",
    "step": true,
    "pointWidth": 50,
    "name": "Unblocking Spectrum",
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "enabled": false,
      "symbol": "circle"
    },
    "data": UBS,
    "zIndex": 0
  });

  createIntensityDiagram(hover, plotSeries);

}

function generateZijderveldTooltip() {

  /*
   * Function generateZijderveldTooltip
   * Generates the Zijderveld chart tooltip
   */

  if(!document.getElementById("zijderveld-tooltip").checked) {
    return false;
  }

  return [
    "<b>Demagnetization Step: </b>" + this.point.step,
    "<b>Declination: </b>" + this.point.dec.toFixed(1),
    "<b>Inclination: </b>" + this.point.inc.toFixed(1),
    "<b>Intensity: </b>" + this.point.intensity.toFixed(2) + "µA/m"
  ].join("<br>");

}

function generateHemisphereTooltip() {

  /*
   * Function generateHemisphereTooltip
   * Generates the Hemisphere chart tooltip
   */

  if(this.series.name === "Directions") {
    return [
      "<b>Demagnetization step: </b>" + this.point.step,
      "<b>Declination: </b>" + this.x.toFixed(1),
      "<b>Inclination </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  } else {
    return [
      "<b>Interpretation</b>",
      "<b>Declination: </b>" + this.x.toFixed(1),
      "<br><b>Inclination: </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  }

}

function plotZijderveldDiagram(hover) {

  /*
   * Function plotZijderveldDiagram
   * Handles plotting of Zijderveld plot
   */

  const CHART_CONTAINER = "zijderveld-container";

  var specimen = getSelectedSpecimen();

  //Specimen metadata (core and bedding orientations)
  var coreBedding = specimen.coreAzimuth;
  var coreDip = specimen.coreDip;
  var beddingStrike = specimen.beddingStrike;
  var beddingDip = specimen.beddingDip;
	
  // Data buckets for inclination/declination lines
  var horizontal = new Array();
  var vertical = new Array();
  var graphScale = new Array();  

  function getProjectionTitle() {

    function getDirection() {

      // In specimen coordinates
      if(COORDINATES === "specimen") {
        if(UPWEST) {
          return "-y/-z";
        } else {
          return "+x/-z";
        }
      }
      
      // In geographic or tectonic coordinates
      if(UPWEST) {
        return "Up/West";
      } else {
        return "Up/North";
      }

    }

    return getDirection() + " (" + COORDINATES + ")";

  }

  var hoverIndex = null;

  specimen.steps.forEach(function(step, i) {

    // If the step is not visible: stop
    if(!step.visible) {
      return;
    }

    // Save index of the active step for displaying the hover icon
    if(stepSelector._selectedStep === i) {
      hoverIndex = horizontal.length;
    }

    // Calculate the correction direction for this step
    var coordinates = inReferenceCoordinates(COORDINATES, specimen, new Coordinates(step.x, step.y, step.z));
    var direction = coordinates.toVector(Direction);

    if(UPWEST) {
   
      // Horizontal projection is in the x, y plane
      horizontal.push({
        "x": coordinates.x, 
        "y": coordinates.y, 
        "dec": direction.dec,
        "inc": direction.inc,
        "intensity": direction.length,
        "step": step.step,
        "stepIndex": i
      });
      
      // Vertical projection is in the x, z plane
      // the vertical axis is reversed
      vertical.push({
        "x": coordinates.x, 
        "y": coordinates.z,
        "dec": direction.dec,
        "inc": direction.inc,
        "intensity": direction.length,
        "step": step.step,
        "stepIndex": i
      });

     } else {

      // Horizontal projection is in the x, y plane
      horizontal.push({
        "x": coordinates.y,
        "y": -coordinates.x, 
        "dec": direction.dec,
        "inc": direction.inc,
        "intensity": direction.length,
        "step": step.step,
        "stepIndex": i
      });
      
      // Vertical projection is in the x, z plane
      // the vertical axis is reversed
      vertical.push({
        "x": coordinates.y, 
        "y": coordinates.z,
        "dec": direction.dec,
        "inc": direction.inc,
        "intensity": direction.length,
        "step": step.step
      });

     }


    graphScale.push(Math.abs(coordinates.x), Math.abs(coordinates.y), Math.abs(coordinates.z));

  });

  var graphScale = Math.max.apply(Math, graphScale) + 1;
  var tickFlag = true;
  var enableLabels = false;

  var vHover;
  var hHover;

  // If the step is not visible hide the hover point
  if(hoverIndex === null) {
    vHover = {"x": null, "y": null}
    hHover = {"x": null, "y": null}
  } else {
    vHover = vertical[hoverIndex];
    hHover = horizontal[hoverIndex];
  }

  var chart = $("#" + CHART_CONTAINER).highcharts();

  // If the chart exists and we are asked to only redraw the hover series
  if(chart && hover) {

    chart.series[0].data[0].update(hHover);
    chart.series[1].data[0].update(vHover);

    return;

  }

  var hoverSeriesHorizontal = {
     "type": "scatter",
     "data": [hHover],
     "linkedTo": "horizontal",
     "zIndex": 10,
     "marker": {
       "lineWidth": 1,
       "symbol": "circle",
       "radius": MARKER_RADIUS_SELECTED,
       "lineColor": HIGHCHARTS_BLUE,
       "fillColor": HIGHCHARTS_BLUE
     }
   }

  var hoverSeriesVertical = {
     "type": "scatter",
     "data": [vHover],
     "linkedTo": "vertical",
     "zIndex": 10,
     "marker": {
       "symbol": "circle",
       "lineWidth": 1,
       "radius": MARKER_RADIUS_SELECTED,
       "lineColor": HIGHCHARTS_BLUE,
       "fillColor": HIGHCHARTS_WHITE
     }
   }

  // Create the chart
  var chart = Highcharts.chart(CHART_CONTAINER, {
    "chart": {
    "animation": false,
    "id": "zijderveld-container",
    "zoomType": "xy",
      "events": {
        "load": resetMarkerSize
      }
    },
    "title": {
      "text": specimen.name
    },
    "tooltip": {
      "formatter": generateZijderveldTooltip
    },
    "exporting": {
      "filename": "zijderveld-diagram",
      "sourceWidth": 600,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": HIGHCHARTS_BLUE,
          "align": "right"
        }
      }
    },
    "subtitle": {
      "text": getProjectionTitle()
    },
    "xAxis": {
      "gridLineWidth": 0,
      "lineColor": "black",
      "crossing": 0,
      "min": -graphScale,
      "max": graphScale,
      "gridLineWidth": 0,
      "startOnTick": false,
      "endOnTick": false,
      "tickWidth": tickFlag ? 1 : 0,
      "lineWidth": 1,
      "opposite": true,
      "title": {
        "enabled": false
      },
      "labels": {
        "enabled": tickFlag,
        "formatter": function () {
          if(this.value === 0) return "";
          else return this.value;
        }
      }
    },
    "yAxis": {
      "reversed": true,
      "gridLineWidth": 0,
      "lineWidth": 1,
      "endOnTick": false,
      "tickWidth": tickFlag ? 1 : 0,
      "minRange": 10,
      "lineColor": "black",
      "startOnTick": false,
      "crossing": 0,
      "min": -graphScale,
      "max": graphScale,
      "title": {
        "enabled": false
      },
      "labels": {
        "enabled": tickFlag,
        "formatter": function () {
          if(this.value === 0) return "";
          else return this.value;
        }
      }
    },
    "plotOptions": {
      "series": {
        "cursor": "pointer",
        "point": {
          "events": {
            "click": function () {
              stepSelector.setActiveStep(this.stepIndex);
            }
          }
        },
        "animation": false,
        "dataLabels": {
          "color": "grey",
          "enabled": enableLabels,
          "style": {
            "fontSize": "10px"
          },
          "formatter": function() {
            return this.point.step;
          }
        }
      },
      "line": {
        "lineWidth": 1,
      }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org (Zijderveld Diagram)",
      "href": ""
    },
    "series": [
      hoverSeriesHorizontal,
      hoverSeriesVertical, {
      "type": "line",
      "linkedTo": "horizontal",
      "enableMouseTracking": false,
      "data": horizontal,
      "color": "rgb(119, 152, 191)",
      "marker": {
        "enabled": false
      }
    }, {
      "type": "scatter",
      "id": "horizontal",
      "name": "Horizontal Projection", 
      "data": horizontal,
      "color": "rgb(119, 152, 191)",
      "marker": {
        "lineWidth": 1,
        "symbol": "circle",
        "lineColor": HIGHCHARTS_BLUE,
        "fillColor": HIGHCHARTS_BLUE
      }
    }, {
      "name": "Vertical Projection",
      "type": "line",
      "linkedTo": "vertical",
      "enableMouseTracking": false,
      "data": vertical,
      "color": HIGHCHARTS_BLUE,
      "marker": {
        "enabled": false
      }
    }, {
      "type": "scatter",
      "id": "vertical",
      "name": "Vertical Projection",
      "data": vertical,
      "color": HIGHCHARTS_BLUE,
      "marker": {
        "symbol": "circle",
        "lineWidth": 1,
        "lineColor": HIGHCHARTS_BLUE,
        "fillColor": HIGHCHARTS_WHITE
      }
    }].concat(formatInterpretationSeries(graphScale, specimen.interpretations))
  });

  // Set ratio of axes for true angle
  setZijderveldRatio(chart);

}

function setZijderveldRatio(chart) {

  /*
   * Function setZijderveldRatio
   * Sets the correct ratio of the Zijderveld diagram (true angle)
   */

  var [xAxis, yAxis] = chart.axes;

  // Determine the ratio between width/height
  var ratio = (xAxis.width / yAxis.height);

  if(xAxis.width === yAxis.height) {
    return;
  } else if(xAxis.width > yAxis.height) {
    xAxis.setExtremes(xAxis.min * ratio, xAxis.max * ratio);
  } else if(xAxis.width < yAxis.height) {
    yAxis.setExtremes(yAxis.min / ratio, yAxis.max / ratio);
  }

}

function formatInterpretationSeriesArea(interpretations) {

  /*
   * Function formatInterpretationSeriesArea
   * Description
   */

  const SHOW_TAU3 = true;
  var series = new Array();

  // Extract TAU3 interpretations for plotting
  interpretations.forEach(function(interpretation) {

    var component = interpretation[COORDINATES];
    var direction = new Coordinates(component.coordinates.x, component.coordinates.y, component.coordinates.z).toVector(Direction);

    if(interpretation.type === "TAU1" || SHOW_TAU3) {

      series.push({
        "name": "Interpretation (" + interpretation.type + ")",
        "type": "scatter",
        "color": HIGHCHARTS_ORANGE,
        "marker": {
          "symbol": "circle",
          "lineColor": HIGHCHARTS_ORANGE,
          "lineWidth": 1,
          "fillColor": (direction.inc < 0) ? HIGHCHARTS_WHITE : HIGHCHARTS_ORANGE
        },
        "data": [{
          "x": direction.dec, 
          "y": projectInclination(direction.inc),
          "inc": direction.inc,
        }]
      });

    }

    // Get the plane data (confidence ellipse with angle 90)
    // Only for TAU3
    if(interpretation.type === "TAU3") {

      series.push({
        "data": getPlaneData(direction),
        "linkedTo": ":previous",
        "type": "line",
        "color": HIGHCHARTS_ORANGE,
        "enableMouseTracking": false,
        "dashStyle": "ShortDash",
        "marker": {
          "enabled": false
        }
      });
     
    }

  });

  return series;

}

function formatInterpretationSeries(intensity, interpretations) {

  /*
   * Function formatInterpretationSeries
   * Formats the series used for showing interpretated directions
   */

  // Make the lines double as long as the intensity
  var scaling = 2 * intensity;
  var series = new Array();

  interpretations.forEach(function(interpretation) {

    // Only show TAU1
    if(interpretation.type === "TAU3") {
      return;
    }

    var component = interpretation[COORDINATES];

    // Handle the projection
    if(UPWEST) {

      // Create a line that represents the vector
      // Add line for horizontal projection (x, y)
      var linearFitHorizontal = [{
        "x": component.centerMass.x + component.coordinates.x * scaling, 
        "y": component.centerMass.y + component.coordinates.y * scaling
      }, {
        "x": component.centerMass.x - component.coordinates.x * scaling,
        "y": component.centerMass.y - component.coordinates.y * scaling
      }];
      
      // Do the same for line for horizontal projection (y, z)
      var linearFitVertical = [{
        "x": component.centerMass.x + component.coordinates.x * scaling, 
        "y": component.centerMass.z + component.coordinates.z * scaling
      }, {
        "x": component.centerMass.x - component.coordinates.x * scaling, 
        "y": component.centerMass.z - component.coordinates.z * scaling
      }];

    } else {

      var linearFitHorizontal = [{
        "x": component.centerMass.y + component.coordinates.y * scaling, 
        "y": -component.centerMass.x - component.coordinates.x * scaling
      }, {
        "x": component.centerMass.y - component.coordinates.y * scaling,
        "y": -component.centerMass.x + component.coordinates.x * scaling
      }];
      
      var linearFitVertical = [{
        "x": component.centerMass.y + component.coordinates.y * scaling, 
        "y": component.centerMass.z + component.coordinates.z * scaling
      }, {
        "x": component.centerMass.y - component.coordinates.y * scaling, 
        "y": component.centerMass.z - component.coordinates.z * scaling
      }];

    }

    series.push({
      "name": "Interpretation (TAU1)",
      "data": linearFitHorizontal,
      "enableMouseTracking": false,
      "lineWidth": 1,
      "color": HIGHCHARTS_GREEN,
      "marker": {
        "enabled" : false
      }
    });

    series.push({
      "data": linearFitVertical,
      "lineWidth": 1,
      "linkedTo": ":previous",
      "enableMouseTracking": false,
      "color": HIGHCHARTS_RED,
      "marker": {
        "enabled": false
      }
    });

  });

  return series;

}

function resetMarkerSize() {

  /*
   * Function resetMarkerSize
   * Resets the marker size to the default size when exporting
   */

  if(this.options.chart.forExport) {

    this.series.forEach(function(serie) {
      serie.data.forEach(function(point) {

        // Update the point if it exists
        if(point.marker && point.marker.radius === MARKER_RADIUS_SELECTED) {
          point.update({
            "marker": {
              "radius": MARKER_RADIUS,
              "fillColor": point.marker.fillColor,
              "lineColor": point.marker.lineColor,
              "lineWidth": point.marker.lineWidth
            }
          }, false);

        }
      });
    });

    this.redraw();

  }

}

function createIntensityDiagram(hover, series) {

  /*
   * Function createIntensityDiagram
   * Renders the Highcharts intensity diagram
   */

  function intensityTooltip() {

    /*
     * Function createIntensityDiagram::intensityTooltip
     * Formats the Highcharts intensity diagram tooltip
     */

    return [
      "<b>" + this.series.name + "</b>",
      "<b>Demagnetization Step: </b>" + this.x,
      "<b>Intensity </b>" + this.y.toFixed(2)
    ].join("<br>");

  }

  const EXPORTING_WIDTH = 1200;
  const EXPORTING_HEIGHT = 400;
  const EXPORTING_FILENAME = "intensity-diagram";
  const CHART_CONTAINER = "intensity-container";

  var specimen = getSelectedSpecimen();

  Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "animation": false,
      "zoomType": "xy",
      "id": "intensity-container",
      "events": {
        "load": resetMarkerSize
      }
    },
    "exporting": {
      "filename": EXPORTING_FILENAME,
      "sourceWidth": EXPORTING_WIDTH,
      "sourceHeight": EXPORTING_HEIGHT,
      "buttons": {
        "contextButton": {
          "symbolStroke": HIGHCHARTS_BLUE,
          "align": "right"
        }
      }
    },
    "title": {
      "text": "Intensity Diagram " + specimen.name
    },
    "yAxis": {
      "title": {
        "text": "Intensity (μA/m)"
      }	
    },
    "tooltip": {
      "formatter": intensityTooltip
    },
    "xAxis": {
      "title": {
        "text": "Demagnetization steps"
      }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org (Intensity Diagram)",
      "href": ""
    },
    "plotOptions": { 
      "series" : {
        "animation": false,
        "cursor": "pointer",
        "point": {
          "events": {
            "click": function () {
              stepSelector.setActiveStep(this.stepIndex);
            }
          }
        }
      }
    },
    "series": series
  });

}

function createHemisphereChart(series) {

  /*
   * Function createHemisphereChart
   * Creates a hemisphere chart
   */

  const CHART_CONTAINER = "fitting-container";

  function generateTooltip() {

    return [
      "<b>Sample: </b>" + this.point.sample,
      "<b>Declination: </b>" + this.x.toFixed(1),
      "<b>Inclination </b>" + this.point.inc.toFixed(1)
    ].join("<br>");

  }

  Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "polar": true,
      "animation": false
    },
    "exporting": {
      "filename": "interpreted-components",
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
      "text": "Interpreted Components"
    },
    "subtitle": {
      "text": "(" + COORDINATES + " coordinates)" + (GROUP === "DEFAULT" ? "" : " <i>" + GROUP + "</i>") 
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
      "minorTickWidth": 1,
    },
    "tooltip": {
      "formatter": generateTooltip
    },
    "plotOptions": {
      "series": {
        "animation": false
      }
    },
    "series": series
  });

}

function eqAreaProjection(hover) {

  /* 
   * Function eqAreaProjection
   * Description: Handles plotting for equal area projection
   */

  const CHART_CONTAINER = "hemisphere-container";

  var specimen = getSelectedSpecimen();

  //Get the bedding and core parameters from the sample object
  var coreAzi = specimen.coreAzimuth;
  var coreDip = specimen.coreDip;
  var beddingStrike = specimen.beddingStrike;
  var beddingDip = specimen.beddingDip;
	
  // Get the Boolean flags for the graph
  var enableLabels = false;
	
  // Format a Highcharts data bucket for samples that are visible
  var dataSeries = new Array();

  var hoverIndex = null;

  // Go over each step
  specimen.steps.forEach(function(step, i) {

    if(!step.visible) {
      return;
    }

    if(stepSelector._selectedStep === i) {
      hoverIndex = dataSeries.length;
    }

    var direction = inReferenceCoordinates(COORDINATES, specimen, new Coordinates(step.x, step.y, step.z)).toVector(Direction);

    dataSeries.push({
      "x": direction.dec, 
      "y": projectInclination(direction.inc), 
      "inc": direction.inc, 
      "step": step.step,
      "marker": {
        "fillColor": (direction.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLUE),
        "lineWidth": 1,
        "lineColor": HIGHCHARTS_BLUE
      },
      "stepIndex": i
    });
    
  });

  var hoverPoint;
  if(hoverIndex === null) {
    hoverPoint = {"x": null, "y": null}
  } else {
    hoverPoint = dataSeries[hoverIndex];
  }

  var chart = $("#" + CHART_CONTAINER).highcharts();

  // Only redraw the hover series (series: 0, data: 0)
  if(chart && hover) {
    return chart.series[0].data[0].update(hoverPoint);
  }

  var hoverSeriesHorizontal = {
     "type": "scatter",
     "linkedTo": "directions",
     "zIndex": 10,
     "data": [hoverPoint],
     "marker": {
       "lineWidth": 1,
       "symbol": "circle",
       "radius": MARKER_RADIUS_SELECTED,
       "lineColor": HIGHCHARTS_BLUE,
       "fillColor": HIGHCHARTS_BLUE
     }
   }

  // Prevent making a connection between first - last data point
  dataSeries.push(null);
	
  Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "polar": true,
      "events": {
        "load": resetMarkerSize
      },
      "animation": false
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
      "text": specimen.name
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
      "minorTickWidth": 1,
    },
    "tooltip": {
      "formatter": generateHemisphereTooltip
    },
    "plotOptions": {
      "line": {
        "lineWidth": 1,
        "color": "rgb(119, 152, 191)"
      },
      "series": {
        "animation": false,
        "cursor": "pointer",
        "point": {
          "events": {
            "click": function () {
              stepSelector.setActiveStep(this.stepIndex);
            }
          }
        },
        "dataLabels": {
          "color": "grey",
          "style": {
            "fontSize": "10px"
          },
          "enabled": enableLabels,
          "formatter": function () {
            return this.point.step;
          }
        }
      }
    },
    "series": [hoverSeriesHorizontal, {
      "name": "Directions",
      "id": "directions",
      "type": "scatter",
      "zIndex": 5,
      "color": HIGHCHARTS_BLUE,
      "data": dataSeries
    }, {
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      },
      "linkedTo": ":previous",
      "type": "line", 
      "data": dataSeries		
    }].concat(formatInterpretationSeriesArea(specimen.interpretations)),
  });

}

function getIntensityCSV(series) {

  /*
   * Function getIntensityCSV
   * Returns CSV representation of intensity chart
   */

  const HEADER = new Array(
    "Step",
    "Intensity",
    "Vector Difference Sum",
    "Unblock Spectrum"
  );

  var rows = new Array(HEADER.join(ITEM_DELIMITER));

  for(var i = 0; i < series[0].data.length; i++) {
    rows.push(new Array(
      series[0].data[i].x,
      series[0].data[i].y,
      series[1].data[i].y,
      series[2].data[i].y
    ).join(ITEM_DELIMITER));
  }
		
  return rows.join(LINE_DELIMITER);

}

function getFittedCSV(series) {

  const HEADER = new Array(
    "step",
    "declination",
    "inclination",
    "fitted"
  );

  // TAU1 components
  var rows = series[0].data.map(function(x) {
    return new Array(x.name, x.x.toFixed(2), x.inc.toFixed(2), false).join(ITEM_DELIMITER);
  });

  // Add the fitted components
  if(IS_FITTED) {
    rows = rows.concat(series[2].data.map(function(x) {
      return new Array(x.name, x.x.toFixed(2), x.inc.toFixed(2), true).join(ITEM_DELIMITER);
    }));
  }

  rows.unshift(HEADER.join(ITEM_DELIMITER));

  return rows.join(LINE_DELIMITER);

}

function getZijderveldCSV(series) {

  /*
   * Function getZijderveldCSV
   * Returns CSV representation of Zijderveld chart
   */

  const HEADER = new Array(
    "step",
    "x",
    "y",
    "z"
  );

  var rows = series[2].data.map(function(x, i) {
    return new Array(x.step, x.x, x.y, series[3].data[i].y).join(ITEM_DELIMITER);
  });

  rows.unshift(HEADER.join(ITEM_DELIMITER));

  return rows.join(LINE_DELIMITER);

}

function getHemisphereCSV(series) {

  /*
   * Function getHemisphereCSV
   * Returns CSV representation of Hemisphere chart
   */

  const HEADER = new Array(
    "step",
    "declination",
    "inclination"
  );

  var rows = series[1].data.map(function(x) {
    return new Array(x.step, x.x.toFixed(2), x.inc.toFixed(2)).join(ITEM_DELIMITER);
  });

  rows.unshift(HEADER.join(ITEM_DELIMITER));

  return rows.join(LINE_DELIMITER);

}

(function (H) {

  const EXPORT_BUTTON_TEXT = "Download CSV";

  // Crossing at 0, 0
  H.wrap(H.Axis.prototype, "render", function(proceed) {

    var chart = this.chart, otherAxis;

    if(typeof this.options.crossing === "number") {
      otherAxis = chart[this.isXAxis ? "yAxis" : "xAxis"][0];
      this.offset = otherAxis.toPixels(this.options.crossing, true);
      chart.axisOffset[this.side] = 10;
    }

    proceed.call(this);

  });

  // Add data download button
  H.Chart.prototype.generateCSV = function() {

    switch(this.renderTo.id) {
      case "zijderveld-container":
        return downloadAsCSV("zijderveld.csv", getZijderveldCSV(this.series));
      case "intensity-container":
        return downloadAsCSV("intensity.csv", getIntensityCSV(this.series));
      case "hemisphere-container":
        return downloadAsCSV("hemisphere.csv", getHemisphereCSV(this.series));
      case "fitting-container":
        return downloadAsCSV("components.csv", getFittedCSV(this.series));
      default:
        notify("danger", new Exception("Data export for this chart has not been implemented."));
    }
		
  }
	
  // Add the button to the exporting menu
  H.getOptions().exporting.buttons.contextButton.menuItems.push({
    "text": EXPORT_BUTTON_TEXT,
    "onclick": function() {
      this.generateCSV()
    }
  });

}(Highcharts));
