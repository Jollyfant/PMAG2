function exportHandler(event) {

  /*
   * Function exportHandler
   * Export handler for geomagnetic directions & poles
   */

  var charts = [
    $("#zijderveld-container").highcharts(),
    $("#hemisphere-container").highcharts(),
    $("#intensity-container").highcharts(),
  ];

  if(charts.includes(undefined)) {
    return notify("danger", "Could not export unrendered charts.");
  }

  exportChartsWrapper("interpretation", charts, event.target.id);

}

document.getElementById("export-png").addEventListener("click", exportHandler);
document.getElementById("export-pdf").addEventListener("click", exportHandler);
document.getElementById("export-svg").addEventListener("click", exportHandler);