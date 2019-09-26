isRunning = false;

const progressBarElement = $("#ntr-progress");
 
 //Fire on DOM ready
document.getElementById("initializeNTR").addEventListener("click", runNTR);
document.getElementById("iterationButton").addEventListener("click", runNTR);

function runNTR() {
	
  // Application is already running
  if(isRunning) {
    return notify("danger", "NTR Analysis is already running.");
  }
        	
  // Get known information from the GUI
  var referencePole = new Direction(
    Number(document.getElementById("refPoleDec").value),
    Number(document.getElementById("refPoleInc").value)
  ).toCartesian();

  var magnetizationVector = new Direction(
    Number(document.getElementById("magDec").value),
    Number(document.getElementById("magInc").value)
  ).toCartesian();

  var dykePole = new Direction(
    Number(document.getElementById("dykeDec").value),
    Number(document.getElementById("dykeInc").value)
  ).toCartesian();

  // Do it once, or do iteration
  if(this.id === "initializeNTR") {
    results = makeAnalysis({ referencePole, magnetizationVector, dykePole });
    updateTable(results);
    $("#interationDiv").show();
  } else if (this.id === "iterationButton") {
    iterateNTR(referencePole, magnetizationVector, dykePole);
  }

}

/* FUNCTION ellipseEndpoints
 * Description: finds maximum/maximum endpoints on ellipse for calculation of confidence interval
 *            : function has been condensed (see fn ellipseData for comments)
 */
function ellipseEndpoints(direction, dDx, dIx) {
 
  return getPlaneData(direction, dDx, dIx, 5).slice(0, -1);

}

var ellipseDataZero = function(referencePole, beta) {
		
  /*
   * Function ellipseDataZero
   * Finds two points on ellipse with smallest inclination
   */

  // Draw an ellipse
  var data = getPlaneData(referencePole.toVector(Direction), beta);

  // Get all points
  var incs = data.map(function(x, i) {
    return {
      "dec": x.x,
      "inc": Math.abs(x.inc),
      "index": i
    }
  })

  // Sort by inclination: get the lowest two and then sort by declination to be consistent
  incs.sort((a, b) => a.inc - b.inc);
  incs = incs.slice(0, 2);
  incs.sort((a, b) => a.dec - b.dec);
  
  return {
   "one": new Direction(data[incs[0].index].x, data[incs[0].index].inc).toCartesian(),
   "two": new Direction(data[incs[1].index].x, data[incs[1].index].inc).toCartesian()
  }
	
}

function getIntersection(cart1, cart2) {
	
  /*
   * Function getIntersection
   * Finds the line of intersection between two planes through cross product
   */

  // Get the cross product of the two vectors (unit)
  return cart1.cross(cart2).unit();
	
}

function PermNTRAnalysis(iterationPermutations, callback) {
	
  /*
   * Function NTRAnalysis
   * Calculates rotation parameters to bring observed magnetization vector to
   * reference direction and dyke pole to horizontal
   */

  var results = new Array();
  var i = 0;

  // Asynchronous implementation of iterations
  (function timed() {
	
    // Update the progress bar
    progressBarElement.css("width", 100 * (i++ / iterationPermutations.length) + "%");

    // No more permutations
    if(iterationPermutations.length === 0) {
      return callback(results);
    }

    var permutation = iterationPermutations.pop();

    results.push(makeAnalysis(permutation));

    setTimeout(timed);

  })();

}

function makeAnalysis(permutation) {

  // Obtain angle beta between dyke pole and site magnetization vector (ChRM)
  // This angle should remain constant
  var beta = permutation.dykePole.angle(permutation.magnetizationVector);

  // Beta cannot go over 90; if so, we flip the dykePole too
  if(beta > 90) {

    beta = 180 - beta;

    permutation.dykePole = permutation.dykePole.reflect();

    notify("warning", "Beta exceeds 90 degrees: dyke pole has been flipped.");

  }
      	
  // Numerically iterate over same small circle to find positions closest to horizontal
  // I cannot think of a proper analytical implementation - suggestions?
  var intercept = ellipseDataZero(permutation.referencePole, beta);
      			
  // Get bisector plane for the following vector pairs:
  // 1. magnetizationVector - referencePole
  // 2. dykePole - iCept1
  // 3. dykePole - iCept2
  // Bisecting Vector (add) is the pole of the plane: we need the plane so subtract
  var k = permutation.magnetizationVector.subtract(permutation.referencePole);
  var l = permutation.dykePole.subtract(intercept.one);
  var m = permutation.dykePole.subtract(intercept.two);

  // Now we want to find the two intersections of the three bisectors
  // 1. Intersection between magnetizationVector - referencePole and dykePole - iCept1
  // 2. Intersection between magnetizationVector - referencePole and dykePole - iCept2
  // These are interceps 1 and 2 and represent the two rotation axes of our solutions
  var intersectionOne = getIntersection(k, l);
  var intersectionTwo = getIntersection(k, m);
      	
  // I believe the convention is to make rotation poles positive
  if(intersectionOne.z < 0) {
    intersectionOne = intersectionOne.reflect();
  }
  if(intersectionTwo.z < 0) {
    intersectionTwo = intersectionTwo.reflect();
  }
      	
  // Find the vectors perpendicular to the rotation axes and compare the angle
  // The angle of rotation is equal to the angle between the cross products of the vectors
  // Calculate cross product between m1 and m2 to find sense of rotation (positive is CCW; negative is CW)
  var m1 = getIntersection(intersectionOne, permutation.magnetizationVector);
  var m2 = getIntersection(intersectionOne, permutation.referencePole);
  var angle1 = m1.angle(m2);
  var type1 = (getIntersection(m1, m2).z < 0 ? "CW" : "CCW");
      	
  // Repeat procedure for second intersection
  var m1 = getIntersection(intersectionTwo, permutation.magnetizationVector);
  var m2 = getIntersection(intersectionTwo, permutation.referencePole);
  var angle2 = m1.angle(m2);
  var type2 = (getIntersection(m1, m2).z < 0 ? "CW" : "CCW");

  return {
    "referencePole": permutation.referencePole.toVector(Direction),
    "magnetizationVector": permutation.magnetizationVector.toVector(Direction),
    "dykePole": permutation.dykePole.toVector(Direction),
    "intersectionVectorOne": intersectionOne.toVector(Direction),
    "intersectionVectorTwo": intersectionTwo.toVector(Direction),
    "interceptVectorOne": intercept.one.toVector(Direction),
    "interceptVectorTwo": intercept.two.toVector(Direction),
    "typeOne": type1,
    "typeTwo": type2,
    "angleOne": angle1,
    "angleTwo": angle2,
    "anglePlaneOne": k.angle(l),
    "anglePlaneTwo": k.angle(m),
    "k": k,
    "l": l,
    "m": m,
    "beta": beta
  }

}

function updateTable(values) {

  document.getElementById("NTRInputTable").innerHTML = [
    "<table class='table table-striped text-center'>",
    "  <thead>",
    "    <tr>",
    "      <th>Reference Vector </th>",
    "      <th>Site Vector </th>",
    "      <th>Pole to Dyke </th>",
    "       <th>β </th>",
    "     </tr>",
    "   </thead>",
    "   <tbody>",
    "     <tr>",
    "       <td>",
    "        <b>Declination </b>" + values.referencePole.dec.toFixed(1),
    "        <br><b>Inclination </b>" + values.referencePole.inc.toFixed(1),
    "      </td>",
    "      <td>",
    "        <b>Declination </b>" + values.magnetizationVector.dec.toFixed(1),
    "        <br><b>Inclination </b>" + values.magnetizationVector.inc.toFixed(1),
    "      </td>",
    "      <td>",
    "        <b>Declination </b>" + values.dykePole.dec.toFixed(1),
    "        <br><b>Inclination </b>" + values.dykePole.inc.toFixed(1),
    "      </td>",
    "      <td>" + values.beta.toFixed(1) + "</td>",
    "    </tr>",
    "  </tbody>",
    "</table>"
  ].join("");

  document.getElementById("NTRSolutionTable").innerHTML = [
    "<table class='table table-striped text-center'>",
    "  <thead>",
    "    <tr>",
    "      <th>Solution 1 - Rotation Pole </th>",
    "      <th>Solution 2 - Rotation Pole </th>",
    "    </tr>",
    "  </thead>",
    "  <tbody>",
    "    <tr>",
    "      <td>",
    "        <br><b>Declination</b> " + values.intersectionVectorOne.dec.toFixed(1),
    "        <br><b>Inclination</b> " + values.intersectionVectorOne.inc.toFixed(1),
    "        <br><b>Angle of Rotation</b> " + values.angleOne.toFixed(1),
    "        <br><b>Sense of Rotation</b> " + values.typeOne,
    "        <br><b>Angle Between Planes</b> " + values.anglePlaneOne.toFixed(1),
    "        <hr><b>Initial Dyke Strike</b> " + ((values.interceptVectorOne.dec + 90) % 360).toFixed(1),
    "        <br><b>Initial Dyke Dip </b> " + (90 - values.interceptVectorOne.inc).toFixed(1),
    "      </td>",
    "      <td>",
    "        <br><b>Declination</b> " + values.intersectionVectorTwo.dec.toFixed(1),
    "        <br><b>Inclination</b> " + values.intersectionVectorTwo.inc.toFixed(1),
    "        <br><b>Angle of Rotation</b> " + values.angleTwo.toFixed(1),
    "        <br><b>Sense of Rotation</b> " + values.typeTwo,
    "        <br><b>Angle Between Planes</b> " + values.anglePlaneTwo.toFixed(1),
    "        <hr><b>Initial Dyke Strike</b> " + ((values.interceptVectorTwo.dec + 90) % 360).toFixed(1),
    "        <br><b>Initial Dyke Dip</b> " + (90 - values.interceptVectorTwo.inc).toFixed(1),
    "      </td>",
    "    </tr>",
    "  </tbody>",
    "</table>"
  ].join("");

  document.getElementById("NTRInputTable").style.display = "block";
  document.getElementById("NTRSolutionTable").style.display = "block";

  plotNTRData(values);

}

function getRodrigues(coordinates, angle, type) {

  // Rodrigues" rotation formula (https://en.wikipedia.org/wiki/Rodrigues"_rotation_formula)
  // To calculate point after rotation around axis.
  var vVector = new Coordinates(0, 0, 1);
  var kVector = coordinates.toCartesian();

  var crossProd = kVector.cross(vVector);
  var dot = kVector.dot(vVector);
  
  var theta = (type === "CCW" ? angle : -angle);
  
  var vRotated = new Coordinates(
    vVector.x * Math.cos(theta * RADIANS) + crossProd.x * Math.sin(theta * RADIANS) + kVector.x * dot * (1 - Math.cos(theta * RADIANS)),
    vVector.y * Math.cos(theta * RADIANS) + crossProd.y * Math.sin(theta * RADIANS) + kVector.y * dot * (1 - Math.cos(theta * RADIANS)),
    vVector.z * Math.cos(theta * RADIANS) + crossProd.z * Math.sin(theta * RADIANS) + kVector.z * dot * (1 - Math.cos(theta * RADIANS))
  );
  
  return getPlaneData(vRotated.toVector(Direction), 90);

}

function plotNTRData(values) {

  var container = "initialPlot";

  // Do the proper positive/negative color scheme for vectors
  var dykeColor = values.dykePole.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREY;
  var referenceColor = values.referencePole.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_RED;
  var chrmColor = values.magnetizationVector.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_ORANGE;
    		
  // Construct plotSeries
  // Be warned these are many
  plotSeries = new Array();

  // Draw a small circle around the reference pole with angle beta
  betaCircle = flipEllipse(values.referencePole.inc, getPlaneData(values.referencePole, values.beta));

  // Get the bisecting planes
  var kPlane = getPlaneData(values.k.toVector(Direction), 90);
  var lPlane = getPlaneData(values.l.toVector(Direction), 90);
  var mPlane = getPlaneData(values.m.toVector(Direction), 90);
    
  var beddingDataOne = getRodrigues(values.intersectionVectorOne, values.angleOne, values.typeOne);
  var beddingDataTwo = getRodrigues(values.intersectionVectorTwo, values.angleTwo, values.typeTwo);

  // If we do not wish to iterate, show the appropriate bisectors/intersections for the actual specified directions
  plotSeries.push({
    "name": "Reference Pole",
    "zIndex": 10,
    "type": "scatter",
    "data": [{
      "x": values.referencePole.dec,
      "y": projectInclination(values.referencePole.inc),
      "inc": values.referencePole.inc
    }],
    "marker": {
      "symbol": "diamond",
      "radius": 8,
      "fillColor": referenceColor,
      "lineWidth": 1,
      "lineColor": HIGHCHARTS_RED
    }
  }, {
    "name": "Magnetization Vector",
    "type": "scatter",
    "zIndex": 10,
    "data": [{
      "x": values.magnetizationVector.dec,
      "y": projectInclination(values.magnetizationVector.inc),
      "inc": values.magnetizationVector.inc
     }],
    "marker": {
      "symbol": "circle",
      "radius": 6,
      "fillColor": chrmColor,
      "lineColor": HIGHCHARTS_ORANGE,
      "lineWidth": 1,
    }
  }, {
    "name": "Pole to Dyke",
    "type": "scatter",
    "zIndex": 10,
    "data": [{
      "x": values.dykePole.dec,
      "y": projectInclination(values.dykePole.inc),
      "inc": values.dykePole.inc
    }],
    "marker": {
      "symbol": "circle",
      "radius": 6,
      "fillColor": dykeColor,
      "lineColor": "grey",
      "lineWidth": 1,
    }
  }, {
    "name": "Beta",
    "type": "line",
    "turboThreshold": 0,
    "data": betaCircle,
    "color": "grey",
    "dashStyle": "ShortDash",
    "enableMouseTracking": false,
    "lineWidth": 1,
    "marker": {
      "enabled": false	
    }
  }, {
    "name": "Intersections (Numerical Estimate)",
    "type": "scatter",
    "color": HIGHCHARTS_YELLOW,
    "marker": {
      "symbol": "circle",
      "radius": 6,
    },
    "data": [{
      "x": values.interceptVectorOne.dec,
      "y": projectInclination(values.interceptVectorOne.inc),
      "inc": values.interceptVectorOne.inc
    }, {
      "x": values.interceptVectorTwo.dec,
      "y": projectInclination(values.interceptVectorTwo.inc),
      "inc": values.interceptVectorTwo.inc
    }]
  }, {
    "name": "Bisector (Site Pole - Reference Direction)",
    "type": "line",
    "color": "red",
    "lineWidth": 1,
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    },
    "data": kPlane.positive
  }, {
    "name": "Bisector (Site Pole - Reference Direction)",
    "type": "line",
    "linkedTo": ":previous",
    "color": "red",
    "dashStyle": "ShortDash",
    "enableMouseTracking": false,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    },
    "data": kPlane.negative
  }, {
    "name": "Bisector (Solution 1 - Dyke Pole)",
    "type": "line",
    "enableMouseTracking": false,
    "color": "blue",
    "lineWidth": 1,
    "marker": {
      "enabled": false
    },
    "data": mPlane.positive
  }, {
    "type": "line",
    "linkedTo": ":previous",
    "color": "blue",
    "dashStyle": "ShortDash",
    "enableMouseTracking": false,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    },
    "data": mPlane.negative
  }, {
    "name": "Bisector (Solution 2 - Dyke Pole)",
    "type": "line",
    "color": "green",
    "enableMouseTracking": false,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    },
    "data": lPlane.positive
  }, {
    "name": "Bisector [#2 - Dyke Pole]",
    "type": "line",
    "color": "green",
    "dashStyle": "ShortDash",
    "lineWidth": 1,
    "linkedTo": ":previous",
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    },
    "data": lPlane.negative
  }, {
    "name": "Solution 1 - Rotation Pole",
    "color": HIGHCHARTS_GREEN,
    "type": "scatter",
    "data": [{
      "x": values.intersectionVectorOne.dec,
      "y": projectInclination(values.intersectionVectorOne.inc),
      "inc": values.intersectionVectorOne.inc
    }],
    "marker": {
      "symbol": "circle",
      "radius": 6
    }
  }, {
    "name": "Solution 2 - Rotation Pole",
    "type": "scatter",
    "color": HIGHCHARTS_BLUE,
    "data": [{
      "x": values.intersectionVectorTwo.dec,
      "y": projectInclination(values.intersectionVectorTwo.inc),
      "inc": values.intersectionVectorTwo.inc
    }],
    "marker": {
      "symbol": "circle",
      "radius": 6
    }
  }, {
    "name": "Solution 1 - Rotated Horizontal Bedding",
    "type": "line",
    "visible": false,
    "color": HIGHCHARTS_PINK,
    "dashStyle": "ShortDash",
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    },
    "data": beddingDataOne.positive
  }, {
    "name": "Solution 2 - Rotated Horizontal Bedding",
    "type": "line",
    "visible": false,
    "color": "orange",
    "dashStyle": "ShortDash",
    "enableMouseTracking": false,
    "marker": {
      "enabled": false
    },
    "data": beddingDataTwo.positive
  });

  drawGraph(plotSeries, container);

  document.getElementById("interationDiv").style.display = "block";

}
  
function iterateNTR(referencePole, magnetizationVector, dykePole) {

  /*
   * Function iterateNTR
   * Iterate NTR over confidence interval
   */

  // Get the confidence bounds
  var referencePoleInc95 = Number(document.getElementById("confRef").value);
  var magnetizationVectorDec95 = Number(document.getElementById("confMagDec").value);
  var magnetizationVectorInc95 = Number(document.getElementById("confMagInc").value);
  var dykePole95 = Number(document.getElementById("confDyke").value);

  var referencePoleEndPoints = ellipseEndpoints(referencePole.toVector(Direction), 0, referencePoleInc95);
  referencePoleEndPoints.splice(3, 1);
  referencePoleEndPoints.splice(1, 1);
  var referencePoleEllipse = getPlaneData(referencePole.toVector(Direction), 0, referencePoleInc95);
  referencePoleEndPoints.push(referencePole.toVector(Direction).highchartsData());

  var magnetizationVectorEndPoints = ellipseEndpoints(magnetizationVector.toVector(Direction), magnetizationVectorDec95, magnetizationVectorInc95);
  var magnetizationVectorEllipse = getPlaneData(magnetizationVector.toVector(Direction), magnetizationVectorDec95, magnetizationVectorInc95);
  magnetizationVectorEndPoints.push(magnetizationVector.toVector(Direction).highchartsData());

  var dykePoleEndPoints = ellipseEndpoints(dykePole.toVector(Direction), dykePole95, dykePole95);
  dykePoleEndPoints.push(dykePole.toVector(Direction).highchartsData());
  var dykePoleEllipse = getPlaneData(dykePole.toVector(Direction), dykePole95);

  let iterationPermutations = new Array();

  // Calculate 75 different iterations for points on confidence envelopes
  for(var i = 0; i < referencePoleEndPoints.length; i++) {
    for(var j = 0; j < magnetizationVectorEndPoints.length; j++) {
      for(var k = 0; k < dykePoleEndPoints.length; k++) {
        iterationPermutations.push({
          "referencePole": new Direction(referencePoleEndPoints[i].x, referencePoleEndPoints[i].inc).toCartesian(),
          "magnetizationVector": new Direction(magnetizationVectorEndPoints[j].x, magnetizationVectorEndPoints[j].inc).toCartesian(),
          "dykePole": new Direction(dykePoleEndPoints[k].x, dykePoleEndPoints[k].inc).toCartesian()
        });
      }
    }
  }

  values = {
    "referencePole": referencePole.toVector(Direction),
    "referencePoleEndPoints": referencePoleEndPoints,
    "referencePoleEllipse": referencePoleEllipse,
    "magnetizationVector": magnetizationVector.toVector(Direction),
    "magnetizationVectorEndPoints": magnetizationVectorEndPoints,
    "magnetizationVectorEllipse": magnetizationVectorEllipse,
    "dykePole": dykePole.toVector(Direction),
    "dykePoleEndPoints": dykePoleEndPoints,
    "dykePoleEllipse": dykePoleEllipse 
  }
 
  // Do the analysis for every interval
  PermNTRAnalysis(iterationPermutations, function(results) {
    finish(results, values);
  });

}

function finish(results, values) {

  var plotSeries = new Array();

  var intersectionArray1 = new Array();
  var intersectionArray2 = new Array();
  var dataOne = new Array();
  var dataTwo = new Array();

  // Do the proper positive/negative color scheme for vectors
  var dykeColor = values.dykePole.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREY;
  var referenceColor = values.referencePole.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_RED;
  var chrmColor = values.magnetizationVector.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_ORANGE;

  results.forEach(function(x) {

    intersectionArray1.push({
      "x": x.intersectionVectorOne.dec,
      "y": projectInclination(x.intersectionVectorOne.inc),
      "inc": x.intersectionVectorOne.inc,
      "rotation": x.angleOne,
      "rotationSense": x.typeOne,
      "dykeStrike": ((x.interceptVectorOne.dec + 90) % 360).toFixed(1),
      "dykeDip": (90 - x.interceptVectorOne.inc).toFixed(1)
    });

    intersectionArray2.push({
      "x": x.intersectionVectorTwo.dec,
      "y": projectInclination(x.intersectionVectorTwo.inc),
      "inc": x.intersectionVectorTwo.inc,
      "rotation": x.angleTwo,
      "rotationSense": x.typeTwo,
      "dykeStrike": ((x.interceptVectorTwo.dec + 90) % 360).toFixed(1),
      "dykeDip": (90 - x.interceptVectorTwo.inc).toFixed(1)
    });

    dataOne.push(Number((x.interceptVectorOne.dec) % 360));
    dataTwo.push(Number((x.interceptVectorTwo.dec) % 360));

  });

  // If the user wishes to iterate over the confidence intervals, show these intervals on the graph
  plotSeries.push({
    "name": "Magnetization Vector Interval",
    "type": "line",
    "id": "a95MagPole",
    "enableMouseTracking": false,
    "data": values.magnetizationVectorEllipse,
    "lineWidth": 1,
    "color": HIGHCHARTS_ORANGE,
    "marker": {
      "enabled": false
    }	
  }, {
    "linkedTo": "a95MagPole",
    "type": "line",
    "enableMouseTracking": false,
    "color": HIGHCHARTS_ORANGE,
    "data": values.magnetizationVectorEllipse,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    }	
  }, {
    "type": "scatter",
    "linkedTo": "a95MagPole",
    "data": values.magnetizationVectorEndPoints,
    "color": HIGHCHARTS_ORANGE,
    "marker": {
      "symbol": "circle",
      "radius": 4,
    }
  }, {
    "name": "Dyke Pole Interval",
    "type": "line",
    "id": "a95DykePole",
    "enableMouseTracking": false,
    "data": values.dykePoleEllipse,
    "lineWidth": 1,
    "color": HIGHCHARTS_GREEN,
    "marker": {
      "enabled": false
    }	
  }, {
    "linkedTo": "a95DykePole",
    "type": "line",
    "color": HIGHCHARTS_GREY,
    "enableMouseTracking": false,
    "data": values.dykePoleEllipse,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    }
  }, {
    "type": "scatter",
    "linkedTo": "a95DykePole",
    "data": values.dykePoleEndPoints,
    "color": HIGHCHARTS_GREY,
    "marker": {
      "symbol": "circle",
      "radius": 4,
    }
  }, {
    "name": "Reference Pole Interval",
    "type": "line",
    "id": "a95ReferencePole",
    "enableMouseTracking": false,
    "data": values.referencePoleEllipse,
    "lineWidth": 1,
    "color": HIGHCHARTS_RED,
    "marker": {
      "enabled": false
    }	
  }, {
    "linkedTo": "a95ReferencePole",
    "type": "line",
    "enableMouseTracking": false,
    "data": values.referencePoleEllipse,
    "color": HIGHCHARTS_RED,
    "lineWidth": 1,
    "marker": {
      "enabled": false
    }	
  }, {
    "type": "scatter",
    "linkedTo": "a95ReferencePole",
    "data": values.referencePoleEndPoints,
    "color": HIGHCHARTS_RED,
    "marker": {
      "symbol": "circle",
      "radius": 4,
    }  
  }, {
    "name": "Solution 1 (Confidence Interval)",
    "type": "scatter",
    "color": HIGHCHARTS_GREEN,
    "data": intersectionArray1,
    "marker": {
      "symbol": "circle",
      "radius": 4,
    }
  }, {
    "name": "Solution 2 (Confidence Interval)",
    "type": "scatter",
    "color": HIGHCHARTS_BLUE,
    "data": intersectionArray2,
    "marker": {
      "symbol": "circle",
      "radius": 4,
    }
  })

  var container = "iterationPlot";

  // Call plotting series
  drawGraph(plotSeries, container);

  progressBarElement.css("width", 0 + "%");
  plotWindRose(dataOne, dataTwo, "windrosePlot");

  isRunning = false;

}

function getTickMarks(plotSeries) {

  /*
   * Function getTickMarks
   * Description: returns an array of tick marks for equal area proj
   */

  var tickMarkersV = new Array();
  var tickMarkersH = new Array();

  // Every ten degrees
  for(var i = 10; i < 90; i += 10) {
    var proj = projectInclination(i);
    tickMarkersV.push([270, proj], [90, proj]);
    tickMarkersH.push([0, proj], [180, proj]);
  }

  plotSeries.push({
    "data": tickMarkersH,
    "type": "scatter",
    "enableMouseTracking": false,
    "zIndex": 1,
    "showInLegend": false,
    "marker": {
      "symbol": "horLine",
      "lineWidth": 1,
      "lineColor": "lightgrey"
    }
  })

  plotSeries.push({
    "data": tickMarkersV,
    "type": "scatter",
    "enableMouseTracking": false,
    "zIndex": 1,
    "showInLegend": false,
    "marker": {
      "symbol": "vertLine",
      "lineWidth": 1,
      "lineColor": "lightgrey"
    }
  })

}

function drawGraph(plotSeries, container) {

  function tooltip() {

    if(this.series.name == "Solution 1 (Confidence Interval)" || this.series.name == "Solution 2 (Confidence Interval)") {
      return [
        "<b>Name:</b> " + this.series.name,
        "<b>Declatinion:</b> " + this.x.toFixed(1),
        "<b>Inclination:</b> " + this.point.inc.toFixed(1),
        "<b>Rotation:</b> " + this.point.rotation.toFixed(1) + " " + this.point.rotationSense,
        "<b>Initial Dyke Strike:</b> " + this.point.dykeStrike,
        "<b>Initial Dyke Dip:</b> " + this.point.dykeDip
      ].join("<br>");
    }

    return [
      "<b>Name:</b> " + this.series.name,
      "<b>Declatinion:</b> " + this.x.toFixed(1),
      "<b>Inclination:</b> " + this.point.inc.toFixed(1)
    ].join("<br>");

  }

  getTickMarks(plotSeries);

  // Specify chart options for equal area projection
  var chartOptions = {
    "chart": {
      "id": container,
      "polar": true,
      "animation": true,
      "renderTo": container, 
    },
    "legend": {
      "enabled": true
    },
    "title": {
      "text": "NTR Analysis",
    },
    "subtitle": {
      "text": container === "iterationPlot" ? "Collection of solutions for rotation poles " : "Solution for rotation poles (dotted planes are lower hemisphere)",
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
    "tooltip": {
      "formatter": tooltip, 
    },
    "exporting": { 
      "enabled": true,
      "filename": "NTR",
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        }
      }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org (NTR Analysis) - <i> after Allerton and Vine, 1987, Morris et al., 1998 </i>",
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
      "labels": {
        "formatter": function() {
          return this.value + "\u00B0"; //Add degree symbol to x-axis labels.
        }
      }
    },
    "plotOptions": {
      "series": {
        "animation": true,
      }
    },
    "series": plotSeries,
  };

  if(container !== "iterationPlot") {
    chartOptions.legend.align = "left";
    chartOptions.legend.verticalAlign = "middle";
    chartOptions.legend.layout = "right";
  }

  chartFoldLeft = new Highcharts.Chart(chartOptions); 

}

function plotWindRose(dataOne, dataTwo, container) {

  /*
   * Function plotWindRose
   * Code for the plotting of a wind rose and sorting of declination in bins of 10 degrees
   */ 

  var binSize = 5;
	
  function prepData(newDatArray) {
	
    // This algorithm sorts declinations in the newDatArray to bins of binSize degrees
    // Notice: 360 % binSize must be 0 
    var sortedArr = new Object();
    sortedArr["dump"] = 0;
    for(var i = 0; i < newDatArray.length; i++) {

      if(Math.round(newDatArray[i]) % 360 === 0) {
        return sortedArr["dump"] += 1;
      }

      // Round to the nearest bin degrees
      // If the bin already exists, increment by one, otherwise create the bin starting at 1
      var declination = Math.abs(Math.round(newDatArray[i] / binSize) * binSize) % 360;
      sortedArr[declination] ? sortedArr[declination] += 1 : sortedArr[declination] = 1;

    }
		
    // Define bucket for data to be used in the chart, and define a max variable to find the maximum declinations in any bin
    var dataList = new Array();
    var max = 0;

    // Go over all 36 bins in the 0 - 350 range
    for(var i = 0; i <= 360; i+= binSize) {
		
      // If we have declinations in the particular bin, put the y value to the sqrt of this number
      // (to prevent linear stretching if one bin becomes very large)
      // Otherwise, push a y value of 0, which will be added to the series but is invisible to the user
      // We need to do this, otherwise the rose chart does not always take bins of size 10 degrees
      if(sortedArr[i] !== undefined) {
        dataList.push({"x": i, y: Math.sqrt(sortedArr[i])});
      } else {
        dataList.push({"x": i, "y": 0});		
      }
			
      // Get the maximum value of declinations, this will be the maximum y-value for the chart as wells
      if(sortedArr[i] > max) {
        max = sortedArr[i];
      }
    }

    return {"data": dataList, "max": max}

  }

  var data1 = prepData(dataOne);
  var data2 = prepData(dataTwo);
	
  var max = data1.max;
	
  // Data series for the rose chart
  var dataSeries = [{
    "borderWidth": 1, 
    "borderColor": "grey",
    "color": HIGHCHARTS_BLUE,
    "zIndex": 100, 
    "name": "Solution 1 - Original Dyke Poles", 
    "data": data1.data
  }, {
    "borderWidth": 1, 
    "borderColor": "grey",  
    "color": HIGHCHARTS_GREEN,
    "zIndex": 100, 
    "name": "Solution 2 - Original Dyke Poles", 
    "data": data2.data
  }];

  // Parse the data from an inline table using the Highcharts Data plugin
  var chartOptions = {
    "chart": {
      "polar": true,
      "type": "column",
      "renderTo": container,
    },
    "legend": {
      "enabled": true,
    },
    "title": {
      "text": "Original Dyke Pole Density",
    },
    "subtitle": {
      "text": "Intersections of Beta with the horizontal (single solutions not shown)",
    },
    "xAxis": {
      "minorTickPosition": "outside",
      "type": "linear",
      "min": 0,
      "max": 360,
      "minorGridLineWidth": 0,
      "tickPositions": [0, 90, 180, 270, 360],
      "minorTickInterval": 10,
      "minorTickLength": 2,
      "minorTickWidth": 1,
      "labels": {
        "formatter": function () {
          return this.value + "\u00B0"; //Add degree symbol to x-axis labels.
        }
      }
    },
    "pane": {
      "startAngle": 0,
      "endAngle": 360
    },
    "exporting": {
      "buttons": {
        "contextButton": {
          "symbolStroke": "#7798BF",
          "align": "right"
        }
      }
    },
    "yAxis": {
      "min": 0,
      "tickPositions": [0, this.max],
      "endOnTick": false,
      "labels": {
        "enabled": false
      },
    },
    "tooltip": {
      "formatter": function () {
        return "<b> Cumulative Declination </b> <br><b>Declination Bin: </b>" + this.x + "<br><b>Number of Declinations: </b>" + Math.pow(this.y, 2).toFixed(1);
      }
    },
    "credits": {
      "enabled": ENABLE_CREDITS,
      "text": "Paleomagnetism.org (NTR Analysis) - <i> after Allerton and Vine, 1987, Morris et al., 1998 </i>",
      "href": ""
    },
    "plotOptions": {
      "series": {
        "stacking": "normal",
        "animation": false,
        "shadow": false,
        "groupPadding": 0,
        "pointPadding": 0,
        "pointPlacement": "on",
      },
      "column": {
        "colorByPoint": false
      }
    },
    "series": dataSeries,
  }

  new Highcharts.Chart(chartOptions);

  $("#windrosePlot").show().css("display", "inline-block");

}
