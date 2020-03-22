(function(Highcharts) {

  // Local export
  Highcharts.wrap(Highcharts.Chart.prototype, "exportChartLocal", function (proceed, options) {
    if(options && options.type === "application/pdf") {
      this.exportChart(options);
    } else {
      proceed.call(this, options);
    }
  });

  /*
   * Highcharts closure
   * Modifies some Highcharts settings
   */

  // Highcharts patching
  Highcharts.seriesTypes.line.prototype.requireSorting = false;

  // Marker functions to add 10° markers to equal area projections
  Highcharts.SVGRenderer.prototype.symbols.vertLine = function (x, y, w, h) {
    return new Array("M", x + 0.5 * w, y + h, "L", x + 0.5 * w, y - 0.25 * h);
  };

  Highcharts.SVGRenderer.prototype.symbols.horLine = function (x, y, w, h) {
    return new Array("M", x + 1.25 * w, y + 0.5 * h, "L", x - 0.25 * w, y + 0.5 * h);
  };

  if(Highcharts.VMLRenderer) {
    Highcharts.VMLRenderer.prototype.symbols.vertLine = Highcharts.SVGRenderer.prototype.symbols.vertLine;
    Highcharts.VMLRenderer.prototype.symbols.horLine = Highcharts.SVGRenderer.prototype.symbols.horLine;
  }

  // SVG combined exporting
  Highcharts.exportCharts = function(charts, options) {
    options = Highcharts.merge(Highcharts.getOptions().exporting, options);
    Highcharts.getSVG(charts, options, function(svg) {
      Highcharts.downloadSVGLocal(svg, options, function() { 
        notify("danger", "Failured to export figure.");
      });
    });
  }

  // Add CSV export button
  Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
    "text": "Download CSV File",
    "onclick": function() {
      if(!this.userOptions.exporting.hasOwnProperty("getCSV")) { 
        return notify("danger", "CSV exporting for this graph is not implemented.");
      }
      this.userOptions.exporting.getCSV();
    }
  });
  
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
        case "zijderveld-container":
        case "declination-container":
        case "magstrat-container-declination":
        case "hemispherePlot":
          return {"width": 0, "top": 0}
        case "foldtest-tectonic-container":
        case "pole-container":
        case "hemisphere-container":
        case "magstrat-container-inclination":
        case "pole-container":
        case "hemispherePlot2":
          return {"width": 600, "top": 0}
        case "foldtest-full-container":
        case "ei-cdf-container":
        case "intensity-container":
        case "inclination-container":
          return {"width": 0, "top": 600}
        case "ctmd-container-y":
        case "magstrat-container-binary":
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
        case "interpretation":
          return {"top": 1200, "width": 1200}
        case "predicted":
          return {"top": 1800, "width": 1200}
        case "magstrat":
          return {"top": 800, "width": 1000}
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


function exportChartsWrapper(id, charts, type) {

  /*
   * Function exportChartsWrapper
   * Wrapping function for calling Highcharts exporting
   */

  Highcharts.exportCharts({id, charts}, {"type": getMime(type)});

}
