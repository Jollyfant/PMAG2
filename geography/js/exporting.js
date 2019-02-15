function exportHandlerMagstrat(event) {

  var charts = new Array(
    $("#magstrat-container-declination").highcharts(),
    $("#magstrat-container-binary").highcharts(),
    $("#magstrat-container-inclination").highcharts()
  );

  if(charts.includes(undefined)) {
    return notify("danger", "Can not export charts that are not rendered.");
  }

  exportChartsWrapper("magstrat", charts, event.target.id);

}

function exportHandlerPredicted(event) {

  var charts = new Array(
    $("#declination-container").highcharts(),
    $("#inclination-container").highcharts(),
    $("#paleolatitude-container").highcharts()
  );

  if(charts.includes(undefined)) {
    return notify("danger", "Can not export charts that are not rendered.");
  }

  exportChartsWrapper("predicted", charts, event.target.id);

}

document.getElementById("export-predicted-png").addEventListener("click", exportHandlerPredicted);
document.getElementById("export-predicted-pdf").addEventListener("click", exportHandlerPredicted);
document.getElementById("export-predicted-svg").addEventListener("click", exportHandlerPredicted);

document.getElementById("export-magstrat-png").addEventListener("click", exportHandlerMagstrat);
document.getElementById("export-magstrat-pdf").addEventListener("click", exportHandlerMagstrat);
document.getElementById("export-magstrat-svg").addEventListener("click", exportHandlerMagstrat);
