function exportFoldtest(event) {
    var typeBootstrap = document.getElementById("select-foldtest").value

    switch (typeBootstrap) {
        case 'classical':
            exportHandlerFoldtest(event, typeBootstrap)
            break;
        case 'inclination-only':
            exportHandlerFoldtestIO(event)
            break;
        case 'both':
            exportHandlerFoldtest(event, typeBootstrap)
            break;
    }
}

function exportHandlerFoldtest(event, typeBootstrap) {
    /*
     * Function exportHandlerFoldtest
     * Export handler for the foldtest module
     */

    var charts = [
        $("#foldtest-geographic-container").highcharts(),
        $("#foldtest-tectonic-container").highcharts(),
        $("#foldtest-full-container").highcharts()
    ]

    if (typeBootstrap === "both") {
        charts.push($("#foldtest-io-full-container").highcharts())
    }

    console.log('CHARTS', charts)

    if (charts.includes(undefined)) {
        return notify("danger", "Could not export unrendered charts.")
    }

    exportChartsWrapper("foldtest", charts, event.target.id)

}

function exportHandlerFoldtestIO(event) {
    /*
     * Function exportHandlerInclinationOnlyFoldtest
     * Export handler for the foldtest-io module
     */

    var charts = []
    charts.push(
        $("#foldtest-geographic-container").highcharts(),
        $("#foldtest-tectonic-container").highcharts(),
        $("#foldtest-io-full-container").highcharts()
    )

    if (charts.includes(undefined)) {
        return notify("danger", "Could not export unrendered charts.")
    }

    exportChartsWrapper("foldtest-io", charts, event.target.id)

}

function exportHandlerBootstrap(event) {

  /*
   * Function exportHandlerShallowing
   * Export handler for the CTMD module
   */

    var charts = [
        $("#container-dot-chart").highcharts(),
        $("#container-histogram-1").highcharts(),
        $("#ctmd-container-x").highcharts(),
        $("#ctmd-container-y").highcharts(),
        $("#ctmd-container-z").highcharts()
    ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  exportChartsWrapper("coordinate-bootstrap", charts, event.target.id);

}

function exportMeanJSON() {

  /*
   * Function exportMeanJSON
   * Exports mean table in JSON format
   */

  const PRECISION = 2;

  var selectedCollections = getSelectedCollections();

  if(selectedCollections.length === 0) {
    return notify("failure", "No collections are selected for exporting.");
  }

  var statisticsRows = new Array();

  selectedCollections.forEach(function(site) {

    var cutofC = doCutoff(site.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);
    var averageLocation = getAverageLocation(site);

    var lat = null;
    var lng = null;
    var pLat = null;
    var pLon = null;

    if(averageLocation !== null) {

      lat = averageLocation.lat;
      lng = averageLocation.lng;

      var convertedComps = cutofC.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
        var site = new Site(x.longitude, x.latitude);
        return new Component(x, site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)).toCartesian());
      });

      var poleStatistics = getStatisticalParameters(convertedComps);
      pLon = poleStatistics.dir.mean.dec.toFixed(PRECISION);
      pLat = poleStatistics.dir.mean.inc.toFixed(PRECISION);

    }

    // Check if a polarity switch is requested
    statisticsRows.push({
      "collection": site.name,
      "latitude": lat,
      "longitude": lng,
      "numberComponentsUsed": Number(cutofC.components.filter(x => !x.rejected).length),
      "numberComponents": Number(cutofC.components.length),
      "cutoff": Number(cutofC.cutoff.toFixed(PRECISION)),
      "scatter": Number(cutofC.scatter.toFixed(PRECISION)),
      "declination": Number(statistics.dir.mean.dec.toFixed(PRECISION)),
      "inclination": Number(statistics.dir.mean.inc.toFixed(PRECISION)),
      "resultantlength": Number(statistics.dir.R.toFixed(PRECISION)),
      "dispersion": Number(statistics.dir.dispersion.toFixed(PRECISION)),
      "confidence": Number(statistics.dir.confidence.toFixed(PRECISION)),
      "dispersionpole": Number(statistics.pole.dispersion.toFixed(PRECISION)),
      "confidencepole": Number(statistics.pole.confidence.toFixed(PRECISION)),
      "confidencepolemin": Number(statistics.pole.confidenceMin.toFixed(PRECISION)),
      "confidencepolemax": Number(statistics.pole.confidenceMax.toFixed(PRECISION)),
      "declinationconfidence": Number(statistics.butler.dDx.toFixed(PRECISION)),
      "inclinationconfidence": Number(statistics.butler.dIx.toFixed(PRECISION)),
      "paleolatitude": Number(statistics.dir.lambda.toFixed(PRECISION)),
      "poleLatitude": Number(pLat),
      "poleLongitude": Number(pLon)
    });

  });

  downloadAsJSON("collection-means.json", statisticsRows);

}


function exportMeanCSV() {

  /*
   * Function exportmeanCSV
   * Exports the mean parameter table as a CSV
   */

  const PRECISION = 2;

  var selectedCollections = getSelectedCollections();

  if(selectedCollections.length === 0) {
    return notify("failure", "No collections are selected for exporting.");
  }

    // Add the header as the first row
    var statisticsRows = new Array(["Collection", "Latitude", "Longitude", "N", "Ns", "Cutoff", "S", "Dec", "Inc", "R", "k", "a95", "K", "A95", "A95Min", "A95Max", "ΔDx", "ΔIx", "λ", "Pole Lng", "Pole Lat"].join(","));

  selectedCollections.forEach(function(site) {

    var cutofC = doCutoff(site.components.map(x => x.inReferenceCoordinates()));
    var statistics = getStatisticalParameters(cutofC.components);
    var averageLocation = getAverageLocation(site);
    var lat = null;
    var lng = null;
    var pLat = null;
    var pLon = null;

    if(averageLocation !== null) {

      lat = averageLocation.lat;
      lng = averageLocation.lng;

      var convertedComps = cutofC.components.filter(x => x.latitude !== null && x.longitude !== null).map(function(x) {
        var site = new Site(x.longitude, x.latitude);
        return new Component(x, site.poleFrom(literalToCoordinates(x.coordinates).toVector(Direction)).toCartesian());
      });

      var poleStatistics = getStatisticalParameters(convertedComps);
      pLon = poleStatistics.dir.mean.dec.toFixed(PRECISION);
      pLat = poleStatistics.dir.mean.inc.toFixed(PRECISION);

    }

    statisticsRows.push([
      site.name,
      lat,
      lng,
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
      statistics.dir.lambda.toFixed(PRECISION),
      pLon,
      pLat
    ].join(","));

  });

  // Delegate to the downloader
  downloadAsCSV("collection-means.csv", statisticsRows.join("\n"));

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

  exportChartsWrapper("shallowing", charts, event.target.id);

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

  exportChartsWrapper("geomagnetic-directions", charts, event.target.id);

}

document.getElementById("export-png").addEventListener("click", exportHandler);
document.getElementById("export-pdf").addEventListener("click", exportHandler);
document.getElementById("export-svg").addEventListener("click", exportHandler);

document.getElementById("export-bootstrap-png").addEventListener("click", exportHandlerBootstrap);
document.getElementById("export-bootstrap-pdf").addEventListener("click", exportHandlerBootstrap);
document.getElementById("export-bootstrap-svg").addEventListener("click", exportHandlerBootstrap);

document.getElementById("export-foldtest-png").addEventListener("click", exportFoldtest);
document.getElementById("export-foldtest-pdf").addEventListener("click", exportFoldtest);
document.getElementById("export-foldtest-svg").addEventListener("click", exportFoldtest);

document.getElementById("export-shallowing-png").addEventListener("click", exportHandlerShallowing);
document.getElementById("export-shallowing-pdf").addEventListener("click", exportHandlerShallowing);
document.getElementById("export-shallowing-svg").addEventListener("click", exportHandlerShallowing);
