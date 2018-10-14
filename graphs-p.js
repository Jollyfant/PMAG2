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

function generateZijderveldTooltip() {

  return [
    "<b>Demagnetization Step: </b>" + this.point.step,
    "<b>Declination: </b>" + this.point.dec.toFixed(1),
    "<b>Inclination: </b>" + this.point.inc.toFixed(1),
    "<b>Intensity: </b>" + this.point.intensity.toFixed(2) + "µA/m"
  ].join("<br>");

}

function inReferenceCoordinates(reference, specimen, coordinates) {

  // Do the geographic correction
  if(reference !== "specimen") {

    coordinates = coordinates.rotateTo(specimen.coreAzimuth, specimen.coreDip);

    // Do the tectonic correction
    // See Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph
    if(reference === "tectonic") {

      var dipDirection = specimen.beddingStrike + 90;

      coordinates = coordinates.rotateTo(-dipDirection, 90).rotateTo(0, 90 - specimen.beddingDip).rotateTo(dipDirection, 90);

    }

  }

  return coordinates;

}
/*
 * FUNCTION zijderveld
 * Description: handles graphing for zijderveld plot
 * Input: samples (sample[sampleIndex])
 * Output: VOID (plots zijderveld graph)
 */
function plotZijderveldDiagram(specimen) {
	
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

  specimen.steps.forEach(function(step, i) {

    if(!step.visible) {
      return;
	}

    if(stepSelector._selectedStep === i) {
      var marker = {"radius": MARKER_RADIUS_SELECTED}
    } else {
      var marker = {"radius": MARKER_RADIUS}
    }

    var coordinates = inReferenceCoordinates(COORDINATES, specimen, new Coordinates(step.x, step.y, step.z));

    if(UPWEST) {
   
      // Horizontal projection is in the x, y plane
      horizontal.push({
        "x": coordinates.x, 
        "y": coordinates.y, 
        "step": step.step,
        "marker": marker,
        "index": i
      });
      
      // Vertical projection is in the x, z plane
      // the vertical axis is reversed
      vertical.push({
        "x": coordinates.x, 
        "y": coordinates.z,
        "step": step.step,
        "marker": marker,
        "index": i
      });

     } else {

      // Horizontal projection is in the x, y plane
      horizontal.push({
        "x": coordinates.y,
        "y": -coordinates.x, 
        "step": step.step,
        "marker": marker,
        "index": i
      });
      
      // Vertical projection is in the x, z plane
      // the vertical axis is reversed
      vertical.push({
        "x": coordinates.y, 
        "y": coordinates.z,
        "step": step.step,
        "marker": marker,
        "index": i
      });

     }


    graphScale.push(Math.abs(coordinates.x), Math.abs(coordinates.y), Math.abs(coordinates.z));

  });
var graphScale = Math.max.apply(Math, graphScale) + 1;
var tickFlag = false;
var enableLabels = false;


  Highcharts.chart("zijderveld-container", {
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
      "enabled": false,
      "useHTML": true,
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
        "startOnTick": true,
        "endOnTick": true,
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
        "endOnTick": true,
        "tickWidth": tickFlag ? 1 : 0,
        "minRange": 10,
        "lineColor": "black",
        "startOnTick": true,
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
                stepSelector.setActiveStep(this.index);
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
            "formatter": function () {
              return this.point.step;
            }
          }
        },
        "line": {
          "lineWidth": 1,
        }
      },
      "credits": {
        "enabled": true,
        "text": "Paleomagnetism.org (Zijderveld Diagram)",
        "href": ""
      },
      "series": [{
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
	      "lineColor": "rgb(119, 152, 191)",
	      "fillColor": "rgb(119, 152, 191)"
        }
      }, {
        "name": "Vertical Projection",
        "type": "line",
        "linkedTo": "vertical",
        "enableMouseTracking": false,
        "data": vertical,
        "color": "rgb(119, 152, 191)",
        "marker": {
          "enabled": false
        }
      }, {
        "type": "scatter",
        "id": "vertical",
        "name": "Vertical Projection",
        "data": vertical,
        "color": "rgb(119, 152, 191)",
        "marker": {
          "symbol": "circle",
          "lineWidth": 1,
          "lineColor": "rgb(119, 152, 191)",
          "fillColor": "white"
        }
      }].concat(formatInterpretationSeries(specimen.interpretations))
  });

}

function getConfidenceEllipse(angle) {

  /*
   * Function getConfidenceEllipse
   * Returns confidence ellipse around up North
   */

  // Define the number of discrete points on an ellipse
  const NUMBER_OF_POINTS = 51;

  var vectors = new Array();

  // Create a circle around the pole with angle confidence
  for(var i = 0; i < NUMBER_OF_POINTS; i++) {
    vectors.push(new Direction((i * 360) / (NUMBER_OF_POINTS - 1), 90 - angle));
  }

  // Handle the correct distribution type
  return vectors;

}

function getRotationMatrix(lambda, phi) {

  /*
   * Function getRotationMatrix
   * Returns the rotation matrix
   */

  return new Array(
    new Array(Math.cos(lambda) * Math.sin(phi), -Math.sin(lambda), Math.cos(phi) * Math.cos(lambda)),
    new Array(Math.sin(phi) * Math.sin(lambda), Math.cos(lambda), Math.sin(lambda) * Math.cos(phi)),
    new Array(-Math.cos(phi), 0, Math.sin(phi))
  );

}

function getPlaneData(direction) {

  const ANGLE = 90;

  return getConfidenceEllipse(ANGLE).map(x => x.toCartesian()).map(x => x.rotateTo(direction.dec, direction.inc)).map(x => x.toVector(Direction)).map(x => x.highchartsData());

}

function formatInterpretationSeriesArea(interpretations) {

  var series = new Array();

  // Extract TAU3 interpretations for plotting
  interpretations.forEach(function(interpretation) {

    var coordinates = interpretation[COORDINATES];

    var direction = new Coordinates(coordinates.x, coordinates.y, coordinates.z).toVector(Direction);

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

    // Get the plane data (confidence ellipse with angle 90)
    if(interpretation.type === "TAU3") {

      series.push({
        "name": "95% Confidence",
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

function formatInterpretationSeries(interpretations) {

  /*
   * Function formatInterpretationSeries
   * Formats the series used for showing interpretated directions
   */

  const SCALING = 1000000;

  var series = new Array();

  interpretations.forEach(function(interpretation) {

    // Only show TAU1
    if(interpretation.type === "TAU3") {
      return;
    }

    interpretation = interpretation[COORDINATES];

    // Handle the projection
    if(UPWEST) {

      // Create a line that represents the vector
      // Add line for horizontal projection (x, y)
      var linearFitHorizontal = [{
        "x": interpretation.centerMass.x + interpretation.x * SCALING, 
        "y": interpretation.centerMass.y + interpretation.y * SCALING
      }, {
        "x": interpretation.centerMass.x - interpretation.x * SCALING,
        "y": interpretation.centerMass.y - interpretation.y * SCALING
      }];
      
      // Do the same for line for horizontal projection (y, z)
      var linearFitVertical = [{
        "x": interpretation.centerMass.x + interpretation.x * SCALING, 
        "y": interpretation.centerMass.z + interpretation.z * SCALING
      }, {
        "x": interpretation.centerMass.x - interpretation.x * SCALING, 
        "y": interpretation.centerMass.z - interpretation.z * SCALING
      }];

    } else {

      var linearFitHorizontal = [{
        "x": interpretation.centerMass.y + interpretation.y * SCALING, 
        "y": -interpretation.centerMass.x - interpretation.x * SCALING
      }, {
        "x": interpretation.centerMass.y - interpretation.y * SCALING,
        "y": -interpretation.centerMass.x + interpretation.x * SCALING
      }];
      
      var linearFitVertical = [{
        "x": interpretation.centerMass.y + interpretation.y * SCALING, 
        "y": interpretation.centerMass.z + interpretation.z * SCALING
      }, {
        "x": interpretation.centerMass.y - interpretation.y * SCALING, 
        "y": interpretation.centerMass.z - interpretation.z * SCALING
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

function createIntensityDiagram(sample, series) {

  /*
   * Function createIntensityDiagram
   * Renders the Highcharts intensity diagram
   */

  function intensityTooltip() {

    /*
     * Function createIntensityDiagram::intensityTooltip
     * Formats the Highcharts intensity diagram tooltip
     */

    return "<b>Demagnetization Step: </b>" + this.x + "<br> <b>Intensity </b>" + this.y.toFixed(2);

  }

  const EXPORTING_WIDTH = 1200;
  const EXPORTING_HEIGHT = 400;
  const EXPORTING_FILENAME = "intensity-diagram";

  Highcharts.chart("intensity-container", {
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
      "text": "Intensity Diagram " + sample.name
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
      "enabled": true,
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
              stepSelector.setActiveStep(this.index);
            }
          }
        }
      }
    },
    "series": series
  });

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

function eqAreaProjection(specimen) {

  /* 
   * Function eqAreaProjection
   * Description: Handles plotting for equal area projection
   */

  //Get the bedding and core parameters from the sample object
  var coreAzi = specimen.coreAzimuth;
  var coreDip = specimen.coreDip;
  var beddingStrike = specimen.beddingStrike;
  var beddingDip = specimen.beddingDip;
	
  // Get the Boolean flags for the graph
  var enableLabels = false;

  var information;
	
  // Format a Highcharts data bucket for samples that are visible
  var dataSeries = new Array();

  // Go over each step
  specimen.steps.forEach(function(step, i) {

    if(!step.visible) {
      return;
    }

    if(stepSelector._selectedStep === i) {
      var marker = {"radius": MARKER_RADIUS_SELECTED}
    } else {
      var marker = {"radius": MARKER_RADIUS}
    }

    var direction = inReferenceCoordinates(COORDINATES, specimen, new Coordinates(step.x, step.y, step.z)).toVector(Direction);

    if(direction.inc < 0) {
      marker.fillColor = HIGHCHARTS_WHITE;
    } else {
      marker.fillColor = HIGHCHARTS_BLUE;
    }

    marker.lineWidth = 1;
    marker.lineColor = HIGHCHARTS_BLUE;

    dataSeries.push({
      "x": direction.dec, 
      "y": projectInclination(direction.inc), 
      "inc": direction.inc, 
      "step": step.step,
      "marker": marker,
      "index": i
    });
    
  });
	
  // Prevent making a connection between first - last data point
  dataSeries.push(null);
	
  Highcharts.chart("hemisphere-container", {
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
      "enabled": true,
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
              stepSelector.setActiveStep(this.index);
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
    "series": [{
      "name": "Directions",
      "id": "Directions",
      "type": "scatter",
      "zIndex": 100,
      "data": dataSeries
    }, {
      "name": "Directions",
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      },
      "linkedTo": "Directions",
      "type": "line", 
      "data": dataSeries		
    }].concat(formatInterpretationSeriesArea(specimen.interpretations)),
  });

}

const ITEM_DELIMITER = ",";
const LINE_DELIMITER = "\n";

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
    rows.push(new Array(series[0].data[i].x, series[0].data[i].y, series[1].data[i].y, series[2].data[i].y).join(ITEM_DELIMITER));
  }
		
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

  var rows = new Array(HEADER.join(ITEM_DELIMITER));

  series[0].data.forEach(function(x, i) {
    rows.push(new Array(x.step, x.x, x.y, series[2].data[i].y).join(ITEM_DELIMITER));
  });

  return rows.join(LINE_DELIMITER);

}

(function (H) {

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
  H.Chart.prototype.generateCSV = function () {

    // Zijderveld Diagram
    if(this.userOptions.chart.id === "zijderveld-container") {
      return downloadAsCSV("zijderveld.csv", getZijderveldCSV(this.series));
    } else if(this.userOptions.chart.id === "intensity-container") {
      return downloadAsCSV("intensity.csv", getIntensityCSV(this.series));
    }
		
  };  
	
  H.getOptions().exporting.buttons.contextButton.menuItems.push({
    "text": "Download Data",
    "onclick": function() {
      this.generateCSV();
    }
  });

}(Highcharts));