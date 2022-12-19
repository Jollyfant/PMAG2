function plotExpected(container, dataSeries, site) {

  /*
   * Function plotExpected
   * Plots the sites or specimens on the APWP curves
   */

  function getTitle(container) {

    /*
     * Function plotExpected::getTitle
     * Returns the title for the respective plot
     */

    switch(container) {
      case "declination-container":
        return "APWP Predicted Declination";
      case "inclination-container":
        return "APWP Predicted Inclination";
      case "paleolatitude-container":
        return "APWP Predicted Paleolatitude";
    }

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
      (this.point.lower && this.point.upper) ? "<b>Interval: </b> " + this.point.lower.toFixed(2) + ", " + this.point.upper.toFixed(2) : ""
    ].join("<br>");

  }

  var title = getTitle(container);

  // Plotting options
  var PLOT_SPECIMENS = !document.getElementById("group-collection").checked;
  var AGE_SCATTER = document.getElementById("age-scatter").checked;

  // Add collection data
  getSelectedCollections().forEach(function(collection) {

    // Cutoff and statistics
    var cutofC = doCutoff(collection.components.map(x => x.inReferenceCoordinates()));

    // Remove rejected components
    cutofC.components = cutofC.components.filter(x => !x.rejected);

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
          "symbol": "circle",
          "color": collection.color
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
        "color": collection.color || HIGHCHARTS_ORANGE,
        "data": [{
          "x": avAge.value,
          "y": statistics.dir.mean.dec,
          "lower": (statistics.dir.mean.dec - statistics.butler.dDx),
          "upper": (statistics.dir.mean.dec + statistics.butler.dDx)
        }]
      }, {
        "name": "Confidence",
        "type": "line",
        "linkedTo": ":previous",
        "enableMouseTracking": false,
        "lineWidth": 1,
        "color": collection.color || HIGHCHARTS_ORANGE,
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
        "color": collection.color || HIGHCHARTS_ORANGE,
        "data": [{
          "x": avAge.value,
          "y": statistics.dir.mean.inc,
          "lower": (statistics.dir.mean.inc - statistics.butler.dIx),
          "upper": (statistics.dir.mean.inc + statistics.butler.dIx)
        }]
      }, {
        "name": "Confidence",
        "type": "line",
        "linkedTo": ":previous",
        "enableMouseTracking": false,
        "lineWidth": 1,
        "color": collection.color || HIGHCHARTS_ORANGE,
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
        "color": collection.color || HIGHCHARTS_ORANGE,
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
        "color": collection.color || HIGHCHARTS_ORANGE,
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

function plotPredictedDirections() {

  /*
   * Function plotPredictedDirections
   * Plots the predricted directions (declination, inclination) at a given site for a particular APWP
   * The APWP can be supplied from a database (e.g. Torsvik, Kent, Besse) or supplied by the user from a CSV file
   * or GPlates rotation file
   */

  function createPoleSeries(name, data, color, confidence) {

    return [{
      "name": name,
      "data": data,
      "lineWidth": 2,
      "color": color,
      "marker": {
        "symbol": "circle"
      }
    }, {
      "data": confidence,
      "type": "line",
      "lineWidth": 2,
      "dashStyle": "ShortDash",
      "enableMouseTracking": false,
      "linkedTo": ":previous",
      "marker": {
        "enabled": false
      }
    }];

  }

  function createRangeSeries(name, data, color, rangeData) {

    /*
     * Function plotPredictedDirections::createRangeSeries
     * Creates Highcharts series
     */

    return [{ 
      "name": name,
      "data": data,
      "color": color
    }, {
      "data": rangeData,
      "type": "arearange",
      "linkedTo": ":previous",
      "marker": {
        "enabled": false
      }
    }];

  }

  function getParticularEulerPole(plate, pole) {
  
    /*
     * Function plotPredictedDirections::getParticularEulerPole
     * Returns a particular Euler pole
     */

    // Check the GPlates data first
    if(GPlatesData.hasOwnProperty(plate)) {
  
       try {

         var poleMove = readGPlatesRotation(plate, pole.age);
         var poleFixed = readGPlatesRotation("701", pole.age);

         // May be null
         if(poleMove === null || poleFixed === null) {
           return null;
         }

         // Reverse rotation angle
         poleFixed.angle = -poleFixed.angle;

         // Add the Euler poles
         return convolvePoles(poleMove, poleFixed);

       } catch(exception) {
         throw(new Exception("Could not extract Euler pole from GPlates rotation file."));
       }
  
    }
  
    if(pole.euler === undefined) {
      notify("danger", "Select at least one reference model on the left hand side.");
      throw(new Exception("Vaes et al., 2022 does not have a default plate circuit. Please load a GPlates rotation file."));
    }

    if(pole.euler.hasOwnProperty(plate)) {
      return new EulerPole(pole.euler[plate].lng, pole.euler[plate].lat, pole.euler[plate].rot);
    }
  
    // Not exist for age
    return null;
  
  }

  // Create a site from the input
  var site = new Site(
    Number(document.getElementById("site-longitude-input").value),
    Number(document.getElementById("site-latitude-input").value)
  );

  var dataSeriesDeclination = new Array();
  var dataSeriesInclination = new Array();
  var dataSeriesPaleolatitude = new Array();
  var dataSeriesPoles = new Array();

  var counter = 0;

  var plates = getSelectedItems("plate-select");
  var references = getSelectedItems("reference-select").map(x => APWPs[x]);

  if(references.length === 0) {
    return notify("danger", "Select at least one reference model on the left hand side.");
  }

  // All references frames (or APWPs)
  references.forEach(function(APWP) {

    // Custom APWP was supplied: ignore selected plates since all Euler rotations will be 0
    if(APWP.type === "custom") {
      plates = new Array("Custom APWP");
    }

    // Confirm plates are selected
    if(plates.length === 0) {
      return notify("danger", "Select at least one plate on the right hand side.");
    }

    // Go over all plates
    plates.forEach(function(plate) {

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

        // Custom APWPS need not be rotated (since they are defined)
        // Just do an Euler rotation with rotation angle 0
        if(APWP.type === "custom") {
          var eulerPole = new EulerPole(0, 0, 0);
        } else {
          var eulerPole = getParticularEulerPole(plate, pole);
        }

        // Could not determine the Euler pole: skip this age!
        if(eulerPole === null) {
          return;
        }

        // Get the rotated pole
        var rPole = getRotatedPole(eulerPole, new Pole(pole.lng, pole.lat));
        var directions = site.directionFrom(rPole);

        // Within [-180, 180]
        if(directions.dec > 180) {
          directions.dec -= 360;
        }

        // Butler parameters
        var butler = getButlerParameters(pole.A95, directions.inc);

        // Calculate the confidence bounds
        var minDeclination = (directions.dec - butler.dDx);
        var maxDeclination = (directions.dec + butler.dDx);
        var minInclination = (directions.inc - butler.dIx);
        var maxInclination = (directions.inc + butler.dIx);
        var minPaleolatitude = butler.palatMin;
        var maxPaleolatitude = butler.palatMax;

        // The actual line data series
        // Lower and upper are for tooltip display
        dataDeclination.push({"x": pole.age, "y": directions.dec, "lower": minDeclination, "upper": maxDeclination});
        dataInclination.push({"x": pole.age, "y": directions.inc, "lower": minInclination, "upper": maxInclination});
        dataPaleolatitude.push({"x": pole.age, "y": paleolatitude(directions.inc), "lower": minPaleolatitude, "upper": maxPaleolatitude});

        // Confidence ranges
        dataDeclinationRange.push({"x": pole.age, "low": minDeclination, "high": maxDeclination});
        dataInclinationRange.push({"x": pole.age, "low": minInclination, "high": maxInclination});
        dataPaleolatitudeRange.push({"x": pole.age, "low": minPaleolatitude, "high": maxPaleolatitude});

        // The pole series
        poleSeries.push({"x": rPole.lng, "y": projectInclination(rPole.lat), "inc": rPole.lat, "age": pole.age});
        poleSeriesConfidence = poleSeriesConfidence.concat(getPlaneData({"dec": rPole.lng, "inc": rPole.lat}, pole.A95));
        poleSeriesConfidence.push({"x": null, "y": null});

      });

      // Do not connect any circles
      poleSeries.push({"x": null, "y": null});

      // Make sure that the area range and line share a color
      var name = mapPlate(plate).name + " (" + APWP.name + ")";
      var color = Highcharts.getOptions().colors[counter++ % 8];

      // Create line/range data series
      dataSeriesDeclination.push(...createRangeSeries(name, dataDeclination, color, dataDeclinationRange));
      dataSeriesInclination.push(...createRangeSeries(name, dataInclination, color, dataInclinationRange));
      dataSeriesPaleolatitude.push(...createRangeSeries(name, dataPaleolatitude, color, dataPaleolatitudeRange));

      // And a series for the poles
      dataSeriesPoles.push(...createPoleSeries(name, poleSeries, color, poleSeriesConfidence));

    });

  });

  const CHART_CONTAINER_DECLINATION = "declination-container";
  const CHART_CONTAINER_INCLINATION = "inclination-container";
  const CHART_CONTAINER_PALEOLATITUDE = "paleolatitude-container";

  // Create Highcharts for declination, inclination & paleolatitude
  plotExpected(CHART_CONTAINER_DECLINATION, dataSeriesDeclination, site);
  plotExpected(CHART_CONTAINER_INCLINATION, dataSeriesInclination, site);
  plotExpected(CHART_CONTAINER_PALEOLATITUDE, dataSeriesPaleolatitude, site);

  // Create Highcharts for pole positions
  plotPoles(dataSeriesPoles);

  // Jump to bottom
  window.scrollTo(0, document.body.scrollHeight);

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
        "inc": statistics.dir.mean.inc,
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
