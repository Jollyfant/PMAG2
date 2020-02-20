function showGeographicAndTectonicPlot(geographic, tectonic) {

  /*
   * Function showGeographicAndTectonicPlot
   * Shows the extreme (geoographic & tectonic) coordinates for the Foltest module
   */

  const CHART_CONTAINER = "foldtest-geographic-container";
  const CHART_CONTAINER2 = "foldtest-tectonic-container";

  var dataSeriesGeographic = new Array();
  var dataSeriesTectonic = new Array();

  geographic.forEach(function(components) {

    components.forEach(function(component) {

      // Go over each step
      var direction = literalToCoordinates(component.coordinates).toVector(Direction);

      dataSeriesGeographic.push({
        "component": component,
        "x": direction.dec,
        "y": projectInclination(direction.inc),
        "inc": direction.inc,
      });

    });

  });

  tectonic.forEach(function(components) {

    components.forEach(function(component) {

      // Go over each step
      var direction = literalToCoordinates(component.coordinates).toVector(Direction);

      dataSeriesTectonic.push({
        "component": component,
        "x": direction.dec,
        "y": projectInclination(direction.inc),
        "inc": direction.inc,
      });

    });

  });

  var dataSeries = [{
    "name": "Geomagnetic Directions",
    "type": "scatter",
    "data": dataSeriesGeographic
  }];

  var dataSeries2 = [{
    "name": "Geomagnetic Directions",
    "type": "scatter",
    "data": dataSeriesTectonic
  }];

  eqAreaChart(CHART_CONTAINER, dataSeries);
  eqAreaChart(CHART_CONTAINER2, dataSeries2);

}

function bootstrapFoldtest() {

  /*
   * Function bootstrapFoldtest
   * Completes the classical foldtest but does a bootstrap on N randomly sampled data sets
   */

  const NUMBER_OF_BOOTSTRAPS = 1000;
  const NUMBER_OF_BOOTSTRAPS_SAVED = 50;
  const progressBarElement = $("#foldtest-progress");

  // Get a list of the selected sites
  var collections = getSelectedCollections();

  if(collections.length === 0) {
    return notify("danger", "Select at least one collection.");
  }

  if(foldtestRunning) {
    return notify("warning", "The foldtest module is already running.");
  }

  foldtestRunning = true;

  // Get the components for each site (no cutoff applied)
  var cutoffCollectionsG = collections.map(function(collection) {
    return collection.components.map(x => x.inReferenceCoordinates("geographic"));
  });

  // The same for tectonic coordinates
  var cutoffCollectionsT = collections.map(function(collection) {
    return collection.components.map(x => x.inReferenceCoordinates("tectonic"));
  });

  // Show the extremes
  showGeographicAndTectonicPlot(cutoffCollectionsG,  cutoffCollectionsT); 

  // Combine all geographic components to a single array
  var vectors = new Array().concat(...cutoffCollectionsG);

  var untilts = new Array();
  var savedBootstraps = new Array();

  // Save the unfolding of actual data
  savedBootstraps.push(unfold(vectors, 0).taus);

  // No bootstrap, only unfold the data
  if(!document.getElementById("foldtest-bootstrap-checkbox").checked) {
    return plotFoldtestCDF(untilts, savedBootstraps);
  }

  var result, next;
  var iteration = 0;

  // Asynchronous bootstrapping
  (next = function() {

    // Number of bootstraps were completed
    if(++iteration > NUMBER_OF_BOOTSTRAPS) {
      return plotFoldtestCDF(untilts, savedBootstraps);     
    }

    result = unfold(drawBootstrap(vectors), iteration);

    // Save the index of maximum untilting
    untilts.push(result.index);

    // Save the first N bootstraps
    if(iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
      savedBootstraps.push(result.taus);
    }

    // Update the DOM progress bar with the percentage completion
    progressBarElement.css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

    // Queue for next bootstrap but release UI thread
    setTimeout(next);

  })();

}

var shallowingRunning = false;
var foldtestRunning = false;

function bootstrapShallowing() {

    /*
     * Function bootstrapShallowing
     * Bootstraps the inclination shallowing module
     */

  function formatHSArray(x) {

    /*
     * Function formatHSArray
     * Formats the derived elongation, flattening as a highcharts point object
     */

    return {
      "x": x.inclination,
      "y": x.elongation,
      "f": x.flattening
    }

  }

  const NUMBER_OF_BOOTSTRAPS = 1000;
  const NUMBER_OF_BOOTSTRAPS_SAVED = 25;
  const NUMBER_OF_COMPONENTS_REQUIRED = 80;

  const progressBarElement = $("#shallowing-progress");

  // Get the single selected site
  var collections = getSelectedCollections();
 
  if(collections.length === 0) {
    return notify("danger", "No collections are selected.");
  }

  if(collections.length > 1) {
    return notify("danger", "Only one collection may be selected.");
  }

  if(shallowingRunning) {
    return notify("warning", "The inclination shallowing module is already running.");
  }

  // Get the vector in the reference coordinates
  var dirs = doCutoff(collections[0].components.map(x => x.inReferenceCoordinates())).components;

  dirs = dirs.filter(x => !x.rejected);

  if(dirs.length < NUMBER_OF_COMPONENTS_REQUIRED) {
    notify("warning", "A minimum of " + NUMBER_OF_COMPONENTS_REQUIRED + " components is recommended.");
  }

  shallowingRunning = true;

  var nIntersections = 0;
  var bootstrapIteration = 0;

  var inclinations = new Array();

  var originalInclination = meanDirection(dirs.map(x => x.coordinates)).inc;
  var originalUnflatted = unflattenDirections(dirs);

  var savedBootstraps = new Array();

  // Original data does not have an intersection with TK03.GAD
  if(originalUnflatted !== null) {
    savedBootstraps.push(originalUnflatted.map(formatHSArray));
    unflattenedInclination = originalUnflatted[originalUnflatted.length - 1].inclination;
  } else {
    savedBootstraps.push({"x": null, "y": null});
    unflattenedInclination = null;
  }

  // No bootstrap requested
  if(!document.getElementById("shallowing-bootstrap-checkbox").checked) {
    return EICompletionCallback(inclinations, originalInclination, unflattenedInclination, savedBootstraps);
  }

  var next;
  var iteration = 0;

  // Asynchronous bootstrapping
  (next = function() {

    progressBarElement.css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

    // Bootstrapp completed: finish
    if(++iteration > NUMBER_OF_BOOTSTRAPS) {
      return EICompletionCallback(inclinations, originalInclination, unflattenedInclination, savedBootstraps);
    }

    var result = unflattenDirections(drawBootstrap(dirs));

    // No intersection with TK03.GAD: proceed immediately next bootstrap
    if(result === null) {
      return setTimeout(next);
    }

    // Save the first 24 bootstraps
    if(iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
      savedBootstraps.push(result.map(formatHSArray));
    }

    // Save the inclination of intersection
    inclinations.push(result.pop().inclination);

    // Queue for next bootstrap
    setTimeout(next);

  })();

}

function EICompletionCallback(inclinations, originalInclination, unflattenedInclination, bootstraps) {

  /*
   * Function EICompletionCallback
   * Callback fired when the EI module has completed
   */

  // Unlock
  shallowingRunning = false;
  $("#shallowing-progress").css("width", "0%");

  // Initialize the two charts
  plotEIBootstraps(bootstraps, inclinations.length);
  plotEICDF(inclinations, originalInclination, unflattenedInclination);

}

function EIBootstrapTooltipFormatter() {

  /*
   * Function EIBootstrapTooltipFormatter
   * Formatter for the EI bootstrap chart
   */

  if(this.series.name == "Bootstraps") {
    return  [
      "<b>Unflattened Collection</b>",
      "<b>Inclination: </b> " + this.x.toFixed(3),
      "<b>Elongation: </b>" + this.y.toFixed(3),
      "<b>Flattening factor </b> at " + this.point.f
    ].join("<br>");
  } else {
    return [
      "<b>TK03.GAD Expected Elongation</b>",
      "<b>Inclination: </b>" + this.x,
      "<b>Elongation: </b>" + this.y.toFixed(3)
    ].join("<br>");
  }

}

function getPolynomialSeries(min, max) {

  /*
   * Function getPolynomialSeries
   * Gets the TK03.GAD Polynomial as a Highcharts data array from min to max
   */

  const MINIMUM_LATITUDE = -90;
  const MAXIMUM_LATITUDE = +90;

  var TK03Poly = new Array();

  for(var i = MINIMUM_LATITUDE; i <= MAXIMUM_LATITUDE; i++) {
    TK03Poly.push({
      "x": i,
      "y": TK03Polynomial(i)
    });
  }

  return TK03Poly;

}

function plotEIBootstraps(bootstraps, totalBootstraps) {
  
  /*
   * Function plotEIBootstraps
   * Plotting function for the EI bootstraps
   */

  const CHART_CONTAINER = "ei-bootstrap-container";

  // Define the initial series (TK03.GAD Polynomial) and the unflattening of the actual non-bootstrapped data (kept in data[0])
  var mySeries = [{
    "name": "TK03.GAD Polynomial", 
    "data": getPolynomialSeries(),
    "dashStyle": "ShortDash",
    "lineWidth": 3,
    "zIndex": 100,
    "type": "spline",
    "marker": {
      "enabled": false
    }
  }, {
    "name": "Bootstraps",
    "color": HIGHCHARTS_PINK,
    "id": "bootstrap",
    "type": 'spline',
    "data": bootstraps.shift(),
    "zIndex": 100,
    "lineWidth": 3,
    "marker": {
      "enabled": false,
      "symbol": "circle",
    }  
  }]

  // Add the other bootstraps
  bootstraps.forEach(function(bootstrap) {
    mySeries.push({
      "data": bootstrap,
      "type": "spline",
      "color": PLOTBAND_COLOR_BLUE, 
      "linkedTo": "bootstrap",
      "enableMouseTracking": false, 
      "marker": {
        "enabled": false
      }
    })
  });

  new Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "id": "EI-bootstraps",
      "zoomType": "x"
    },
    "title": {
      "text": "Bootstrapped E-I Pairs",
    },
    "subtitle": {
      "text": "Found " + totalBootstraps + " bootstrapped intersections with the TK03.GAD Field Model (" + COORDINATES + " coordinates)"
    },
    "exporting": {
      "filename": "TK03-EI",
      "sourceWidth": 1200,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        }
      }
    },
    "xAxis": {
      "min": -90,
      "max": 90,
      "title": {
        "text": "Inclination (°)"
      }
    },
    "yAxis": {
      "floor": 1,
      "ceiling": 3,
      "title": {
        "text": "Elongation (τ2/τ3)"
      },
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
      "href": ""
    },
    "plotOptions": {
      "series": {
        "turboThreshold": 0,
        "point": {
          "events": {
            "click": plotUnflattenedData
          }
        }
      }
    },
    "tooltip": {
      "formatter": EIBootstrapTooltipFormatter
    },
    "series": mySeries
  });

}


function plotUnfoldedData() {

  const CHART_CONTAINER = "modal-container";

  if(this.series.name !== "Bootstraps") {
    return;
  }

  var unfolding = this.x;

  // Get the single selected site
  var collections = getSelectedCollections();

  // Get the components for each site (no cutoff)
  var cutoffCollectionsG = collections.map(function(collection) {
    return collection.components.map(x => x.inReferenceCoordinates("geographic"));
  });

  // Combine all geographic components to a single array
  var dirs = new Array().concat(...cutoffCollectionsG);

  // Also check in the original data for plotting
  var originalData = dirs.map(function(component) {

    var direction = literalToCoordinates(component.coordinates).toVector(Direction);

    return {
      "component": component,
      "x": direction.dec,
      "y": projectInclination(direction.inc),
      "inc": direction.inc
    }

  });

  // Apply the King, 1966 flattening factor
  var unfoldedData = dirs.map(function(component) {

    var direction = literalToCoordinates(component.coordinates).correctBedding(component.beddingStrike, 1E-2 * unfolding * component.beddingDip).toVector(Direction);

    return {
      "component": component,
      "x": direction.dec,
      "y": projectInclination(direction.inc),
      "inc": direction.inc
    }

  });

  var plotData = [{
    "name": "Unfolded Directions",
    "data": unfoldedData,
    "type": "scatter",
    "marker": {
      "symbol": "circle"
    }
  }, {
    "name": "Original Directions",
    "type": "scatter",
    "data": originalData,
    "enableMouseTracking": false,
    "color": "lightgrey"
  }, {
    "linkedTo": ":previous",
    "type": "line",
    "data": createConnectingLine(originalData, unfoldedData),
    "color": "lightgrey",
    "marker": {
      "enabled": false
    },
    "enableMouseTracking": false,
  }];


  // Update the chart title
  document.getElementById("modal-title").innerHTML = "Geomagnetic Directions at <b>" + unfolding + "</b>% unfolding.";
  eqAreaChart(CHART_CONTAINER, plotData);

  // Show the modal
  $("#map-modal-2").modal("show");

}

function plotUnflattenedData() {

  /*
   * Function plotUnflattenedData
   * Plots unflattened data at a given flattening factor
   */

  const CHART_CONTAINER = "modal-container";

  if(this.series.name !== "Bootstraps") {
    return;
  }

  var flattening = this.f;

  // Get the single selected site
  var collections = getSelectedCollections();

  // Get the vector in the reference coordinates
  var dirs = doCutoff(collections[0].components.map(x => x.inReferenceCoordinates())).components;
  dirs = dirs.filter(x => !x.rejected);

  // Apply the King, 1966 flattening factor
  var unflattenData = dirs.map(function(component) {

    var direction = literalToCoordinates(component.coordinates).toVector(Direction);

    // Unflatten inclination at the requested flattening factor
    var uInclination = Math.atan(Math.tan(direction.inc * RADIANS) / flattening) / RADIANS;

    return {
      "component": component,
      "x": direction.dec,
      "y": projectInclination(uInclination),
      "inc": uInclination
    }

  });

  // Also check in the original data for plotting
  var originalData = dirs.map(function(component) {

    var direction = literalToCoordinates(component.coordinates).toVector(Direction);

    return {
      "component": component,
      "x": direction.dec,
      "y": projectInclination(direction.inc),
      "inc": direction.inc
    }

  });

  var plotData = [{
    "name": "Unflattened Directions",
    "data": unflattenData,
    "type": "scatter",
    "marker": {
      "symbol": "circle"
    }
  }, {
    "name": "Original Directions",
    "type": "scatter",
    "data": originalData,
    "enableMouseTracking": false,
    "color": "lightgrey"
  }, {
    "linkedTo": ":previous",
    "type": "line",
    "data": createConnectingLine(originalData, unflattenData),
    "color": "lightgrey",
    "marker": {
      "enabled": false
    },
    "enableMouseTracking": false,
  }];

  // Update the chart title
  document.getElementById("modal-title").innerHTML = "Unflattened Directions with factor <b>" + flattening + "</b>.";
  eqAreaChart(CHART_CONTAINER, plotData);

  // Show the modal
  $("#map-modal-2").modal("show");

}

function createConnectingLine(one, two) {

  var lines = new Array();

  one.forEach(function(x, i) {
    lines.push({
      "x": one[i].x,
      "y": one[i].y
    }, {
      "x": two[i].x,
      "y": two[i].y
    }, {
      "x": null,
      "y": null
    });
  });

  return lines;

}

function getAverageInclination(cdf) {

  /*
   * Function getAverageInclination
   * Returns the average from the cumulative distribution
   */

  var sum = 0;

  cdf.forEach(function(x) {
    sum = sum + x.x;
  });

  return sum / cdf.length;

}

function getConfidence(cdf) {

  /*
   * Function getConfidence
   * Returns the upper and lower 2.5% of a cumulative distribution function
   */

  var array = cdf.map(x => x.x);

  var lower = array[parseInt(0.025 * array.length, 10)];
  var upper = array[parseInt(0.975 * array.length, 10)];

  return { lower, upper }

}

function getVerticalLine(x) {

  /*
   * Function getVerticalLine
   * Return a vertical line in a CDF chart from 0 -> 1 at position x 
   */

  return new Array([x, 0], [x, 1]);

}

function plotEICDF(inclinations, originalInclination, unflattenedInclination) {

  /*
   * Function plotEICDF
   * Creates the CDF chart for the EI module
   */

  function tooltip() {
  
    /*
     * Function plotEICDF::tooltip
     * Handles tooltip for the EI CDF Chart
     */

    return [
      "<b>Cumulative Distribution </b>",
      "<b>Latitude: </b>" + this.x.toFixed(2),
      "<b>CDF: </b>" + this.point.y.toFixed(3)
    ].join("<br>");
  
  }

  const CHART_CONTAINER = "ei-cdf-container";

  // Calculate the cumulative distribution
  // And round to full degrees to get a nicer step function
  var cdf = getCDF(inclinations.map(x => Math.round(x)));

  // Get the lower and upper 2.5%
  var confidence = getConfidence(cdf);
  var lower = confidence.lower || -90;
  var upper = confidence.upper || 90;

  // Add the confidence plot band
  var plotBands = [{
    "id": "plotband",
    "color": PLOTBAND_COLOR_BLUE,
    "from": lower,
    "to": upper
  }];

  var mySeries = [{
    "name": "Original Inclination",
    "type": "line",
    "data": getVerticalLine(originalInclination),
    "color": HIGHCHARTS_PINK,
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }];

  //Define the cumulative distribution function
  if(cdf.length) {

    // Calculate the average inclination of all bootstraps
    var averageInclination = getAverageInclination(cdf);

    mySeries.push({
      "name": "Cumulative Distribution", 
      "data": cdf, 
      "step": true,
      "marker": {
        "enabled": false
      }
    }, {
      "name": "Average Bootstrapped Inclination",
      "type": "line",
      "data": getVerticalLine(averageInclination),
      "color": HIGHCHARTS_ORANGE,
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    });

  }

  // If the original data intersected with TK03.GAD
  if(unflattenedInclination !== null) {

    mySeries.push({
      "name": "Unflattened Inclination",
      "type": "line",
      "color": HIGHCHARTS_GREEN,
      "data": getVerticalLine(unflattenedInclination),
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    });

  }

  mySeries.push({
    "color": HIGHCHARTS_BLUE,
    "name": "Confidence Interval",
    "lineWidth": 0,
    "marker": {
      "symbol": "square"
    },
    "events": {
      "legendItemClick": (function(closure) {
        return function(event) {
          closure.forEach(function(plotBand) {
            if(this.visible) {
              this.chart.xAxis[0].removePlotBand(plotBand.id);
            } else {
              this.chart.xAxis[0].addPlotBand(plotBand);
            }
          }, this);
        }
      })(memcpy(plotBands))
    }
  });

  new Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "zoomType": "x"
    },
    "title": {
      "text": "Cumulative Distribution of bootstrapped TK03.GAD intersections",
    },
    "exporting": {
      "filename": "TK03_CDF",
      "sourceWidth": 1200,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        }
      }
    },
    "subtitle": {
      "text": "<b>Original Inclination</b>: " + originalInclination.toFixed(2) + " <b>Unflattened Inclination</b>: " + (unflattenedInclination === null ? "NaN" : unflattenedInclination.toFixed(2)) + " <b>Bootstrapped Confidence</b>: " + lower.toFixed(2) + " to " + upper.toFixed(2) + " (" + COORDINATES + " coordinates)"
    },
    "xAxis": {
      "min": -90,
      "max": 90,
      "plotBands": plotBands,
      "title": {
        "text": "Inclination (°)"
      }
    },
    "plotOptions": {
      "series": {
        "turboThreshold": 0
      }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
      "href": ""
    },
    "tooltip": {
      "formatter": tooltip
    },
    "yAxis": {
      "min": 0,
      "max": 1,
      "title": {
        "text": "Cumulative Distribution"
      }
    },
    "series": mySeries
  });

}

function unflattenDirections(data) {

  /*
   * Function unflattenDirections
   * Unflatted a list of directions towards the TK03.GAD polynomial
   */

  data = data.map(x => x.coordinates.toVector(Direction));

  // Get the tan of the observed inclinations (equivalent of tan(Io))
  var tanInclinations = data.map(x => Math.tan(x.inc * RADIANS));

  var results = new Array();

  // Decrement over the flattening values f from 100 to 20
  // We will find f with a resolution of 1%
  for(var i = 100; i >= 20; i--) {
  
    // Flattening factor (from 1 to 0.2)
    var f = i / 100; 
    
    // Unflattening function after King, 1955
    // (tanIo = f tanIf) where tanIo is observed and tanIf is recorded.
    // Create unflattenedData containing (dec, inc) pair for a particular f
    var unflattenedData = tanInclinations.map(function(x, i) {
      return new Direction(data[i].dec, Math.atan(x / f) / RADIANS)
    });

    // Calculate mean inclination for unflattenedData and get eigenvalues
    var meanInc = meanDirection(unflattenedData.map(x => x.toCartesian())).inc;
    var eigenvalues = getEigenvaluesFast(TMatrix(unflattenedData.map(x => x.toCartesian().toArray())));
    var elongation = eigenvalues.t2 / eigenvalues.t3;

    results.push({
      "flattening": f,
      "elongation": elongation,
      "inclination": meanInc
    });
    
    // In case we initially start above the TK03.GAD Polynomial
    // For each point check if we are above the polynomial; if so pop the parameters and do not save them
    // This simple algorithm finds the line below the TK03.GAD polynomial
    // Compare expected elongation with elongation from data from TK03.GAD
    // Only do this is Epoly < Edata
    // If there is more than 1 consecutive flattening factor in the array
    // This means we have a line under the TK03.GAD Polynomial
    // So we can return our parameters

    if(TK03Polynomial(meanInc) <= elongation) {

      if(results.length === 1) {
        results.pop();
        continue;
      }

      return results;

    }

  }
  
  // No intersection with TK03.GAD polynomial
  return null;
  
}

function TK03Polynomial(inclination) {

  /*
   * Function polynomial
   * Plots the foldtest data (coefficients taken from Pmag.py (Lisa Tauxe))
   */

  const COEFFICIENTS = [
    +3.15976125E-06,
    -3.52459817E-04,
    -1.46641090E-02,
    +2.89538539E+00
  ];

  // Symmetrical
  var inc = Math.abs(inclination);
  
  // Polynomial coefficients
  return COEFFICIENTS[0] * Math.pow(inc, 3) + COEFFICIENTS[1] * Math.pow(inc, 2) + COEFFICIENTS[2] * inc + COEFFICIENTS[3];
  
}

function plotFoldtestCDF(untilt, savedBootstraps) {

  /*
   * Function plotFoldtestCDF
   * Plots the foldtest data
   */

  function tooltip() {

    if(this.series.name === "Bootstraps") {
      return [
        "<b>Original Data</b>",
        "<b>Unfolding Percentage</b>: " + this.x + "%",
        "<b>Maximum Eigenvalue</b>: " + this.y.toFixed(3)
      ].join("<br>");
    } else if(this.series.name === "CDF") {
      return [
        "<b>Cumulative Probability</b>",
        "<b>Unfolding Percentage</b>: " + this.x + "%",
        "<b>Probability</b>: " + this.y.toFixed(3)
      ].join("<br>");
    }

  }

  // Release the test
  foldtestRunning = false;
  $("#foldtest-progress").css("width", "0%");

  const CHART_CONTAINER = "foldtest-full-container";
  const UNFOLDING_MIN = -50;
  const UNFOLDING_MAX = 150;

  var cdf = getCDF(untilt);
  var lower = untilt[parseInt(0.025 * cdf.length, 10)] || UNFOLDING_MIN;
  var upper = untilt[parseInt(0.975 * cdf.length, 10)] || UNFOLDING_MAX;

  // Create plotband for 95% bootstrapped confidence interval
  var plotBands =  [{
    "id": "plotband",
    "color": PLOTBAND_COLOR_BLUE,
    "from": lower,
    "to": upper
  }];

  var mySeries = [{
    "name": "CDF", 
    "type": "line",
    "step": true,
    "data": cdf, 
    "marker": {
      "enabled": false
    }
  }, {
    "name": "Bootstraps",
    "type": "spline",
    "data": savedBootstraps.shift(),
    "id": "bootstraps",
    "color": "red",
    "zIndex": 10
  }]

  mySeries.push({
    "name": "Geographic Coordinates",
    "type": "line",
    "color": HIGHCHARTS_GREEN,
    "data": getVerticalLine(0),
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }, {
    "name": "Tectonic Coordinates",
    "type": "line",
    "data": getVerticalLine(100),
    "color": HIGHCHARTS_ORANGE,
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  });

  savedBootstraps.forEach(function(bootstrap) {
    mySeries.push({
      "color": PLOTBAND_COLOR_BLUE,
      "data": bootstrap,
      "type": "spline",
      "linkedTo": "bootstraps",
      "enableMouseTracking": false,
    });
  });

  // The legend item click must contain a closure for the plotband data
  // Loop over the plotband data to add or remove it
  mySeries.push({
    "color": HIGHCHARTS_BLUE,
    "name": "Confidence Interval",
    "lineWidth": 0,
    "marker": { 
      "symbol": "square"
    },
    "events": { 
      "legendItemClick": (function(closure) { 
        return function(event) { 
          closure.forEach(function(plotBand) { 
            if(this.visible) { 
              this.chart.xAxis[0].removePlotBand(plotBand.id);
            } else { 
              this.chart.xAxis[0].addPlotBand(plotBand);
            } 
          }, this);
        } 
      })(memcpy(plotBands))
    } 
  });

  new Highcharts.chart(CHART_CONTAINER, {
    "chart": {
      "id": "foldtest",
      "renderTo": "container5",
      "zoomType": "x"
    },
    "title": {
      "text": "Bootstrapped foldtest",
    },
    "subtitle": {
      "text": "highest τ1 between [" + lower + ", " + upper + "] % unfolding (" + cdf.length + " bootstraps)",
    },
    "exporting": {
      "filename": "Foldtest",
      "sourceWidth": 1200,
      "sourceHeight": 600,
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        }
      }
    },
    "xAxis": {
      "min": UNFOLDING_MIN,
      "max": UNFOLDING_MAX,
      "tickInterval": 10,
      "pointInterval": 10,
      "title": {
        "text": "Percentage Unfolding"
      },
      "plotBands": plotBands
    },
    "yAxis": {
     "floor": 0,
     "ceiling": 1,
     "title": {
       "text": "τ1 (maximum eigenvalue)"
     }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [Foldtest Module] - <i>after Tauxe et al., 2010 </i>",
      "href": ""
    },
    "tooltip": {
      "enabled": true,
      "formatter": tooltip
    },
    "plotOptions": {
      "spline": {
        "marker": {
          "enabled": false
        },
        "point": {
          "events": {
            "click": plotUnfoldedData
          }
        }
      }

    },
    "series": mySeries
  });

}

function unfold(vectors, iteration) {

  /*
   * Function unfold
   * Unfolds a bunch of vectors following their bedding
   */

  function eigenvaluesOfUnfoldedDirections(vectors, unfoldingPercentage) {

    /*
     * Function eigenvaluesOfUnfoldedDirections
     * Returns the three eigenvalues of a cloud of vectors at a percentage of unfolding
     */

    // Do the tilt correction on all points in pseudoDirections
    var tilts = vectors.map(function(vector) {
      return literalToCoordinates(vector.coordinates).correctBedding(vector.beddingStrike, 1E-2 * unfoldingPercentage * vector.beddingDip);
    });

    // Return the eigen values of a real, symmetrical matrix
    return getEigenvaluesFast(TMatrix(tilts.map(x => x.toArray())));

  }

  const UNFOLDING_MIN = -50;
  const UNFOLDING_MAX = 150;
  const NUMBER_OF_BOOTSTRAPS_SAVED = 24;

  // Variable max to keep track of the maximum eigenvalue and its unfolding % index
  var max = 0;
  var index = 0;
  
  // Array to capture all maximum eigenvalues for one bootstrap over the unfolding range
  var taus = new Array();

  // For this particular random set of directions unfold from the specified min to max percentages
  // With increments of 10 degrees
  for(var i = UNFOLDING_MIN; i <= UNFOLDING_MAX; i += 10) {
  	
    // Calculate the eigenvalues
    var tau = eigenvaluesOfUnfoldedDirections(vectors, i);

    // Save the first 24 bootstraps
    if(iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
      taus.push({
        "x": i,
        "y": tau.t1
      });
    }

    if(tau.t1 > max) {
      max = tau.t1;
      index = i;
    }

  }

  // Hone in with a granularity of a single degree
  for(var i = index - 9; i <= index + 9; i++) {
  
    // Only if within specified minimum and maximum bounds
    if(i < UNFOLDING_MIN || i > UNFOLDING_MAX) {
      continue;
  	}

    // Calculate the eigenvalues
    var tau = eigenvaluesOfUnfoldedDirections(vectors, i);

    // Save the maximum eigenvalue for this bootstrap and unfolding increment
    if(tau.t1 > max) {
      max = tau.t1;
      index = i;
    }

  }

  return {
    "index": index,
    "taus": taus
  }

}

function getEigenvaluesFast(T) {

  /*
   * Function getEigenvaluesFast
   * Algorithm to find eigenvalues of a symmetric, real matrix.
   * We need to compute the eigenvalues for many (> 100.000) real, symmetric matrices (Orientation Matrix T).
   * Calling available libraries (Numeric.js) is much slower so we implement this algorithm instead.
   * Publication: O.K. Smith, Eigenvalues of a symmetric 3 × 3 matrix - Communications of the ACM (1961)
   * See https://en.wikipedia.org/wiki/Eigenvalue_algorithm#3.C3.973_matrices
   */
	
  // Calculate the trace of the orientation matrix
  // 3m is equal to the trace
  var m = (T[0][0] + T[1][1] + T[2][2]) / 3;
	
  // Calculate the sum of squares
  var p1 = Math.pow(T[0][1], 2) + Math.pow(T[0][2], 2) + Math.pow(T[1][2], 2);	
  var p2 = Math.pow((T[0][0] - m), 2) + Math.pow((T[1][1] - m), 2) + Math.pow((T[2][2] - m), 2) + 2 * p1;
	
  // 6p is equal to the sum of squares of elements
  var p = Math.sqrt(p2 / 6);
	
  // Identity Matrix I and empty storage matrix B
  var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	
  for (var i = 0; i < 3; i++ ) {
    for (var k = 0; k < 3; k++) {
      B[i][k] = (1 / p) * (T[i][k] - m * I[i][k]);
    }
  }

  // Half determinant of matrix B.
  var r = 0.5 * numeric.det(B);
	
  var phi;
  if(r <= -1) {
    phi = Math.PI / 3;
  } else if(r >= 1) {
    phi = 0;
  } else {
    phi = Math.acos(r) / 3;
  }
	
  // Calculate the three eigenvalues
  var eig1 = m + 2 * p * Math.cos(phi);
  var eig3 = m + 2 * p * Math.cos(phi + (2 * Math.PI / 3));

  // Last eigenvector can be derived
  var eig2 = 3 * m - eig1 - eig3;
	
  // Normalize eigenvalues
  var tr = eig1 + eig2 + eig3;

  return {
    "t1": eig1 / tr,
    "t2": eig2 / tr,
    "t3": eig3 / tr
  }
	
}

function getSelectedComponents() {

  /*
   * Function getSelectedComponents
   * Gets all the components from all collections as if it was a single collection
   */

  var components = new Array();

  getSelectedCollections().forEach(function(collection) {

    // Get the components in the correct coordinate system
    var collectionComponents = collection.components.map(x => x.inReferenceCoordinates());
    components = components.concat(collectionComponents);

  });

  return components;

}

function createCTMDGrid() {

  /*
   * Function createCTMDGrid
   * Creates the CTMD grid
   */

  var collections = getSelectedCollections();

  if(collections.length < 2) {
    return notify("danger", "Select two or more selections for the grid view.");
  }

  var names = collections.map(x => x.name);

  // Asynchronous call (using setTimeout)
  CTMDPermutations(collections, function(result) {

    // Create heatmap data series
    var success = new Array();
    var fail = new Array();

    result.forEach(function(x) {

      // Push to the correct data series
      if(x.match) {
        success.push({"x": x.i, "y": x.j}, {"x": x.j, "y": x.i})
      } else {
        fail.push({"x": x.i, "y": x.j}, {"x": x.j, "y": x.i});
      }

    });

    // Create the heat map
    CTMDHeatmapChart(names, success, fail);

  });

}

function CTMDHeatmapChart(names, match, noMatch) {

  /*
   * Function CTMDHeatmapChart
   * Creates a heatmap of all selected collection pairs
   */

  // Put a black square on the diagonal
  var empty = new Array();

  for(var i = 0; i < Math.sqrt(match.length + noMatch.length); i++) {
    empty.push({"x": i, "y": i});
  }

  new Highcharts.chart("permutation-table", {
    "chart": {
      "width": 600,
      "height": 600,
      "type": "heatmap",
    },
    "xAxis": {
      "categories": names,
      "tickInterval":  1,
      "gridLineWidth": 2,
      "tickLength": 0,
      "lineWidth": 1,
    },
    "title": {
      "text": "Common True Mean Directions",
    },
    "tooltip": {
      "formatter": function() {
        return [
          "<b>Common True Mean Direction Results</b>",
          "<b>Collection one:</b>" + this.series.yAxis.categories[this.point.y],
          "<b>Collection two:</b>" + this.series.xAxis.categories[this.point.x]
        ].join("<br>");
      }
    },
    "subtitle": {
      "text": "Showing " + (Math.pow(empty.length, 2) - empty.length) + " permutations"
    },
    "credits": {
      "enabled": ENABLE_CREDITS
    },
    "yAxis": {
      "categories": names,
      "tickInterval":  1,
      "gridLineWidth": 2,
      "tickLength": 0,
      "lineWidth": 1
    },
    "plotOptions": {
      "heatmap": {
        "pointPadding": 1
      }
    },
    "series": [{
      "name": "Match",
      "data": match,
      "color": HIGHCHARTS_GREEN,
    }, {
      "name": "No Match",
      "data": noMatch,
      "color": HIGHCHARTS_RED
    }, {
      "showInLegend": false,
      "enableMouseTracking": false,
      "data": empty,
      "color": HIGHCHARTS_BLACK
    }]
  });

}

function CTMDPermutations(collections, callback) {

  /*
   * Function CTMDPermutations
   * Does CTMD test on all permutations of selected collections
   */

  function getPairs(collections) {

    /*
     * function CTMDPermutations::getPairs
     * Returns permutation pairs for all selected collections
     */

    var pairs = new Array();

    // All permutations: j starts after i
    for(var i = 0; i < collections.length; i++) {
      for(var j = i + 1; j < collections.length; j++) {

        // Create a permutation pair
        pairs.push({
          "i": i,
          "j": j,
          "pair": new Array(collections[i].components, collections[j].components).map(function(components) {
            return doCutoff(components.map(x => x.inReferenceCoordinates())).components;
          })
        });

      }
    }

    return pairs;

  }

  // Create collection permutations
  var pairs = getPairs(collections);

  var results = new Array();

  // Run through all permutations but non-blocking 
  (next = function() {

    // Iteration can be stopped
    if(pairs.length === 0) {
      return callback(results);
    }

    var permutation = pairs.pop();

    // Simulate the current pair
    var result = simulateCTMD(...permutation.pair);

    var x = {
      "one": getConfidence(getCDF(result.xOne)),
      "two": getConfidence(getCDF(result.xTwo))
    }

    var y = {
      "one": getConfidence(getCDF(result.yOne)),
      "two": getConfidence(getCDF(result.yTwo))
    }

    var z = {
      "one": getConfidence(getCDF(result.zOne)),
      "two": getConfidence(getCDF(result.zTwo))
    }

    // Check whether the two collections are statistically "equivalent"
    results.push({
      "i": permutation.i,
      "j": permutation.j,
      "match": doesMatch(x, y, z)
    });

    // Proceed
    setTimeout(next);

  })();

}

function simulateCTMD(one, two) {

  /*
   * Function simulateCTMD
   * Does a single CTMD simulation
   */

  const NUMBER_OF_BOOTSTRAPS = 1000;

  // Buckets for the coordinates
  var xOne = new Array();
  var xTwo = new Array();
  var yOne = new Array();
  var yTwo = new Array();
  var zOne = new Array();
  var zTwo = new Array();

  one = one.filter(x => !x.rejected);
  two = two.filter(x => !x.rejected);

  // Complete N bootstraps
  for(var i = 0; i < NUMBER_OF_BOOTSTRAPS; i++) {

    // Draw a random selection from the site
    var sampledOne = drawBootstrap(one);
    var sampledTwo = drawBootstrap(two);

    // Calculate the mean value
    var statisticsOne = getStatisticalParameters(sampledOne);
    var statisticsTwo = getStatisticalParameters(sampledTwo);

    // Get unit coordinates of mean
    var coordinatesOne = statisticsOne.dir.mean.unit().toCartesian();
    var coordinatesTwo = statisticsTwo.dir.mean.unit().toCartesian();

    // Make it a reversal test!
    if(coordinatesOne.angle(coordinatesTwo) > 90) {
      coordinatesOne = coordinatesOne.reflect();
    }

    // Save the coordinates
    xOne.push(coordinatesOne.x);
    yOne.push(coordinatesOne.y);
    zOne.push(coordinatesOne.z);

    xTwo.push(coordinatesTwo.x);
    yTwo.push(coordinatesTwo.y);
    zTwo.push(coordinatesTwo.z);

  }

  return { xOne, xTwo, yOne, yTwo, zOne, zTwo }

}

function bootstrapCTMD() {

  /*
   * Function bootstrapCTMD
   * Does a bootstrap on the true data
   */

  const NUMBER_OF_BOOTSTRAPS = 1000;

  const CONTAINER_X = "ctmd-container-x";
  const CONTAINER_Y = "ctmd-container-y";
  const CONTAINER_Z = "ctmd-container-z";

  var collections = getSelectedCollections();

  if(collections.length !== 2) {
    return notify("danger", "Select two collections to compare.");
  }

  // Get the site components in reference coordinates
  cSites = collections.map(function(collection) {
    return doCutoff(collection.components.map(x => x.inReferenceCoordinates()));
  });

  var result = simulateCTMD(cSites[0].components, cSites[1].components);

  var names = {
    "one": collections[0].name,
    "two": collections[1].name
  }

  // Call plotting routine for each component
  var xParams = plotCartesianBootstrap(CONTAINER_X, getCDF(result.xOne), getCDF(result.xTwo), names, NUMBER_OF_BOOTSTRAPS);
  var yParams = plotCartesianBootstrap(CONTAINER_Y, getCDF(result.yOne), getCDF(result.yTwo), names, NUMBER_OF_BOOTSTRAPS);
  var zParams = plotCartesianBootstrap(CONTAINER_Z, getCDF(result.zOne), getCDF(result.zTwo), names, NUMBER_OF_BOOTSTRAPS);

  // Update the table
  updateCTMDTable(names, xParams, yParams, zParams);

}

function doesMatch(xParams, yParams, zParams) {

  /*
   * Function doesMatch
   * Checks whether two CTMD bootstraps overlap and are statistically "equivalent"
   */

  // Are the confidence regions overlapping?
  if(xParams.one.upper > xParams.two.lower && xParams.one.lower < xParams.two.upper) {
    if(yParams.one.upper > yParams.two.lower && yParams.one.lower < yParams.two.upper) {
      if(zParams.one.upper > zParams.two.lower && zParams.one.lower < zParams.two.upper) {
        return true;
      }
    }
  }

  return false;

}

function updateCTMDTable(names, xParams, yParams, zParams) {

  /*
   * Function updateCTMDTable
   * Updates the CTMD table with the two collections and parameters
   */

  function getMatchHTML(match) {

    /*
     * Function getMatchHTML
     * Returns HTML showing whether the test was a match or not
     */

    if(match) {
      return "<span class='text-success'><b><i class='fas fa-check'></i> Match!</b></span>";
    } else {
      return "<span class='text-danger'><b><i class='fas fa-times'></i> No Match!</b></span>";
    }

  }

  const PRECISION = 2;
  const TABLE_CONTAINER = "bootstrap-table";

  var match = doesMatch(xParams, yParams, zParams);

  document.getElementById(TABLE_CONTAINER).innerHTML = [
    "  <caption>1000 bootstrapped Cartesian coordinates for the collections at 95% confidence. " + getMatchHTML(match) + "</caption>",
    "  <thead>",
    "  <tr>",
    "    <td>Collection</td>",
    "    <td>xMinimum</td>",
    "    <td>xMaximum</td>",
    "    <td>yMinimum</td>",
    "    <td>yMaximum</td>",
    "    <td>zMinimum</td>",
    "    <td>zMaximum</td>",
    "  </tr>",
    "  </thead>",
    "  <tbody>",
    "  <tr>",
    "    <td>" + names.one + "</td>",
    "    <td>" + xParams.one.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + xParams.one.upper.toFixed(PRECISION) + "</td>",
    "    <td>" + yParams.one.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + yParams.one.upper.toFixed(PRECISION) + "</td>",
    "    <td>" + zParams.one.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + zParams.one.upper.toFixed(PRECISION) + "</td>",
    "  </tr>",
    "  <tr>",
    "    <td>" + names.two + "</td>",
    "    <td>" + xParams.two.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + xParams.two.upper.toFixed(PRECISION) + "</td>",
    "    <td>" + yParams.two.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + yParams.two.upper.toFixed(PRECISION) + "</td>",
    "    <td>" + zParams.two.lower.toFixed(PRECISION) + "</td>",
    "    <td>" + zParams.two.upper.toFixed(PRECISION) + "</td>",
    "  </tr>",
    "  </tbody>"
  ].join("\n");

}

function getCDF(input) {

  /*
   * Functiom getCDF
   * Returns the cumulative distribution function of an array
   */

  // Calculate the cumulative distribution function of the sorted input
  return input.sort(numericSort).map(function(x, i) {
    return {
      "x": x,
      "y": i / (input.length - 1)
    }
  });

}

function plotCartesianBootstrap(container, cdfOne, cdfTwo, names, nBootstraps) {

  /*
   * Function plotCartesianBootstrap
   * Plots a single cartesian bootstrap to a container
   */

  function CTMDTooltip() {
  
    /*
     * Function CTMDTooltip
     * Returns the formatted CTMD tooltip
     */
  
    return [
      "<b>Cumulative Distribution </b>",
      "<b>Collection: </b>" + this.series.name,
      "<b>Coordinate: </b>" + this.x.toFixed(2),
      "<b>CDF: </b>" + this.point.y.toFixed(3)
    ].join("<br>");
  
  }

  // Get the index of the upper and lower 5%
  var lower = parseInt(0.025 * nBootstraps, 10);
  var upper = parseInt(0.975 * nBootstraps, 10);

  //Define plot bands to represent confidence envelopes
  var plotBands = [{
    "from": cdfOne[lower].x,
    "to": cdfOne[upper].x,
    "color": PLOTBAND_COLOR_BLUE
  }, {
    "from": cdfTwo[lower].x,
    "to": cdfTwo[upper].x,
    "color": PLOTBAND_COLOR_RED
  }];
      
  //Define the cumulative distribution function
  //Info array contains site names
  var coordinateSeries = [{
    "name": names.one, 
    "data": cdfOne,
    "step": true,
    "color": HIGHCHARTS_BLUE,
    "marker": {
      "enabled": false
    }
  }, {
    "name": names.two,
    "color": HIGHCHARTS_RED,
    "step": true,
    "data": cdfTwo, 
    "marker": {
      "enabled": false
    }
  }];
  
  new Highcharts.chart(container, {
    "title": {
      "text": container.slice(-1) + "-component",
    },
    "exporting": {
      "filename": "coordinate-bootstrap",
      "sourceWidth": 400,
      "sourceHeight": 400,
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        },
      }
    },
    "subtitle": {
      "text": "(" + COORDINATES + " coordinates; N = " + nBootstraps + ")"
    },
    "plotOptions": {
      "series": {
        "turboThreshold": 0
      }
    },
    "xAxis": {
      "title": {
        "text": "Cartesian Coordinate on Unit Sphere"
      },
      "plotBands": plotBands,
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org [CTMD] - Coordinate Bootstrap (Tauxe et al., 2010)",
      "href": ""
    },
    "tooltip": {
      "formatter": CTMDTooltip
    },
    "yAxis": {
      "min": 0,
      "max": 1,
      "title": {
        "text": "Cumulative Distribution"
      }
    },
    "series": coordinateSeries
  });

  // Return the confidence bounds for the table
  return {
    "one": getConfidence(cdfOne),
    "two": getConfidence(cdfTwo)
  }
  
}

function drawBootstrap(data) {

  /*
   * Function drawBootstrap
   * Draws a random new distribution from a distribution of the same size
   */

  function randomSample() {

    /*
     * Function drawBootstrap::randomSample
     * Returns a random sample from an array
     */

    return data[Math.floor(Math.random() * data.length)];

  }

  return data.map(randomSample);

}

function generateHemisphereTooltip() {

  /*
   * Function generateHemisphereTooltip
   * Generates the appropriate tooltip for each series
   */

  const PRECISION = 1;

  if(this.series.name === "ChRM Directions" || this.series.name === "Geomagnetic Directions" || this.series.name === "Unflattened Directions") {
    return [
      "<b>Sample: </b>" + this.point.component.name,
      "<b>Declination: </b>" + this.x.toFixed(PRECISION),
      "<b>Inclination </b>" + this.point.inc.toFixed(PRECISION)
    ].join("<br>");
  } else if(this.series.name === "VGPs") {
    return [
      "<b>Sample: </b>" + this.point.component.name,
      "<b>Longitude: </b>" + this.x.toFixed(PRECISION),
      "<br><b>Latitude: </b>" + this.point.inc.toFixed(PRECISION)
    ].join("<br>");
  } else if(this.series.name.startsWith("Mean Direction")) {
    return [
      "<b>Mean Direction</b>",
      "<b>Declination: </b>" + this.x.toFixed(PRECISION),
      "<br><b>Inclination: </b>" + this.point.inc.toFixed(PRECISION)
    ].join("<br>");
  } else if(this.series.name === "Mean VGP") {
    return [
      "<b>Mean VGP</b>",
      "<b>Longitude: </b>" + this.x.toFixed(PRECISION),
      "<br><b>Latitude: </b>" + this.point.inc.toFixed(PRECISION)
    ].join("<br>");
  }

}

function addCollectionMetadata(index) {

  // Reference the collection
  openedCollection = collections[index]

  document.getElementById("metadata-modal-title").innerHTML = "Metadata for collection <b>" + openedCollection.name + "</b>";
  document.getElementById("color-preview").style.backgroundColor = openedCollection.color || "grey";

  document.getElementById("metadata-comments").value = openedCollection.comments || "";
  document.getElementById("metadata-authors").value = openedCollection.authors || "";
  document.getElementById("metadata-reference").value = openedCollection.doi || "";
  document.getElementById("metadata-year").value = openedCollection.year || "";
  
  $("#metadata-modal").modal("show");

}


function changeColor(color) {

  /*
   * Function changeColor
   * Changes the color of the selected collection
   */

  // Set the new color
  openedCollection.color = color;
  document.getElementById("color-preview").style.backgroundColor = openedCollection.color || "grey";
  
}


function updateCollectionMetadata() {

  /*
   * function updateCollectionMetadata
   * Updates metadata from input window
   */

  let comments = document.getElementById("metadata-comments").value;
  let authors = document.getElementById("metadata-authors").value;
  let reference = document.getElementById("metadata-reference").value;
  let year = document.getElementById("metadata-year").value;

  if(reference !== "" && !reference.startsWith("10.")) {
    return notify("danger", "The submitted DOI: <b>" + reference + "</b> is invalid.")
  }

  openedCollection.comments = comments || null;
  openedCollection.doi = reference || null;
  openedCollection.authors = authors || null;

  if(year !== "") {
    openedCollection.year = Number(year);
  } else {
    openedCollection.year = null;
  }

  // Deference
  openedCollection = null;
  notify("success", "Metadata for collection <b>" + openedCollection.name + "</b> has been succesfully updated.");
  eqAreaProjectionMean();
  saveLocalStorage();
  
}

function eqAreaProjectionMean() {

  /*
   * Function eqAreaProjectionMean
   * Plotting routine for collection means
   */

  const CHART_CONTAINER = "mean-container";
  const TABLE_CONTAINER = "mean-table";

  const PRECISION = 2;

  var dataSeries = new Array();
  var statisticsRows = new Array();

  var selectedCollections = getSelectedCollections();

  // Clear the charts
  if(selectedCollections.length === 0) {
    return document.getElementById(CHART_CONTAINER).innerHTML = document.getElementById(TABLE_CONTAINER).innerHTML = "";
  }

  selectedCollections.forEach(function(site) {

    var cutofC = doCutoff(site.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);

    // Check if a polarity switch is requested
    var A95Ellipse = getConfidenceEllipse(statistics.pole.confidence);

    if(A95_CONFIDENCE) {
      var a95ellipse = transformEllipse(A95Ellipse, statistics.dir);
    } else {
      var a95ellipse = getPlaneData(statistics.dir.mean, statistics.dir.confidence);
    }

    dataSeries.push({
      "name": "Mean Direction " + site.name,
      "type": "scatter",
      "data": new Array(statistics.dir.mean).map(prepareDirectionData),
      "color": HIGHCHARTS_GREEN,
      "marker": {
        "symbol": "circle",
        "radius": 6,
        "lineColor": HIGHCHARTS_GREEN,
        "lineWidth": 1,
        "fillColor": (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREEN)
      }
    }, {
      "name": "Confidence Ellipse",
      "linkedTo": ":previous",
      "type": "line",
      "color": HIGHCHARTS_RED,
      "data": a95ellipse,
      "enableMouseTracking": false,
      "marker": {
        "enabled": false
      }
    });

    if(site.doi) {
      var icon = "<span class='text-success'><i class='fas fa-id-card'></i></span>";
    } else {
      var icon = "<span class='text-danger'><i class='fas fa-id-card'></i></span>";
    }

    statisticsRows.push([
      "<tr>",
      "  <td>" + site.name + "</td>",
      "  <td>" + cutofC.components.filter(x => !x.rejected).length + "</td>",
      "  <td>" + cutofC.components.length + "</td>",
      "  <td>" + cutofC.cutoff.toFixed(PRECISION) + "</td>",
      "  <td>" + cutofC.scatter.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.mean.dec.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.mean.inc.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.R.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.dispersion.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.confidence.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.pole.dispersion.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.pole.confidence.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.pole.confidenceMin.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.pole.confidenceMax.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.butler.dDx.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.butler.dIx.toFixed(PRECISION) + "</td>",
      "  <td>" + statistics.dir.lambda.toFixed(PRECISION) + "</td>",
      "  <td onclick='addCollectionMetadata(" + site.index + ");' style='cursor: pointer;'>" + icon + "</td>",
      "</tr>"
    ].join("\n"));

  });

  document.getElementById(TABLE_CONTAINER).innerHTML = [
    "  <caption>",
    "    <div class='text-right'>",
    "      <button class='btn btn-sm btn-light' onclick='exportMeanCSV()'><i class='far fa-file-image'></i> CSV</button>",
    "      <button class='btn btn-sm btn-light' onclick='exportMeanJSON()'><i class='far fa-file-image'></i> JSON</button>",
    "    </div>",
    "  </caption>",
    "  <thead>",
    "  <tr>",
    "    <td>Collection</td>",
    "    <td>N</td>",
    "    <td>Ns</td>",
    "    <td>Cutoff</td>",
    "    <td>S</td>",
    "    <td>Dec</td>",
    "    <td>Inc</td>",
    "    <td>R</td>",
    "    <td>k</td>",
    "    <td>a95</td>",
    "    <td>K</td>",
    "    <td>A95</td>",
    "    <td>A95min</td>",
    "    <td>A95max</td>",
    "    <td>ΔDx</td>",
    "    <td>ΔIx</td>",
    "    <td>λ</td>",
    "    <td>Metadata</td>",
    "  </tr>",
    "  </thead>",
    "  <tbody>",
  ].concat(statisticsRows).join("\n");

  // Create the chart
  eqAreaChart(CHART_CONTAINER, dataSeries);

}

function eqAreaProjection() {

  /* 
   * Function eqAreaProjection
   * Description: Handles plotting for equal area projection
   */

  const CHART_CONTAINER = "direction-container";
  const CHART_CONTAINER2 = "pole-container";
  const TABLE_CONTAINER = "direction-table";

  // Clear if nothing is selected
  var selectedCollections = getSelectedCollections();
  if(selectedCollections.length === 0) {
    return document.getElementById(CHART_CONTAINER).innerHTML = document.getElementById(CHART_CONTAINER2).innerHTML = document.getElementById(TABLE_CONTAINER).innerHTML = "";
  }

  // Get a list of the selected sites
  var allComponents = doCutoff(getSelectedComponents());
  var statistics = getStatisticalParameters(allComponents.components);

  var dataSeries = new Array();
  var dataSeriesPole = new Array();

  var baseSite = new Site(0, 0);

  // Add each component
  allComponents.components.forEach(function(component) {

    // Go over each step
    var direction = literalToCoordinates(component.coordinates).toVector(Direction);
    
    var color;
    if(component.rejected) {
      color = HIGHCHARTS_RED;
    } else {
      color = HIGHCHARTS_BLUE;
    }

    dataSeries.push({
      "x": direction.dec, 
      "y": projectInclination(direction.inc), 
      "inc": direction.inc,
      "component": component,
      "marker": {
        "fillColor": (direction.inc < 0 ? HIGHCHARTS_WHITE : color),
        "lineWidth": 1,
        "lineColor": color
      }
    });

    var pole = baseSite.poleFrom(new Direction(direction.dec, direction.inc));

    // Simple rotation rotate all vectors with mean vector to up/north
    pole = pole.toCartesian().rotateTo(-statistics.pole.mean.lng, 90).rotateFrom(0, statistics.pole.mean.lat).rotateTo(statistics.pole.mean.lng, 90).toVector(Pole);

    dataSeriesPole.push({
      "x": pole.lng, 
      "y": projectInclination(pole.lat), 
      "inc": pole.lat, 
      "component": component,
      "marker": {
        "fillColor": (pole.lat < 0 ? HIGHCHARTS_WHITE : color),
        "lineWidth": 1,
        "lineColor": color
      }
    });      

  });

  // Get the confidence interval around the mean
  var A95Ellipse = getConfidenceEllipse(statistics.pole.confidence);

  var poleSeries = [{
    "name": "VGPs",
    "type": "scatter",
    "color": HIGHCHARTS_BLUE,
    "data": dataSeriesPole
  }, {
    "name": "Mean VGP",
    "type": "scatter",
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "symbol": "circle",
      "radius": 6
    },
    "data":  [{
      "x": 0,
      "y": 90,
      "inc": 90
    }]
  }, {
    "name": "Confidence Ellipse",
    "type": "line",
    "color": HIGHCHARTS_RED,
    "data": A95Ellipse.map(prepareDirectionData),
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }, {
    "name": "Cutoff",
    "type": "line",
    "dashStyle": "LongDash",
    "color": HIGHCHARTS_CYAN,
    "data": getConfidenceEllipse(allComponents.cutoff).map(prepareDirectionData),
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }];

  if(document.getElementById("enable-deenen").checked) {

    // Determine whether the criteria was passed or not
    var mark = (statistics.pole.confidenceMin < statistics.pole.confidence && statistics.pole.confidence < statistics.pole.confidenceMax) ? "✓" : "×";

    poleSeries.push({
      "name": "Deenen Criteria " + mark,
      "data": getConfidenceEllipse(statistics.pole.confidenceMax).map(prepareDirectionData),
      "type": "line",
      "color": HIGHCHARTS_ORANGE,
      "enableMouseTracking": false,
      "dashStyle": "ShortDash",
      "marker": { 
        "enabled": false
      } 
    }, {
      "linkedTo": ":previous",
      "data": getConfidenceEllipse(statistics.pole.confidenceMin).map(prepareDirectionData),
      "type": "line",
      "color": HIGHCHARTS_ORANGE,
      "enableMouseTracking": false,
      "dashStyle": "ShortDash",
      "marker": { 
        "enabled": false
      }
    });

  }

  const PRECISION = 2;

  document.getElementById(TABLE_CONTAINER).innerHTML = [
    "  <caption>Statistical parameters for this distribution</caption>",
    "  <thead>",
    "  <tr>",
    "    <td>N</td>",
    "    <td>Ns</td>",
    "    <td>Cutoff</td>",
    "    <td>S</td>",
    "    <td>Dec</td>",
    "    <td>Inc</td>",
    "    <td>R</td>",
    "    <td>k</td>",
    "    <td>a95</td>",
    "    <td>K</td>",
    "    <td>A95</td>",
    "    <td>A95min</td>",
    "    <td>A95max</td>",
    "    <td>ΔDx</td>",
    "    <td>ΔIx</td>",
    "    <td>λ</td>",
    "    <td>Save</td>",
    "  </tr>",
    "  </thead>",
    "  <tbody>",
    "  <tr>",
    "    <td>" + allComponents.components.filter(x => !x.rejected).length + "</td>",
    "    <td>" + allComponents.components.length + "</td>",
    "    <td>" + allComponents.cutoff.toFixed(PRECISION) + "</td>",
    "    <td>" + allComponents.scatter.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.mean.dec.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.mean.inc.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.R.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.dispersion.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.confidence.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.pole.dispersion.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.pole.confidence.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.pole.confidenceMin.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.pole.confidenceMax.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.butler.dDx.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.butler.dIx.toFixed(PRECISION) + "</td>",
    "    <td>" + statistics.dir.lambda.toFixed(PRECISION) + "</td>",
    "    <td onclick='saveCombinedCollection();' style='cursor: pointer;'><span class='text-success'><i class='fas fa-save'></i></span></td>",
    "  </tr>",
    "  </tbody>",
  ].join("\n");

  if(A95_CONFIDENCE) {
    var a95ellipse = transformEllipse(A95Ellipse, statistics.dir);
  } else {
    var a95ellipse = getPlaneData(statistics.dir.mean, statistics.dir.confidence);
  }

  var directionSeries = [{
    "name": "ChRM Directions",
    "type": "scatter",
    "zIndex": 5,
    "color": HIGHCHARTS_BLUE,
    "data": dataSeries
  }, {
    "name": "Mean Direction",
    "data": new Array(statistics.dir.mean).map(prepareDirectionData),
    "type": "scatter",
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "symbol": "circle",
      "radius": 6,
      "lineColor": HIGHCHARTS_GREEN,
      "lineWidth": 1,
      "fillColor": (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREEN)
    }
  }, {
    "name": "Confidence Ellipse",
    "type": "line",
    "color": HIGHCHARTS_RED,
    "data": a95ellipse,
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    }
  }];

  var plotBands = eqAreaPlotBand(statistics.dir.mean.dec, statistics.butler.dDx);

  // Delegate to plotting routines
  eqAreaChart(CHART_CONTAINER, directionSeries, plotBands);
  eqAreaChart(CHART_CONTAINER2, poleSeries);

}

function saveCombinedCollection() {

  /*
   * function saveCombinedCollection
   * Saves a combined collection
   */

  function modalConfirmCallback() {

    /*
     * function modalConfirmCallback
     * Callback fired when modal confirm is clicked for saving
     */

    var name = document.getElementById("modal-name").value;
    var discardRejected = document.getElementById("modal-discard-rejected").checked;

    // Name was not properly filled in
    if(name === "") {
      return notify("danger", "Could not add collection with an empty name.");
    }

    var components = getSelectedComponents();

    if(discardRejected) {
      components = doCutoff(components).components.filter(x => !x.rejected);
    }

    if(document.getElementById("modal-mirror-components").checked) {
      components = components.map(x => new Component(x, x.coordinates.reflect()));
    }

    // Make sure the coordinates are set back to specimen coordinates
    // A user may complete a cutoff in a particular reference frame
    components = components.map(x => new Component(x, fromReferenceCoordinates(COORDINATES, x, x.coordinates)));

    collections.push({ 
      "name": name,
      "dirty": true,
      "type": "collection",
      "reference": null,
      "components": components,
      "created": new Date().toISOString()
    });
 
    notify("success", "Succesfully added collection <b>" + name + "</b> with <b>" + components.length + "</b> components in <b>" + COORDINATES + "</b> coordinates.");
    updateSpecimenSelect();
    saveLocalStorage();

  }

  // Attach callback to the click event
  document.getElementById("modal-confirm").onclick = modalConfirmCallback;

  $("#map-modal").modal("show");

}

function transformEllipse(A95Ellipse, dir) {

  /*
   * Function transformEllipse
   * Transforms the A95 confidence ellipse to a direction
   */

  // Create a fake site at the location of the expected paleolatitude for the transfomration
  var site = new Site(0, dir.lambda);

  // Go over each point and transform VGP to direction at location
  var a95Ellipse = A95Ellipse.map(function(point) {
    return site.directionFrom(new Pole(point.dec, point.inc)).toCartesian().rotateTo(dir.mean.dec, 90).toVector(Direction);
  });

  let ellipse = a95Ellipse.map(prepareDirectionData);

  // Flip was requested
  if(document.getElementById("flip-ellipse").checked) {
    return flipEllipse(dir.mean.inc, ellipse);
  }

  return ellipse;

}

function eqAreaPlotBand(mDec, decError) {

  /*
   * Function eqAreaPlotBand
   * Creates a plot band around a declination, with a particular declination error
   */

  var minError = mDec - decError;
  var maxError = mDec + decError;

  var plotBands = [{
    "id": "plotband",
    "from": minError,
    "to": maxError,
    "color": PLOTBAND_COLOR_BLUE,
    "innerRadius": "0%",
    "thickness": "100%",
  }];

  // Plotbands in polar charts cannot go below through North (e.g. 350 - 10)
  // so we go from (360 - 10) and (350 - 360) instead 
  if(minError < 0) {

    plotBands.push({
      "id": "plotbandNeg",
      "from": 360,
      "to": minError + 360,
      "color": PLOTBAND_COLOR_BLUE,
      "innerRadius": "0%",
      "thickness": "100%",
    });

  }
  
  if(maxError > 360) {

    plotBands.push({
      "id": "plotbandPos",
      "from": 0,
      "to": maxError - 360,
      "color": PLOTBAND_COLOR_BLUE,
      "innerRadius": "0%",
      "thickness": "100%",
    });

  }
  
  return plotBands;

}

function prepareDirectionData(direction) {

  /*
   * Function prepareDirectionData
   * Prepared a direction for plotting by projecting the inclination
   */

  return {
    "x": direction.dec, 
    "y": projectInclination(direction.inc),
    "inc": direction.inc
  }

}

function eqAreaChart(container, dataSeries, plotBands, tickPositions) {

  /*
   * Function eqAreaChart
   * Creates an equal area chart
   */

  function addDegree() {

    /*
     * Function addDegree
     * Adds a degree symbol
     */

    return this.value + "\u00B0";

  }

  function exportCSVPole() {

    /*
     * Function exportCSVPole
     * Exports VGP Distribution to CSV file
     */

    const HEADER = new Array("Sample, Pole Longitude, Pole Latitude, Core Azimuth, Core Dip, Bedding Strike, Bedding Dip, Latitude, Longitude, Age, Age Min, Age max");

    var csv = HEADER.concat(dataSeries[0].data.map(function(point) {
      return new Array(
        point.component.name,
        point.x.toFixed(PRECISION),
        point.inc.toFixed(PRECISION),
        point.component.coreAzimuth,
        point.component.coreDip,
        point.component.beddingStrike,
        point.component.beddingDip,
        point.component.latitude,
        point.component.longitude,
        point.component.age,
        point.component.ageMin,
        point.component.ageMax
      ).join(ITEM_DELIMITER) 
    })).join(LINE_DELIMITER);

    downloadAsCSV("VGP-distribution.csv", csv);

  }

  function exportCSVDirection() {
    
    /*
     * Function exportCSVDirection
     * Exports ChRM Distribution to CSV file
     */
    
    const HEADER = new Array("Sample, Declination, Inclination, Core Azimuth, Core Dip, Bedding Strike, Bedding Dip, Latitude, Longitude, Age, Age Min, Age Max");
    
    var csv = HEADER.concat(dataSeries[0].data.map(function(point) {
      return new Array(
        point.component.name,
        point.x.toFixed(PRECISION),
        point.inc.toFixed(PRECISION),
        point.component.coreAzimuth,
        point.component.coreDip,
        point.component.beddingStrike,
        point.component.beddingDip,
        point.component.latitude,
        point.component.longitude,
        point.component.age,
        point.component.ageMin,
        point.component.ageMax
      ).join(ITEM_DELIMITER)
    })).join(LINE_DELIMITER);
    
    downloadAsCSV("ChRM-distribution.csv", csv);
  
  }

  function exportCSV() {

    switch(container) {
      case "pole-container":
        return exportCSVPole();
      case "direction-container":
      case "modal-container":
      case "foldtest-geographic-container":
      case "foldtest-tectonic-container":
      case "mean-container":
        return exportCSVDirection();
      default:
        return;
    }

  }

  const PRECISION = 2;

  var title;
  if(container === "pole-container") {
    title = "VGP Distribution";
  } else if(container === "direction-container" || container === "modal-container") {
    title = "ChRM Distribution";
  } else if(container === "mean-container") {
    title = "Mean Directions";
  } else if(container === "foldtest-geographic-container") {
    title = "Geographic Coordinates";
  } else if(container === "foldtest-tectonic-container") {
    title = "Tectonic Coordinates";
  }

  var subtitle;
  if(container === "foldtest-geographic-container") {
    subtitle = "";
  } else if(container === "foldtest-tectonic-container") {
    subtitle = "";
  } else {
    subtitle = "(" + COORDINATES + " coordinates)";
  }

  // Add plotband to the legend and make it a toggle
  if(plotBands !== undefined) {

    // The legend item click must contain a closure for the plotband data
    // Loop over the plotband data to add or remove it
    dataSeries.push({
      "color": HIGHCHARTS_BLUE,
      "name": "ΔDx Confidence Parachute",
      "lineWidth": 0,
      "marker": {
        "symbol": "square"
      },
      "events": {
        "legendItemClick": (function(closure) { 
          return function(event) {
            closure.forEach(function(plotBand) {
              if(this.visible) {
                this.chart.xAxis[0].removePlotBand(plotBand.id);
              } else {
                this.chart.xAxis[0].addPlotBand(plotBand);
              }
            }, this);
          }
        })(memcpy(plotBands))
      }
    });

  }

  // Default tick positions
  if(tickPositions === undefined) {
    tickPositions = new Array(0, 45, 90);
  }

  new Highcharts.chart(container, {
    "chart": {
      "polar": true,
      "animation": false,
      "height": 600,
    },
    "exporting": {
      "getCSV": exportCSV.bind(this),
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
      "text": title
    },
    "subtitle": {
      "text": subtitle
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
      "tickPositions": [0, 90]
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
      "plotBands": plotBands,
      "labels": {
        "formatter": addDegree
      }
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
        "cursor": "pointer"
      }
    },
    "series": dataSeries
  });

}
