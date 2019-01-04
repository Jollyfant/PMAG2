function showStratigraphy(container, plotData) {

  /*
   * Function showStratigraphy
   * Creates declination/inclination plot against level
   */

  function tooltip() {

    return [
      "<b>Sample: </b>" + this.point.sample,
      "<b>" + title + ": </b>" + this.x.toFixed(2),
      "<b>Stratigraphic Level: </b>" + this.y
    ].join("<br>");

  }

  // Determine title and x-range
  if(container === "magstrat-container-declination") {
    var range = {"min": -180, "max": 180}
    var title = "Declination";
  } else if(container === "magstrat-container-inclination") {
    var range = {"min": -90, "max": 90}
    var title = "Inclination";
  }

  new Highcharts.chart(container, {
    "title": {
      "text": title
    },
    "xAxis": {
      "min": range.min,
      "max": range.max,
      "tickInterval": (title === "Declination" ? 90 : 45),
      "labels": {
        "format": "{value}°"
      }
    },
    "exporting": {
      "sourceWidth": 400,
      "sourceHeight": 600,
      "enabled": false
    },
    "tooltip": {
      "formatter": tooltip
    },
    "yAxis": {
      "opposite": (title === "Declination" ? false : true),
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

function formatBinaryColumn(input) {

  /*
   * Function formatBinaryColumn
   * Converts series to a Highcharts arearange
   */

  var strat = new Array();

  for(var i = 0; i < input.length; i++) {
    strat.push({"x": 0, "low": input[i][0], "high": input[i][1]})
    strat.push({"x": 1, "low": input[i][0], "high": input[i][1]})
    strat.push(null);
  }
  
  return strat;
  
}

function showBinaryColumn(polarityData) {

  // Extract the ticks from the declination chart
  var ticks = $("#magstrat-container-declination").highcharts().yAxis[0].tickPositions;

  new Highcharts.chart("magstrat-container-binary", {
    "title": {
      "text": "⊶",
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
      "sourceHeight": 600,
      "enabled": false
    },
    "series": [{
      "enableMouseTracking": false,
      "type": "arearange",
      "name": "Polarity",
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
  var extremesInc = $("#magstratInclination").highcharts().yAxis[0].getExtremes();
  var extremesDec = $("#magstratDeclination").highcharts().yAxis[0].getExtremes();

  if(extremesInc.max !== extremesDec.max || extremesInc.min !== extremesDec.min) {
    return notify("danger", "The axis scales for the charts do not match.");
  }

  // Set new extremes and check new extremes
  $("#magstratSet").highcharts().yAxis[0].setExtremes(extremesInc.min, extremesInc.max);

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

  // Get the selected collections
  var collections = getSelectedCollections();

  if(collections.length === 0) {
    return notify("danger", "Select a collection.");
  }

  if(collections.length > 1) {
    return notify("danger", "The magnetostratigraphy tool can only plot a single collection at once.");
  }

  // Get all accepted/rejected directions and sort by strat. level
  var stratigraphicData = new Array();

  collections.pop().components.forEach(function(component) {

    var direction = component.coordinates.toVector(Direction);

    stratigraphicData.push({
      "dec": direction.dec,
      "inc": direction.inc,
      "level": Math.floor(Math.random() * 50),
      "name": component.name
    }); 

  });

  // Sort by stratigraphic level
  stratigraphicData.sort(stratigraphySorter);
  
  var dataDec = stratigraphicData.map(function(x) {

    return {
      "sample": x.name,
      "x": (x.dec > 180) ? x.dec - 360 : x.dec, 
      "y": x.level,
      "marker": {
    	"fillColor": (x.inc < 0 ? "white" : HIGHCHARTS_BLUE),
    	"lineColor": HIGHCHARTS_BLUE,
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
    	"fillColor": (x.inc < 0 ? "white" : HIGHCHARTS_BLUE),
    	"lineColor": HIGHCHARTS_BLUE,
    	"lineWidth": 1
      }
    }

  });

  // Create the plot for declination/inclination
  showStratigraphy("magstrat-container-declination", dataDec);
  showStratigraphy("magstrat-container-inclination", dataInc);
  
  // Plot the binary column in the middle (fake data for now)
  var inp = [[0, 1], [2, 3], [6, 7], [10, 20]];
  var bin = formatBinaryColumn(inp);

  showBinaryColumn(bin);

}
