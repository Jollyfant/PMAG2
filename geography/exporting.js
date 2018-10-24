(function(Highcharts) {

  Highcharts.seriesTypes.line.prototype.requireSorting = false;
  Highcharts.exportCharts = function(charts, options) {
  
    options = Highcharts.merge(Highcharts.getOptions().exporting, options);
  
    Highcharts.getSVG(charts, options, function(svg) { 
        Highcharts.downloadSVGLocal(svg, options, function() { 
            notify("danger", "Failured to export figure.");
        });
    });
  
  };
  
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
        case "declination-container":
          return {"width": 0, "top": 0}
        case "foldtest-tectonic-container":
        case "pole-container":
          return {"width": 600, "top": 0}
        case "foldtest-full-container":
        case "ei-cdf-container":
        case "inclination-container":
          return {"width": 0, "top": 600}
        case "ctmd-container-y":
          return {"width": 400, "top": 0}
        case "ctmd-container-z":
          return {"width": 800, "top": 0}
        case "paleolatitude-container":
          return {"width": 0, "top": 1200}
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
        case "predicted":
          return {"top": 1800, "width": 1200}
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

function exportHandlerPredicted(event) {

  var charts = new Array(
    $("#declination-container").highcharts(),
    $("#inclination-container").highcharts(),
    $("#paleolatitude-container").highcharts()
  );

  if(charts.includes(undefined)) {
    return notify("danger", "Can not export charts. Not rendered");
  }

  Highcharts.exportCharts({
    "id": "predicted",
    "charts": charts
  }, {
    "type": getMime(event.target.id)
  });

}

document.getElementById("export-predicted-png").addEventListener("click", exportHandlerPredicted);
document.getElementById("export-predicted-pdf").addEventListener("click", exportHandlerPredicted);
document.getElementById("export-predicted-svg").addEventListener("click", exportHandlerPredicted);

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