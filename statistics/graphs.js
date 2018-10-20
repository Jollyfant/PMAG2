function getSelectedSites() {

  /*
   * Function getSelectedSites
   * Returns a reference to the sites that were selected
   */

  function isSelected(option) {
    return option.selected; 
  }

  function mapIndexToSite(index) {
    return sites[index];
  }

  function getIndex(option) {
    return Number(option.value);
  }

  return Array.from(document.getElementById("specimen-select").options).filter(isSelected).map(getIndex).map(mapIndexToSite);

}


function getSelectedComponents() {

  return new Array().concat(...getSelectedSites().map(x => x.components.map(y => y.inReferenceCoordinates("specimen"))));

}

function generateHemisphereTooltip() {

  if(this.series.name === "ChRM Directions") {
    return [
      "<b>Sample: </b>" + this.point.name,
      "<b>Declination: </b>" + this.x.toFixed(1),
      "<b>Inclination </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  } else if(this.series.name === "VGPs") {
    return [
      "<b>Sample: </b>" + this.point.name,
      "<b>Longitude: </b>" + this.x.toFixed(1),
      "<br><b>Latitude: </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  } else if(this.series.name === "Mean Direction") {
    return [
      "<b>Mean Direction</b>",
      "<b>Declination: </b>" + this.x.toFixed(1),
      "<br><b>Inclination: </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  } else if(this.series.name === "Mean VGP") {
    return [
      "<b>Mean VGP</b>",
      "<b>Longitude: </b>" + this.x.toFixed(1),
      "<br><b>Latitude: </b>" + this.point.inc.toFixed(1)
    ].join("<br>");
  }

}

document.getElementById("export-png").addEventListener("click", exportHandler);
document.getElementById("export-pdf").addEventListener("click", exportHandler);
document.getElementById("export-svg").addEventListener("click", exportHandler);

function exportHandler(event) {

  function getMime(id) {

    switch(id) {
      case "export-svg":
        return "image/svg+xml";
      case "export-pdf":
        return "application/pdf";
      case "export-png":
        return "image/png";
    }

  }

  Highcharts.exportCharts([
    $("#direction-container").highcharts(),
    $("#pole-container").highcharts()
  ], {
    "type": getMime(event.target.id)
  });

}

Highcharts.getSVG = function(charts, options, callback) {

  var svgArr = new Array();
  var top = 0;
  var width = 0;

  function addSVG(svgres) {

    // Grab width/height from exported chart
    var svgWidth = Number(svgres.match(/^<svg[^>]*width\s*=\s*\"?(\d+)\"?[^>]*>/)[1]);
    var svgHeight = Number(svgres.match(/^<svg[^>]*height\s*=\s*\"?(\d+)\"?[^>]*>/)[1]);

    // Offset the position of this chart in the final SVG
    var svg = svgres.replace('<svg', '<g transform="translate(' + width + ',' + 0 + ')" ').replace('</svg>', '</g>');

    top = svgHeight;
    width += svgWidth;

    width = Math.max(width, svgWidth);

    svgArr.push(svg);

  }

  function fail() {
    notify("danger", "Could not export charts.");
  }

  function exportChart(i) {

    if(i === charts.length) {
      return callback('<svg height="' + top + '" width="' + width + '" version="1.1" xmlns="http://www.w3.org/2000/svg">' + svgArr.join('') + '</svg>');
    }

    charts[i].getSVGForLocalExport(options, {}, fail, function(svg) {
      addSVG(svg);
      return exportChart(i + 1);
    });

  }

  exportChart(0);

}

Highcharts.exportCharts = function (charts, options) {

    options = Highcharts.merge(Highcharts.getOptions().exporting, options);

		// Get SVG asynchronously and then download the resulting SVG
    Highcharts.getSVG(charts, options, function (svg) {
        Highcharts.downloadSVGLocal(svg, options, function () {
            console.log("Failed to export on client side");
        });
    });
};

// Set global default options for all charts
Highcharts.setOptions({
    exporting: {
        fallbackToExportServer: false // Ensure the export happens on the client side or not at all
    }
});

function eqAreaProjection() {

  /* 
   * Function eqAreaProjection
   * Description: Handles plotting for equal area projection
   */

  const CHART_CONTAINER = "direction-container";
  const CHART_CONTAINER2 = "pole-container";

  // Get a list of the selected sites
  var allComponents = doCutoff(getSelectedComponents());
  var statistics = getStatisticalParameters(allComponents.components);

  var dataSeries = new Array();
  var dataSeriesPole = new Array();

  var baseSite = new Site({"lng": 0, "lat": 0});

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
      "name": component.name,
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
      "name": component.name,
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
  }];

  const ENABLE_DEENEN = true;

  if(ENABLE_DEENEN) {

    poleSeries.push({
      "name": "Deenen Criteria",
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

  document.getElementById("direction-table").innerHTML = [
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
    "  </tr>",
    "  </tbody>",
  ].join("\n");


  const A95_CONFIDENCE = true;

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
    "type": "scatter",
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "symbol": "circle",
      "radius": 6
    },
    "data": new Array(statistics.dir.mean).map(prepareDirectionData)
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

  eqAreaChart(CHART_CONTAINER, directionSeries, plotBands);
  eqAreaChart(CHART_CONTAINER2, poleSeries);

}

function transformEllipse(A95Ellipse, dir) {

  /*
   * Function transformEllipse
   * Transforms the A95 confidence ellipse to a direction
   */

  // Create a fake site at the location of the expected paleolatitude
  var site = new Site({
    "lng": 0,
    "lat": Math.abs(dir.lambda)
  });

  // Go over each point and transform VGP to direction at location
  var a95Ellipse = A95Ellipse.map(function(point) {
    return site.directionFrom(new Pole(point.dec, point.inc)).toCartesian().rotateTo(dir.mean.dec, 90).toVector(Direction);
  });

  return a95Ellipse.map(prepareDirectionData);

}

function eqAreaPlotBand(mDec, decError) {

  const PLOTBAND_COLOR = "rgba(119, 152, 191, 0.25)";

  var minError = mDec - decError;
  var maxError = mDec + decError;

  var plotBands = [{
    "from": minError,
    "to": maxError,
    "color": PLOTBAND_COLOR,
    "innerRadius": "0%",
    "thickness": "100%",
  }];

  // Plotbands in polar charts cannot go below through North (e.g. 350 - 10)
  // so we go from (360 - 10) and (350 - 360) instead 
  if(minError < 0) {
    plotBands.push({
      "from": 360,
      "to": minError + 360,
      "color": PLOTBAND_COLOR,
      "innerRadius": "0%",
      "thickness": "100%",
    });
  }
  
  if(maxError > 360) {
    plotBands.push({
      "from": 0,
      "to": maxError - 360,
      "color": PLOTBAND_COLOR,
      "innerRadius": "0%",
      "thickness": "100%",
    });
  }
  
  return plotBands;

}

function prepareDirectionData(direction) {

  return {
    "x": direction.dec, 
    "y": projectInclination(direction.inc),
    "inc": direction.inc
  }

}

function eqAreaChart(container, dataSeries, plotBands) {

  const ENABLE_45_CUTOFF = true;

  var title;
  if(container === "pole-container") {
    title = "VGP Distribution";
  } else if(container === "direction-container") {
    title = "ChRM Distribution";
  }

  Highcharts.chart(container, {
    "chart": {
      "polar": true,
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
      "text": title
    },
    "subtitle": {
      "text": "(" + COORDINATES + " coordinates)"
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
      "plotBands": plotBands
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