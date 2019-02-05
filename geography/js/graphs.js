function plotExpected(container, dataSeries, site) {

  /*
   * Function plotExpected
   * Plots the sites or specimens on the APWP curves
   */

  var title;

  // Determine the chart title
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

function plotPredictedDirections() {

  /*
   * Function plotPredictedDirections
   * Plots the predricted directions (declination, inclination) at a given site for a particular APWP
   * The APWP can be supplied from a database (e.g. Torsvik, Kent, Besse) or supplied by the user from a CSV file
   * or GPlates rotation file
   */

  function mapPlateName(name) {

    /*
     * Function plotPredictedDirections::mapPlateName
     * Maps short hand plate name to full name
     */

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

  if(references.length === 0) {
    return notify("danger", "Select at least one reference model on the left hand side.");
  }

  // All references frames (or APWPs)
  references.forEach(function(APWP) {

    // Custom APWP was supplied: ignore selected plates since all Euler rotations will be 0
    if(APWP.type === "custom") {
      plates = new Array("Custom APWP");
    }

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

        // TODO FIXME 2 function
        if(APWP.type !== "custom") {

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

        } else {
          // No rot
          var eulerPole = new EulerPole(0, 0, 0);
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

        // The pole series
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

  // Create Highcharts for declination, inclination & paleolatitude
  plotExpected(CHART_CONTAINER_DECLINATION, dataSeriesDeclination, site);
  plotExpected(CHART_CONTAINER_INCLINATION, dataSeriesInclination, site);
  plotExpected(CHART_CONTAINER_PALEOLATITUDE, dataSeriesPaleolatitude, site);

  // Create Highcharts for pole positions
  plotPoles(dataSeriesPoles);

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