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


function eqAreaProjection() {

  /* 
   * Function eqAreaProjection
   * Description: Handles plotting for equal area projection
   */

  const CHART_CONTAINER = "direction-container";
  const CHART_CONTAINER2 = "pole-container";

  var sites = getSelectedSites();
  var dataSeries = new Array();
  var dataSeriesPole = new Array();

  var fakeSite = new Site({"lng": 0, "lat": 0});

  sites.forEach(function(site) {

    site.components.forEach(function(component) {

      //Get the bedding and core parameters from the sample object
      var coreAzi = component.coreAzimuth;
      var coreDip = component.coreDip;
      var beddingStrike = component.beddingStrike;
      var beddingDip = component.beddingDip; 

      // Go over each step
      var direction = component.direction;

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
        "step": site.name,
        "marker": {
          "fillColor": (direction.inc < 0 ? HIGHCHARTS_WHITE : color),
          "lineWidth": 1,
          "lineColor": color
        }
      });

      var pole = fakeSite.poleFrom(new Direction(direction.dec, direction.inc));

      // Simple rotation: subtract the 
      pole.lng = pole.lng - site.pole.mean.lng;
      pole = pole.toCartesian().rotateFrom(0, site.pole.mean.lat).toVector(Pole);
      pole.lng = pole.lng + site.pole.mean.lng;

      dataSeriesPole.push({
        "x": pole.lng, 
        "y": projectInclination(pole.lat), 
        "inc": pole.lat, 
        "step": site.name,
        "marker": {
          "fillColor": (pole.lat < 0 ? HIGHCHARTS_WHITE : color),
          "lineWidth": 1,
          "lineColor": color
        }
      });      

    });

  });

  eqAreaChart(CHART_CONTAINER, dataSeries);
  eqAreaChart(CHART_CONTAINER2, dataSeriesPole);

}

function eqAreaChart(container, dataSeries) {

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
      "text": "Geomagnetic Directions"
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
      "minorTickWidth": 1,
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
    "series": [{
      "name": "Directions",
      "id": "directions",
      "type": "scatter",
      "zIndex": 5,
      "color": HIGHCHARTS_BLUE,
      "data": dataSeries
    }],
  });

}