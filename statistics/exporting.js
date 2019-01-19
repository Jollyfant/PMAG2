(function(Highcharts) {

  // Highcharts patching
  Highcharts.seriesTypes.line.prototype.requireSorting = false;
  Highcharts.exportCharts = function(charts, options) {
  
    options = Highcharts.merge(Highcharts.getOptions().exporting, options);
  
    Highcharts.getSVG(charts, options, function(svg) { 
      Highcharts.downloadSVGLocal(svg, options, function() { 
        notify("danger", "Failured to export figure.");
      });
    });
  
  }
  
  // Set global default options for all charts
  Highcharts.setOptions({
    "exporting": {
      "fallbackToExportServer": false 
    }
  });

  Highcharts.getSVG = function(figure, options, callback) {
  
    function fail() {
  
      /*
       * Function Highcharts.getSVG::fail
       * Callback function fired when exporting fails
       */
  
      notify("danger", "Could not export charts.");
  
    }
  
    function getChartOffsets(id) {
  
      /*
       * Function Highcharts.getSVG::getChartOffsets
       * Returns the individual chart offsets in compilation figures
       */
  
      switch(id) {
        case "foldtest-geographic-container":
        case "direction-container":
        case "ei-bootstrap-container":
        case "ctmd-container-x":
          return {"width": 0, "top": 0}
        case "foldtest-tectonic-container":
        case "pole-container":
          return {"width": 600, "top": 0}
        case "foldtest-full-container":
        case "ei-cdf-container":
          return {"width": 0, "top": 600}
        case "ctmd-container-y":
          return {"width": 400, "top": 0}
        case "ctmd-container-z":
          return {"width": 800, "top": 0}
      }
  
    }
  
    function getChartSize(id) {
  
      /*
       * Function Highcharts.getSVG::getChartSize
       * Returns the expected size for compilation figures
       */
  
      switch(id) {
        case "foldtest":
          return {"top": 1200, "width": 1200}
        case "coordinate-bootstrap":
          return {"top": 400, "width": 1200}
        case "geomagnetic-directions":
          return {"top": 600, "width": 1200}
        case "shallowing":
          return {"top": 1200, "width": 1200}
      }
  
    }
  
    var svgArr = new Array();
  
    function addSVG(svgres, id) {
  
      // Get the offset
      var offset = getChartOffsets(id);
  
      // Offset the position of this chart in the final SVG
      var svg = svgres.replace('<svg', '<g transform="translate(' + offset.width + ',' + offset.top + ')" ').replace('</svg>', '</g>');
  
      svgArr.push(svg);
  
    }
  
    var size = getChartSize(figure.id);
    var charts = figure.charts;
    var next;
  
    // Must be handled asynchronously
    (next = function() {
  
      if(charts.length === 0) {
        return callback('<svg height="' + size.top + '" width="' + size.width + '" version="1.1" xmlns="http://www.w3.org/2000/svg">' + svgArr.join('') + '</svg>');
      }
  
      var chart = charts.pop();
  
      chart.getSVGForLocalExport(options, {}, fail, function(svg) {
        addSVG(svg, chart.renderTo.id);
        next();
      });
  
    })();
  
  }

})(Highcharts);

function exportHandlerFoldtest(event) {

  /*
   * Function exportHandlerFoldtest
   * Export handler for the foldtest module
   */

  var charts = [
    $("#foldtest-geographic-container").highcharts(),
    $("#foldtest-tectonic-container").highcharts(),
    $("#foldtest-full-container").highcharts()
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  Highcharts.exportCharts({
    "id": "foldtest",
    "charts": charts
  }, {
    "type": getMime(event.target.id)
  });

}

function exportHandlerBootstrap(event) {

  /*
   * Function exportHandlerShallowing
   * Export handler for the CTMD module
   */

  var charts = [
    $("#ctmd-container-x").highcharts(),
    $("#ctmd-container-y").highcharts(),
    $("#ctmd-container-z").highcharts()
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  Highcharts.exportCharts({
    "id": "coordinate-bootstrap",
    "charts": charts
  }, {
    "type": getMime(event.target.id)
  });

}


function exportMeanCSV() {

  const PRECISION = 2;

  var selectedCollections = getSelectedCollections();
  var statisticsRows = new Array(new Array("collection", "N", "Ns", "Cutoff", "S", "Dec", "Inc", "R", "k", "a95", "K", "A95", "A95Min", "A95Max", "ΔDx", "ΔIx", "λ").join(","));

  if(selectedCollections.length === 0) {
    return notify("failure", "No collections are selected for exporting.");
  }

  selectedCollections.forEach(function(site) {

    var cutofC = doCutoff(site.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);

    // Check if a polarity switch is requested
    if(statistics.dir.mean.inc < 0 && document.getElementById("polarity-selection").value === "NORMAL") {
      statistics.dir.mean.inc = -statistics.dir.mean.inc;
      statistics.dir.mean.dec = (statistics.dir.mean.dec + 180) % 360;
    }
    if(statistics.dir.mean.inc > 0 && document.getElementById("polarity-selection").value === "REVERSED") {
      statistics.dir.mean.inc = -statistics.dir.mean.inc;
      statistics.dir.mean.dec = (statistics.dir.mean.dec + 180) % 360;
    }

    statisticsRows.push([
      site.name,
      cutofC.components.filter(x => !x.rejected).length,
      cutofC.components.length,
      cutofC.cutoff.toFixed(PRECISION),
      cutofC.scatter.toFixed(PRECISION),
      statistics.dir.mean.dec.toFixed(PRECISION),
      statistics.dir.mean.inc.toFixed(PRECISION),
      statistics.dir.R.toFixed(PRECISION),
      statistics.dir.dispersion.toFixed(PRECISION),
      statistics.dir.confidence.toFixed(PRECISION),
      statistics.pole.dispersion.toFixed(PRECISION),
      statistics.pole.confidence.toFixed(PRECISION),
      statistics.pole.confidenceMin.toFixed(PRECISION),
      statistics.pole.confidenceMax.toFixed(PRECISION),
      statistics.butler.dDx.toFixed(PRECISION),
      statistics.butler.dIx.toFixed(PRECISION),
      statistics.dir.lambda.toFixed(PRECISION)
    ].join(","));

  });

  downloadAsCSV("collection-means", statisticsRows.join("\n"));

}

function exportHandlerShallowing(event) {

  /*
   * Function exportHandlerShallowing
   * Export handler EI shallowing module
   */

  var charts = [
    $("#ei-bootstrap-container").highcharts(),
    $("#ei-cdf-container").highcharts()
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  Highcharts.exportCharts({
    "id": "shallowing",
    "charts": charts
  }, {
    "type": getMime(event.target.id)
  });

}

function exportHandler(event) {

  /*
   * Function exportHandler
   * Export handler for geomagnetic directions & poles
   */

  var charts = [
    $("#direction-container").highcharts(),
    $("#pole-container").highcharts()
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  Highcharts.exportCharts({
    "id": "geomagnetic-directions",
    "charts": charts
  }, {
    "type": getMime(event.target.id)
  });

}

document.getElementById("export-png").addEventListener("click", exportHandler);
document.getElementById("export-pdf").addEventListener("click", exportHandler);
document.getElementById("export-svg").addEventListener("click", exportHandler);

document.getElementById("export-bootstrap-png").addEventListener("click", exportHandlerBootstrap);
document.getElementById("export-bootstrap-pdf").addEventListener("click", exportHandlerBootstrap);
document.getElementById("export-bootstrap-svg").addEventListener("click", exportHandlerBootstrap);

document.getElementById("export-foldtest-png").addEventListener("click", exportHandlerFoldtest);
document.getElementById("export-foldtest-pdf").addEventListener("click", exportHandlerFoldtest);
document.getElementById("export-foldtest-svg").addEventListener("click", exportHandlerFoldtest);

document.getElementById("export-shallowing-png").addEventListener("click", exportHandlerShallowing);
document.getElementById("export-shallowing-pdf").addEventListener("click", exportHandlerShallowing);
document.getElementById("export-shallowing-svg").addEventListener("click", exportHandlerShallowing);

function getMime(type) {

  /*
   * Function getMime
   * Returns appropriate mime type
   */

  switch(type) {
    case "export-svg":
      return "image/svg+xml";
    case "export-pdf":
      return "application/pdf";
    case "export-png":
      return "image/png";
  }

}
