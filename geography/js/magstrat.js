function showStratigraphy(container, plotData) {

  /*
   * Function showStratigraphy
   * Creates declination/inclination plot against level
   */

  function tooltip() {

    /*
     * Function showStratigraphy::tooltip
     * Creates tooltip for chart
     */

    return [
      "<b>Sample: </b>" + this.point.sample,
      "<b>" + title + ": </b>" + this.x.toFixed(2),
      "<b>Stratigraphic Level: </b>" + this.y
    ].join("<br>");

  }

    const USE_POSITIVE_XAXIS = document.getElementById("magstrat-positive").checked;

    // Determine title and x-range
    if (container === "magstrat-container-declination") {
        var range = (USE_POSITIVE_XAXIS ? {"min": 0, "max": 360} : {"min": -180, "max": 180});
        var title= "Declination";
    } else if (container === "magstrat-container-inclination") {
        range = {"min": -90, "max": 90}
        title = "Inclination";
    } else if (container === "magstrat-container-latitude") {
        range = {"min": -90, "max": 90}
        title = "Pole latitude";
    } else if (container === "magstrat-container-longitude") {
        range = {"min": -180, "max": 180}
        title = "Pole longitude";
    }

    new Highcharts.chart(container, {
        "chart": {
            "height": 800
        },
        "title": {
            "text": title
        },
        "xAxis": {
            "min": range.min,
            "max": range.max,
            "tickInterval": ((title === "Declination" || title === "Pole longitude") ? 90 : 45),
            "labels": {
                "format": "{value}°"
            }
        },
        "exporting": {
            "sourceWidth": 400,
            "sourceHeight": 800,
            "enabled": false
        },
        "tooltip": {
            "formatter": tooltip
        },
        "yAxis": {
            "opposite": ((title === "Declination" || title === "Pole longitude") ? false : true),
            "gridLineDashStyle": "Dot",
            "title": {
                "text": ""
            }
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [Magnetostratigraphy]",
            "href": ""
        },
        "series": [{
            "type": "line",
            "linkedTo": "data",
            "showInLegend": false,
            "dashStyle": "Dot",
            "name": title,
            "lineWidth": 1,
            "color": "grey",
            "enableMouseTracking": false,
            "data": plotData,
        }, {
            "id": "data",
            "color": "rgb(119, 152, 191)",
            "name": title,
            "type": "scatter",
            "data": plotData,
            "marker": {
                "symbol": "circle",
            }
        }]

  });

}

function showBinaryColumn(polarityData) {

    /*
     * Function showBinaryColumn
     * Creates the binary column with a given polarity
     */

    // Extract the ticks from the declination chart
    var ticks = $("#magstrat-container-declination").highcharts().yAxis[0].tickPositions;

    new Highcharts.chart("magstrat-container-binary", {
        "chart": {
            "height": 800
        },
        "title": {
            "text": "Polarity",
        },
        "xAxis": {
            "min": 0,
            "max": 1,
            "labels": {
                "style": {
                    "color": "white"
                }
            },
            "lineColor": "white",
            "tickColor": "white"
        },
        "tooltip": {
            "enabled": !false
        },
        "yAxis": [{
            "tickPositions": ticks,
            "lineWidth": 1,
            "lineColor": "black",
            "title": {
                "text": "",
            },
            "labels": {
                "enabled": false
            },
            "min": 0,
            "gridLineWidth": 0,
        }, {
            "opposite": true,
            "tickPositions": ticks,
            "lineWidth": 1,
            "lineColor": "black",
            "title": {
                "text": "",
            },
            "labels": {
                "enabled": false
            },
            "min": 0,
            "gridLineWidth": 0,
        }],
        "credits": {
            "enabled": false,
        },
        "exporting": {
            "sourceWidth": 200,
            "sourceHeight": 800,
            "enabled": false
        },
        "series": [{
            "type": "arearange",
            "name": "Polarity",
            "enableMouseTracking": false,
            "marker": {
                "enabled": false
            },
            "data": polarityData,
            "lineWidth": 0,
            "color": HIGHCHARTS_BLACK,
            "zIndex": 0,
            "states": {
                "hover": {
                    "enabled": false
                }
            }
        }]

    });

    // Update y-Axis for binary graph to match dec/inc plots
    updateStratigraphicLevel();

}

function updateStratigraphicLevel() {

    /*
     * Function updateStratigraphicLevel
     * Updates the y-axis for the binary stratigraphy plot
     */

    // Get the extremes, sanity check and update
    var extremesInc = $("#magstrat-container-inclination").highcharts().yAxis[0].getExtremes();
    var extremesDec = $("#magstrat-container-declination").highcharts().yAxis[0].getExtremes();

    if(extremesInc.max !== extremesDec.max || extremesInc.min !== extremesDec.min) {
        return notify("danger", "The axis scales for the charts do not match.");
    }

    // Set new extremes and check new extremes
    $("#magstrat-container-binary").highcharts().yAxis[0].setExtremes(extremesInc.min, extremesInc.max);

}

function cart2dir(cart) {
    const rad = Math.PI / 180;  // constante para convertir grados a radianes
    cart = math.matrix(cart)

    let Xs_m, Ys_m, Zs_m;
    if (cart._size.length > 1) {
        Xs_m = math.column(cart, 0);
        Ys_m = math.column(cart, 1);
        Zs_m = math.column(cart, 2);
    } else {
        Xs_m = cart.get([0]);
        Ys_m = cart.get([1]);
        Zs_m = cart.get([2]);
    }

    if (math.isComplex(Xs_m)) {
        Xs_m = math.re(Xs_m);
    }
    if (math.isComplex(Ys_m)) {
        Ys_m = math.re(Ys_m);
    }
    if (math.isComplex(Zs_m)) {
        Zs_m = math.re(Zs_m);
    }

    var Xs = []
    var Ys = []
    var Zs = []
    for (let value of Xs_m) {
        Xs.push(value.value)
    }
    for (let value of Ys_m) {
        Ys.push(value.value)
    }
    for (let value of Zs_m) {
        Zs.push(value.value)
    }

    const Xs2 = math.map(Xs, x => x ** 2)
    const Ys2 = math.map(Ys, y => y ** 2)
    const Zs2 = math.map(Zs, z => z ** 2)

    const XYZadd = math.add(Xs2, math.add(Ys2, Zs2))

    const Rs = math.map(XYZadd, x => Math.sqrt(x))

    // Calcular declinación teniendo en cuenta los cuadrantes correctos (arctan2) y
    // aplicando el módulo 360.
    const arctan2 = math.map(Ys, (y, index) => math.atan2(y, Xs[index]))
    const arctan2_d = math.divide(arctan2, rad)
    const Decs = math.mod(arctan2_d, 360)

    try {
        // Calcular la inclinación (convirtiendo a grados) #
        const Incs = math.divide(math.map(Zs, (x, index) => Math.asin(x / Rs[index])), rad)
        const directionArray = math.ctranspose(math.matrix([Decs, Incs, Rs]));
        return math.squeeze(directionArray)
    } catch (error) {
        console.log('Problema en cart2dir');  // probablemente división por cero en algún lugar
        return math.zeros([3]);
    }
}



function plotStrat() {

  /*
   * Function plotStrat
   * Plots Declination/Inclination versus the stratigraphic level
   */

  function stratigraphySorter(x, y) {

     /*
     * Function stratigraphySorter
     * Sorts specimens by stratigraphic level
     */

    return numericSort(x.level, y.level);

  }

  const USE_POSITIVE_XAXIS = document.getElementById("magstrat-positive").checked;

  // Get the selected collections
  var collections = getSelectedCollections();

  if(collections.length === 0) {
    return notify("danger", "Select a collection.");
  }

  if(collections.length > 1) {
    return notify("danger", "The magnetostratigraphy tool can only plot a single collection at once.");
  }

    // Get all accepted/rejected directions and sort by strat. level
    var stratigraphicData = [];

    // Change to requested reference coordinates and apply the cutoff
    var cutoff = doCutoff(collections.pop().components.map(x => x.inReferenceCoordinates()));
    var baseSite = new Site(0, 0)

  cutoff.components.forEach(function(component) {

        var directionArray = cart2dir(new Array([component.coordinates.x, component.coordinates.y, component.coordinates.z]))._data;
        var direction = {
            "dec": directionArray[0],
            "inc": directionArray[1]
        }

        // if (COORDINATES_DIRECTION === 'pole') {
        var pole = baseSite.poleFrom(new Direction(direction.dec, direction.inc))

        stratigraphicData.push({
            "x": component.coordinates.x,
            "y": component.coordinates.y,
            "z": component.coordinates.z,
            "dec": direction.dec,
            "inc": direction.inc,
            "lng": pole.lng,
            "lat": pole.lat,
            "level": component.level,
            "name": component.name
        });

  });

    stratigraphicData.sort(stratigraphySorter);

    var dataDec = stratigraphicData.map(function (x) {
        return {
            "sample": x.name,
            "x": (x.dec > 180) ? x.dec - 360 : x.dec,
            "y": x.level,
            "marker": {
                "fillColor": HIGHCHARTS_RED,
                "lineColor": HIGHCHARTS_RED,
                "lineWidth": 1
            }
        }
    });

  var dataInc = stratigraphicData.map(function(x) {

        return {
            "sample": x.name,
            "x": x.inc,
            "y": x.level,
            "marker": {
                "fillColor": HIGHCHARTS_ORANGE,
                "lineColor": HIGHCHARTS_ORANGE,
                "lineWidth": 1
            }
        }

    });

    var dataLng = stratigraphicData.map(function (x) {
        return {
            "sample": x.name,
            "x": (x.lng > 180) ? x.lng - 360 : x.lng,
            "y": x.level,
            "marker": {
                "fillColor": HIGHCHARTS_BLUE,
                "lineColor": HIGHCHARTS_BLUE,
                "lineWidth": 1
            }
        }
    });

    var dataLat = stratigraphicData.map(function (x) {

        return {
            "sample": x.name,
            "x": x.lat,
            "y": x.level,
            "marker": {
                "fillColor": HIGHCHARTS_GREEN,
                "lineColor": HIGHCHARTS_GREEN,
                "lineWidth": 1
            }
        }

  });

    // Create the plot for declination/inclination
    showStratigraphy("magstrat-container-declination", dataDec);
    showStratigraphy("magstrat-container-inclination", dataInc);
    showStratigraphy("magstrat-container-longitude", dataLng);
    showStratigraphy("magstrat-container-latitude", dataLat);

  // Attempt to determine the polarities
  var polarity = determinePolarities(stratigraphicData);

  // Plot the binary column in the middle
  showBinaryColumn(polarity);

}

function determinePolarities(stratigraphicData) {

  /*
   * Function determinePolarities
   * Determines specimen polarities for drawing
   */

  var polarity = [];

  // Simple algorithm for determining the stratigraphy
  for(var i = 0; i < stratigraphicData.length; i++) {

    var inclination = stratigraphicData[i].inc;
    var level = stratigraphicData[i].level;

    if(i > 0) {
      var levelPrev = stratigraphicData[i - 1].level;
    } else {
      var levelPrev = level;
    }

    if(i < stratigraphicData.length - 1) {
      var levelNext = stratigraphicData[i + 1].level;
    } else {
      var levelNext = level;
    }

    if(inclination < 0) {
      polarity.push({"x": 0, "low": 0.5 * (level + levelPrev), "high": 0.5 * (level + levelNext)})
      polarity.push({"x": 1, "low": 0.5 * (level + levelPrev), "high": 0.5 * (level + levelNext)})
      polarity.push(null);
    }

  }

  return polarity;

}
