/* PALEOMAGNETISM.ORG 
 * 
 * NTR Analysis
 * Last Update: 7/17/2015
 * Description: calculates original dyke orientations based on site magnetization vector and reference magnetization vector
 */

isRunning = false;
 
 //Fire on DOM ready
$(function() {

  // Marker functions to add 10° markers to equal area projections
  Highcharts.SVGRenderer.prototype.symbols.vertLine = function (x, y, w, h) {
    return ['M', x + 0.5 * w, y + h, 'L', x + 0.5 * w, y - 0.25 * h];
  };

  Highcharts.SVGRenderer.prototype.symbols.horLine = function (x, y, w, h) {
    return ['M', x + 1.25 * w, y + 0.5 * h, 'L', x - 0.25 * w, y + 0.5 * h];
  };

  if(Highcharts.VMLRenderer) {
    Highcharts.VMLRenderer.prototype.symbols.vertLine = Highcharts.SVGRenderer.prototype.symbols.vertLine;
    Highcharts.VMLRenderer.prototype.symbols.horLine = Highcharts.SVGRenderer.prototype.symbols.horLine;
  }

  $("#initializeNTR, #iterationButton").button().click(function() {
	
    if(isRunning) {
      return notify("danger", "NTR Analysis is already running.");
    }
          	
    // Definition of known vectors
    // referencePole = Known Reference Pole
    // magnetizationVector = Site Remanent Magnetization Vector
    // dykePole = Pole to Dyke Orientation
    var referencePole = new Direction(
      Number(document.getElementById("refPoleDec").value),
      Number(document.getElementById("refPoleInc").value)
    );

    var magnetizationVector = new Direction(
      Number(document.getElementById("magDec").value),
      Number(document.getElementById("magInc").value)
    );

    var dykePole = new Direction(
      Number(document.getElementById("dykeDec").value),
      Number(document.getElementById("dykeInc").value)
    );
          
    isRunning = true;

    // Do it once, or do iteration
    if(this.id === "initializeNTR") {
      NTRAnalysis(referencePole, magnetizationVector, dykePole, false);
      $("#interationDiv").show();
    } else if (this.id === "iterationButton") {
      NTRAnalysis(referencePole, magnetizationVector, dykePole, true);
    }

  });
	

});

/* FUNCTION ellipseEndpoints
 * Description: finds maximum/maximum endpoints on ellipse for calculation of confidence interval
 *            : function has been condensed (see fn ellipseData for comments)
 */
function ellipseEndpoints(mDec, mInc, dDx, dIx, color) {
 
  var NTRApproach = !$('#NTRApproach').prop('checked');
  
  var dDx = dDx * RADIANS;
  var dIx = dIx * RADIANS;
  
  var incSign = (Math.abs(mInc)/mInc); // 1 or -1 depending on inclination polarity
  
  if(mInc == 0) {
  	incSign = 1;
  }
  
  var xDec = mDec;
  var xInc = mInc;
  var yDec = mDec;
  var yInc = (mInc-(incSign*90));
  var zDec = (mDec+90);
  var zInc = 0;
  discreteEllipsePoints = [];
  
  //Number of points; this time we want to find the 4 points evenly spaced around the mean vector
  //Therefore we take 0, 90, 180, and 270 degrees.
  // If dDx is set to 0 only take inclination pairs at 0 and 180.
  var nPoints = dDx === 0 ? [0, Math.PI] : [0, Math.PI/2, Math.PI, 3*Math.PI/2];
  
  //Same routine as usual (condensed)
  R = [[0,0,0],[0,0,0],[0,0,0]];
  var X = new Direction(xDec, xInc).toCartesian();
  if(X.z < 0) {
  	X.x = -X.x
  	X.y = -X.y
  	X.z = -X.z
  }
  R[0][0]=X.x;
  R[1][0]=X.y;
  R[2][0]=X.z;
  var Y = new Direction(yDec,yInc).toCartesian();
  if(Y.z < 0) {
  	Y.x = -Y.x
  	Y.y = -Y.y
  	Y.z = -Y.z
  }
  R[0][1]=Y.x;
  R[1][1]=Y.y;
  R[2][1]=Y.z;
  var Z = new Direction(zDec, zInc).toCartesian();
  if(Z.z < 0) {
  	Z.x = -Z.x
  	Z.y = -Z.y
  	Z.z = -Z.z
  }
  R[0][2]=Z.x;
  R[1][2]=Z.y;
  R[2][2]=Z.z;
  v = [0,0,0];
  
  for(i=0;i< nPoints.length;i++){
  	v[1] = Math.sin(dIx)*Math.cos(nPoints[i]);
  	v[2] = Math.sin(dDx)*Math.sin(nPoints[i]);
  	v[0] = Math.sqrt( 1 - Math.pow(v[1],2) - Math.pow(v[2],2) ); //resulting coordinate on unit-sphere.
  	eli = [0,0,0];
  	for(var j=0;j<3;j++){
  		for(var k=0;k<3;k++){ 
  			eli[j]=eli[j] + R[j][k]*v[k];
  		}
  	}
  	
  	var coords = new Coordinates(eli[0], eli[1], eli[2]).toVector(Direction);
  
  	if(incSign < 0) {
  		coords.dec = (180+coords.dec)%360;
  		coords.inc = -coords.inc;
  	}
  	
  	if(coords.inc < 0) {
  		var fillColor = 'white';
  	} else {
  		var fillColor = color;
  	}
  	
  	if(NTRApproach) {
  		discreteEllipsePoints.push({
  			x: coords.dec, 
  			y: projectInclination(coords.inc), 
  			inc: coords.inc, 
  			marker: { 
  				fillColor: fillColor,
  				lineWidth: 1,
  				lineColor: color,
  			}
  		});
  	}
  }
  
  if(!NTRApproach) {
  	discreteEllipsePoints.push({x: mDec+dDx / RADIANS, y: projectInclination(mInc), inc: mInc});
  	discreteEllipsePoints.push({x: mDec-dDx / RADIANS, y: projectInclination(mInc), inc: mInc});
  	discreteEllipsePoints.push({x: mDec, y: projectInclination(mInc+dIx / RADIANS), inc: mInc+dIx / RADIANS});
  	discreteEllipsePoints.push({x: mDec, y: projectInclination(mInc-dIx / RADIANS), inc: mInc-dIx / RADIANS});
  }	
  		
  return discreteEllipsePoints;
}

/* FUNCTION ellipseDataZero
 * Description: finds two points on an ellipse that are closest to inclination 01//EN
 *            : function has been condensed
 * Input: Mean vector and confidence envelope
 * Output: Object containing two vectors that represent intersections with the horizontal
 */
var ellipseDataZero = function(mDec, mInc, dDx, dIx) {
		
		var dDx = dDx * RADIANS;
		var dIx = dIx * RADIANS;
		
		var incSign = (Math.abs(mInc)/mInc); // 1 or -1 depending on inclination polarity
		
		if(mInc == 0) {
			incSign = 1;
		}
		
		var xDec = mDec
		var xInc = mInc
		var yDec = mDec
		var yInc = (mInc-(incSign*90))
		var zDec = (mDec+90)
		var zInc = 0

		discreteEllipsePoints = [];

		//Number of points, go for 10000 iterations
		//That should be sufficiently close to the horizontal
		var nPoints = 10000;
		var iPoint = (nPoints/2);

		R = [[0,0,0],[0,0,0],[0,0,0]];
		var X = new Direction(xDec, xInc).toCartesian(); //new z-coordinate
		
		if(X.z < 0) {
	
			X.x = -X.x
			X.y = -X.y
			X.z = -X.z
		}

		R[0][0]=X.x;
		R[1][0]=X.y;
		R[2][0]=X.z;
		var Y = new Direction(yDec,yInc).toCartesian(); //new y-coordinate
		if(Y.z < 0) {
			Y.x = -Y.x
			Y.y = -Y.y
			Y.z = -Y.z
		}
		R[0][1]=Y.x;
		R[1][1]=Y.y;
		R[2][1]=Y.z;
		var Z = new Direction(zDec, zInc).toCartesian(); //new x-coordinate
		 if(Z.z < 0) {
			Z.x = -Z.x
			Z.y = -Z.y
			Z.z = -Z.z
		}
		R[0][2]=Z.x;
		R[1][2]=Z.y;
		R[2][2]=Z.z;
		v = [0,0,0];
		for(i=0;i<nPoints;i++){
			psi = ((i)*Math.PI/iPoint);
			v[1] = Math.sin(dIx)*Math.cos(psi);
			v[2] = Math.sin(dDx)*Math.sin(psi);
			v[0] = Math.sqrt( 1 - Math.pow(v[1],2) - Math.pow(v[2],2) ); //resulting coordinate on unit-sphere.

			eli = [0,0,0];
			for(var j=0;j<3;j++){
				for(var k=0;k<3;k++){ 
					eli[j]=eli[j] + R[j][k]*v[k];
				}
			}
			var coords = new Coordinates(eli[0], eli[1], eli[2]).toVector(Direction);
			
			if(incSign < 0) {
				coords.dec = (coords.dec+180)%360;
			}
			
			if(coords.inc > 0) {
				discreteEllipsePoints.push({x: coords.dec, y: projectInclination(coords.inc), inc: coords.inc});
			}	
		}
	
	//The way the ellipse is drawn we find the minimum inclination at the centre of the discreteEllipsePoints array
	//There is some degree of uncertainty but it decreases with the number of iterations (N=1000)

	var index = parseInt(discreteEllipsePoints.length/2);

	var intercept = {
		one: {
			dec: discreteEllipsePoints[index].x, 
			inc: discreteEllipsePoints[index].inc
		}, 
		two: {
			dec: discreteEllipsePoints[index+1].x, 
			inc: discreteEllipsePoints[index+1].inc
		}
	};
	
	return intercept;
	
}

var angle = function(decOne, incOne, decTwo, incTwo) {

  // Find the Cartesian coordinates of both directions
  var A = new Direction(decOne, incOne).toCartesian();
  var B = new Direction(decTwo, incTwo).toCartesian();

  // Dot product to find angle (https://en.wikipedia.org/wiki/Dot_product#Geometric)
  // vector norms ||A|| ||B|| are equal to 1 so the equation reduces to: A·B = cos(theta)
  return Math.acos((A.x * B.x) + (A.y * B.y) + (A.z * B.z)) / RADIANS

}


/* FUNCTION bisectorPlane
 * Description: finds the bisector plane between two vectors
 *            : the pole of the bisector is equal to v1 - v2.
 * Input: two vectors
 * Output: plane data to be plotted, and the position of the pole to this plane
 */
function bisectorPlane( one, two ) {

	var cart1 = new Direction(one.dec, one.inc).toCartesian();
	var cart2 = new Direction(two.dec, two.inc).toCartesian();

	var pole = new Coordinates(cart1.x-cart2.x, cart1.y-cart2.y, cart1.z-cart2.z).toVector(Direction);
	
	return {
		data: getPlaneData({dec: pole.dec, inc: pole.inc}, 90), 
		pole: pole
	}
}

/* FUNCTION getIntersection
 * Description: finds the line of intersection between two planes
 * Input: poles to given planes
 * Output: direction of the intersection
 */ 
function getIntersection( pole1, pole2 ) {
	
  // Get the pole directions in Cartesian coordinates
  var cart1 = new Direction(pole1.dec, pole1.inc).toCartesian();
  var cart2 = new Direction(pole2.dec, pole2.inc).toCartesian();
	
  // Get the cross product of the two vectors
  var cross = getCross(cart1, cart2);
	
  // Return the direction of the perpendicular vector (which is the line of intersection between the planes)
  return new Coordinates(cross.x, cross.y, cross.z).toVector(Direction);

}

/* FUNCTION getCross
 * Description: calculates the cross product for two vectors
 * Input: two vectors in Cartesian coordinates
 * Output: cross product in Cartesian coordinates
 */
function getCross ( cart1, cart2 ) {
  return {
    'x': cart1.y*cart2.z - cart2.y*cart1.z,
    'y': -cart1.x*cart2.z + cart2.x*cart1.z,
    'z': cart1.x*cart2.y - cart2.x*cart1.y
  }		
}

/* FUNCTION NTRAnalysis
 * Calculates rotation parameters to bring observed magnetization vector to reference direction and dyke pole to horizontal
 * Input: NULL
 * Output: VOID (draws graph and fills table)
 */
function NTRAnalysis(referencePole, magnetizationVector, dykePole, iterate) {
	
  var container = iterate ? "iterationPlot": "initialPlot";
  var iterationPermutations = new Array();

  // If iterate, we need confidence envelopes and calculate 75 permutations that we wish to compared
  if(iterate) {
	
    // Parameters to determine confidence ellipses on the three specified vector
    // This is equal to the 95% confidence interval
    var referencePoleInc95 = Number(document.getElementById("confRef").value);
    var magnetizationVectorDec95 = Number(document.getElementById("confMagDec").value);
    var magnetizationVectorInc95 = Number(document.getElementById("confMagInc").value);
    var dykePole95 = Number(document.getElementById("confDyke").value);
		
    // Calculation of confidence ellipses and four maximum/minimum endpoints for each ellipse
    var referencePoleEndPoints = ellipseEndpoints(referencePole.dec, referencePole.inc, 0, referencePoleInc95, "rgb(191, 119, 152)");
		
    var referencePoleEllipse = getPlaneData(referencePole, referencePoleInc95);

    referencePoleEndPoints.push({
      'x': referencePole.dec,
      'y': projectInclination(referencePole.inc),
      'inc': referencePole.inc
    });
		
    var magnetizationVectorEndPoints = ellipseEndpoints(magnetizationVector.dec, magnetizationVector.inc, magnetizationVectorDec95, magnetizationVectorInc95, 'rgb(119, 191, 152)');
		
    var magnetizationVectorEllipse = getPlaneData(magnetizationVector, magnetizationVectorDec95);
		
    magnetizationVectorEndPoints.push({
      'x': magnetizationVector.dec,
      'y': projectInclination(magnetizationVector.inc),
      'inc': magnetizationVector.inc
    });
		
    var dykePoleEndPoints = ellipseEndpoints(dykePole.dec, dykePole.inc, dykePole95, dykePole95, 'orange');

    var dykePoleEllipse = getPlaneData(dykePole, dykePole95);

    dykePoleEndPoints.push({
      'x': dykePole.dec,
      'y': projectInclination(dykePole.inc),
      'inc': dykePole.inc
    });
		
    // Calculate 125 iterations for points on confidence envelopes
    for(var i = 0; i < referencePoleEndPoints.length; i++) {
      for(var j = 0; j < magnetizationVectorEndPoints.length; j++) {
        for(var k = 0; k < dykePoleEndPoints.length; k++) {
          iterationPermutations.push([
            [referencePoleEndPoints[i].x, referencePoleEndPoints[i].inc],
            [magnetizationVectorEndPoints[j].x, magnetizationVectorEndPoints[j].inc],
            [dykePoleEndPoints[k].x, dykePoleEndPoints[k].inc],
          ]);
        }
      }
    }		
		
    var intersectionArray1 = [];
    var intersectionArray2 = [];
	
  } else {
    iterationPermutations.push([
      [referencePole.dec, referencePole.inc],
      [magnetizationVector.dec, magnetizationVector.inc],
      [dykePole.dec, dykePole.inc]
    ]);
  }
	
  var i = 0;
  var dataOne = new Array();
  var dataTwo = new Array();
	
  // Asynchronous implementation of iterations
  (function timed() {
	
    // For one iteration, get the appropriate directions
    var referencePole = {
      'dec': iterationPermutations[i][0][0],
      'inc': iterationPermutations[i][0][1]
    }
    var magnetizationVector = {
      'dec': iterationPermutations[i][1][0],
      'inc': iterationPermutations[i][1][1]
    }
    var dykePole = {
      'dec': iterationPermutations[i][2][0],
      'inc': iterationPermutations[i][2][1]		
    }
		
    // Obtain angle beta between dyke pole and site magnetization vector (ChRM)
    // This angle should remain constant
    var beta = angle(dykePole.dec, dykePole.inc, magnetizationVector.dec, magnetizationVector.inc);

    // Beta cannot go over 90; if so, we flip the dykePole too
    if(beta > 90) {
      beta = 180 - beta;
      dykePole.inc = -dykePole.inc;
      dykePole.dec = (dykePole.dec+180)%360;
      if(!iterate) {
        notify('note', 'Beta exceeds 90 degrees: dyke pole has been flipped.');
      }
    }
		
    // Draw small circle around the reference pole with angle beta
    var ellipseParameters = {
      'xDec': referencePole.dec,
      'xInc': referencePole.inc,
      'yDec': referencePole.dec,
      'yInc': referencePole.inc - 90,
      'zDec': referencePole.dec + 90,
      'zInc': 0,
      'beta': beta,
      'gamma': beta
    }
		
    var sCircle = getPlaneData(referencePole, beta);

    // Numerically iterate over same small circle to find declinations that are closest to 0
    // I cannot think of a proper analytical implementation - suggestions?
    var intercept = new ellipseDataZero(referencePole.dec, referencePole.inc, beta, beta, false);
				
    // Get bisector plane for the following vector pairs:
    // 1. magnetizationVector - referencePole
    // 2. dykePole - iCept1
    // 3. dykePole - iCept2
    var k = bisectorPlane(magnetizationVector, referencePole);
    var l = bisectorPlane(dykePole, intercept.one);
    var m = bisectorPlane(dykePole, intercept.two);

    // Now we want to find the two intersections of the three bisectors
    // 1. Intersection between magnetizationVector - referencePole and dykePole - iCept1
    // 2. Intersection between magnetizationVector - referencePole and dykePole - iCept2
    // These are interceps 1 and 2 and represent the two rotation axes of our solutions
    var intS = getIntersection(k.pole, l.pole);
    var intS2 = getIntersection(k.pole, m.pole);
		
    // Get the angle between the planes (NTR Analysis prints this information so we might as well)
    var anglePlane1 = angle(k.pole.dec, k.pole.inc, l.pole.dec, l.pole.inc);
    var anglePlane2 = angle(k.pole.dec, k.pole.inc, m.pole.dec, m.pole.inc);
	
    // Believe the convention is to make rotation poles positive
    if(intS.inc < 0) {
      intS.inc = -intS.inc;
      intS.dec = (intS.dec + 180) % 360;
    }
    if(intS2.inc < 0) {
      intS2.inc = -intS2.inc;
      intS2.dec = (intS2.dec + 180) % 360;
    }
		
    // Find the vectors perpendicular to the rotation axes and compare the angle
    // The angle of rotation is equal to the angle between the cross products of the vectors
    var m1 = getIntersection(intS, magnetizationVector);
    var m2 = getIntersection(intS, referencePole);
    var angle1 = angle(m1.dec, m1.inc, m2.dec, m2.inc);
		
    // Calculate cross product between m1 and m2 to find sense of rotation (positive is CCW; negative is CW)
    var cross = getIntersection(m1, m2);
    var type1 = new Direction(cross.dec, cross.inc).toCartesian().z < 0 ? 'CW' : 'CCW';
		
    // Repeat procedure for second intersection
    var m1 = getIntersection(intS2, magnetizationVector);
    var m2 = getIntersection(intS2, referencePole);
    var angle2 = angle(m1.dec, m1.inc, m2.dec, m2.inc);
		
    var cross = getIntersection(m1, m2);
    var type2 = new Direction(cross.dec, cross.inc).toCartesian().z < 0 ? 'CW' : 'CCW';
		
    // If we're doing multiple iterations, save the rotation axes for display
    if(iterate) {
      intersectionArray1.push({
        'x': intS.dec, 
        'y': projectInclination(intS.inc), 
        'inc': intS.inc, 
        'rotation': angle1, 
        'rotationSense': type1,
        'dykeStrike': ((intercept.one.dec + 90) % 360).toFixed(1),
        'dykeDip': (90 - intercept.one.inc).toFixed(1)
      });
      intersectionArray2.push({
        'x': intS2.dec, 
        'y': projectInclination(intS2.inc), 
        'inc': intS2.inc, 
        'rotation': angle2, 
        'rotationSense': type2,
        'dykeStrike': ((intercept.two.dec + 90) % 360).toFixed(1),
        'dykeDip': (90 - intercept.two.inc).toFixed(1)
      });

      dataOne.push(Number((intercept.one.dec) % 360));
      dataTwo.push(Number((intercept.two.dec) % 360));

    };
		
    // If we haven't done all permutations, do more
    if(++i < iterationPermutations.length) {
      setTimeout(function() { timed(); }, 5);
    } else {		
      if(!iterate) {

        // Update tables with found information
        $("#NTRInputTable").html('<table class="table table-striped text-center"> <thead> <tr> <th> Reference Vector </th> <th> Site Vector </th> <th> Pole to Dyke </th> <th> Beta </th> </tr> </thead> <tbody> <tr> <td> <b> Declination </b>' + referencePole.dec.toFixed(1) + '<br> <b> Inclination </b>' + referencePole.inc.toFixed(1) + ' </td> <td> <b> Declination </b>' + magnetizationVector.dec.toFixed(1) + '<br> <b> Inclination </b>' + magnetizationVector.inc.toFixed(1) + ' </td> <td> <b> Declination </b>' + dykePole.dec.toFixed(1) + '<br> <b> Inclination </b>' + dykePole.inc.toFixed(1) + ' </td> <td> ' + beta.toFixed(1) + ' </td> </tr> </tbody> </table>').show(); 
        $("#NTRSolutionTable").html('<table class="table table-striped text-center"> <thead> <tr> <th> Solution 1 - Rotation Pole </th> <th>Solution 2 - Rotation Pole </th>  </tr> </thead> <tbody> <tr> <td> <b> Declination </b>' + intS.dec.toFixed(1) + '<br> <b> Inclination </b>' + intS.inc.toFixed(1) + '<br> <b> Angle of Rotation </b> ' + angle1.toFixed(1) + ' <br> <b> Sense of Rotation </b> ' + type1 + ' <br> <b> Angle Between Planes </b> ' + anglePlane1.toFixed(1) + ' <hr> <b> Initial Dyke Strike </b> ' + ((intercept.one.dec+90)%360).toFixed(1) +  ' <br> <b> Initial Dyke Dip </b> ' + (90-intercept.one.inc).toFixed(1) + '</td> <td> <b> Declination </b>' + intS2.dec.toFixed(1) + '<br> <b> Inclination </b>' + intS2.inc.toFixed(1) + '<br> <b> Angle of Rotation </b> ' + angle2.toFixed(1) + ' <br>  <b> Sense of Rotation </b> ' + type2 + ' <br> <b> Angle Between Planes </b> ' + anglePlane2.toFixed(1) + ' <hr> <b> Initial Dyke Strike </b> ' + ((intercept.two.dec+90)%360).toFixed(1) +  ' <br> <b> Initial Dyke Dip </b> ' + (90-intercept.two.inc).toFixed(1) + ' </td> </tr> </tbody> </table> ').show();
				
        // Rodrigues' rotation formula (https://en.wikipedia.org/wiki/Rodrigues'_rotation_formula)
        // To calculate point after rotation around axis.
        var vVector = {'x': 0, 'y': 0, 'z': 1};
        var kVector = new Direction(intS.dec, intS.inc).toCartesian();
        var crossProd = getCross(kVector, vVector);
        var dot = kVector.x * vVector.x + kVector.y * vVector.y + kVector.z * vVector.z;
        
        var theta = type1 === 'CCW' ? angle1 : -angle1;
        
        var vRotated = {'x': 0, 'y': 0, 'z': 0};
        vRotated.x = vVector.x * Math.cos(theta * RADIANS) + crossProd.x * Math.sin(theta * RADIANS) + kVector.x * dot * (1 - Math.cos(theta * RADIANS));
        vRotated.y = vVector.y * Math.cos(theta * RADIANS) + crossProd.y * Math.sin(theta * RADIANS) + kVector.y * dot * (1 - Math.cos(theta * RADIANS));
        vRotated.z = vVector.z * Math.cos(theta * RADIANS) + crossProd.z * Math.sin(theta * RADIANS) + kVector.z * dot * (1 - Math.cos(theta * RADIANS));
        
        var pointLoc = new Coordinates(vRotated.x, vRotated.y, vRotated.z).toVector(Direction);
        var beddingdata = getPlaneData(pointLoc, 90);
        
        var kVector = new Direction(intS2.dec, intS2.inc).toCartesian();
        var crossProd = getCross(kVector, vVector);
        var dot = kVector.x * vVector.x + kVector.y * vVector.y + kVector.z * vVector.z;
        
        var theta = type2 === 'CCW' ? angle2 : -angle2;
        
        var vRotated = {'x': 0, 'y': 0, 'z': 0};
        vRotated.x = vVector.x * Math.cos(theta * RADIANS) + crossProd.x * Math.sin(theta * RADIANS) + kVector.x * dot * (1 - Math.cos(theta * RADIANS));
        vRotated.y = vVector.y * Math.cos(theta * RADIANS) + crossProd.y * Math.sin(theta * RADIANS) + kVector.y * dot * (1 - Math.cos(theta * RADIANS));
        vRotated.z = vVector.z * Math.cos(theta * RADIANS) + crossProd.z * Math.sin(theta * RADIANS) + kVector.z * dot * (1 - Math.cos(theta * RADIANS));
        
        var pointLoc = new Coordinates(vRotated.x, vRotated.y, vRotated.z).toVector(Direction);
        var beddingdata2 = getPlaneData(pointLoc, 90);
			
      }
	
      // Do the proper positive/negative color scheme for vectors
      var dykeColor = dykePole.inc < 0 ? 'white' : 'grey';
      var referenceColor = referencePole.inc < 0 ? 'white' : 'rgb(191, 119, 152)';
      var chrmColor = magnetizationVector.inc < 0 ? 'white': 'rgb(119, 191, 152)';
			
      // Construct plotSeries
      // Be warned these are many
      plotSeries = new Array();
	
      // If we do not wish to iterate, show the appropriate bisectors/intersections for the actual specified directions
      if(!iterate) {
        plotSeries.push({
          'name': 'Reference Pole',
          'zIndex': 10,
          'type': 'scatter',
          'data': [{
            'x': referencePole.dec,
            'y': projectInclination(referencePole.inc),
            'inc': referencePole.inc
          }],
          'marker': {
            'symbol': 'diamond',
            'radius': 8,
            'fillColor': referenceColor,
            'lineWidth': 1,
            'lineColor': 'rgb(191, 119, 152)',
          }
        }, {
          'name': 'Magnetization Vector',
          'type': 'scatter',
          'zIndex': 10,
          'data': [{
            'x': magnetizationVector.dec,
            'y': projectInclination(magnetizationVector.inc),
            'inc': magnetizationVector.inc
           }],
          'marker': {
            'symbol': 'circle',
            'radius': 6,
            'fillColor': chrmColor,
            'lineColor': 'rgb(119, 191, 152)',
            'lineWidth': 1,
          }
        }, {
          'name': 'Pole to Dyke',
          'type': 'scatter',
          'zIndex': 10,
          'data': [{
            'x': dykePole.dec,
            'y': projectInclination(dykePole.inc),
            'inc': dykePole.inc
          }],
          'marker': {
            'symbol': 'circle',
            'radius': 6,
            'fillColor': dykeColor,
            'lineColor': 'grey',
            'lineWidth': 1,
          }
        }, {
          'name': 'Beta',
          'type': 'line',
          'turboThreshold': 0,
          'data': sCircle,
          'color': 'grey',
          'dashStyle': 'ShortDash',
          'enableMouseTracking': false,
          'lineWidth': 1,
          'marker': {
            'enabled': false	
          }
        }, {
          'name': 'Intersections (Numerical Estimate)',
          'type': 'scatter',
          'color': 'rgb(119, 152, 191)',
          'marker': {
            'symbol': 'circle',
            'radius': 6,
          },
          'data': [{
            'x': intercept.one.dec,
            'y': projectInclination(intercept.one.inc),
            'inc': intercept.one.inc
          }, {
            'x': intercept.two.dec,
            'y': projectInclination(intercept.two.inc),
            'inc': intercept.two.inc
          }]
        }, {
          'name': 'Bisector (Site Pole - Reference Direction)',
          'type': 'line',
          'color': 'red',
          'lineWidth': 1,
          'enableMouseTracking': false,
          'marker': {
            'enabled': false
          },
          'data': k.data.positive
        }, {
          'name': 'Bisector (Site Pole - Reference Direction)',
          'type': 'line',
          'linkedTo': ':previous',
          'color': 'red',
          'dashStyle': 'ShortDash',
          'enableMouseTracking': false,
          'lineWidth': 1,
          'marker': {
            'enabled': false
          },
          'data': k.data.negative
        }, {
          'name': 'Bisector (Solution 1 - Dyke Pole)',
          'type': 'line',
          'enableMouseTracking': false,
          'color': 'blue',
          'lineWidth': 1,
          'marker': {
            'enabled': false
          },
          'data': m.data.positive
        }, {
          'type': 'line',
          'linkedTo': ':previous',
          'color': 'blue',
          'dashStyle': 'ShortDash',
          'enableMouseTracking': false,
          'lineWidth': 1,
          'marker': {
            'enabled': false
          },
          'data': m.data.negative
        }, {
          'name': 'Bisector (Solution 2 - Dyke Pole)',
          'type': 'line',
          'color': 'green',
          'enableMouseTracking': false,
          'lineWidth': 1,
          'marker': {
            'enabled': false
          },
          'data': l.data.positive
        }, {
          'name': 'Bisector [#2 - Dyke Pole]',
          'type': 'line',
          'color': 'green',
          'dashStyle': 'ShortDash',
          'lineWidth': 1,
          'linkedTo': ':previous',
          'enableMouseTracking': false,
          'marker': {
            'enabled': false
          },
          'data': l.data.negative
        }, {
          'name': 'Solution 1 - Rotation Pole',
          'color': 'violet',
          'type': 'scatter',
          'data': [{
            'x': intS.dec,
            'y': projectInclination(intS.inc),
            'inc': intS.inc
          }],
          'marker': {
            'symbol': 'circle',
            'radius': 6
          }
        }, {
          'name': 'Solution 2 - Rotation Pole',
          'type': 'scatter',
          'color': 'orange',
          'data': [{
            'x': intS2.dec,
            'y': projectInclination(intS2.inc),
            'inc': intS2.inc
          }],
          'marker': {
            'symbol': 'circle',
            'radius': 6
          }
        }, {
          'name': 'Solution 1 - Rotated Horizontal Bedding',
          'type': 'line',
          'visible': false,
          'color': 'violet',
          'dashStyle': 'ShortDash',
          'enableMouseTracking': false,
          'marker': {
            'enabled': false
          },
          'data': beddingdata.positive
        }, {
          'name': 'Solution 2 - Rotated Horizontal Bedding',
          'type': 'line',
          'visible': false,
          'color': 'orange',
          'dashStyle': 'ShortDash',
          'enableMouseTracking': false,
          'marker': {
            'enabled': false
          },
          'data': beddingdata2.positive
        });
      }
		
      // If the user wishes to iterate over the confidence intervals, show these intervals on the graph
      if(iterate) {
        plotSeries.push({
          'name': 'Magnetization Vector Interval',
          'type': 'line',
          'id': 'a95MagPole',
          'enableMouseTracking': false,
          'data': magnetizationVectorEllipse,
          'lineWidth': 1,
          'color': 'rgb(119, 191, 152)',
          'marker': {
            'enabled': false
          }	
        }, {
          'linkedTo': 'a95MagPole',
          'type': 'line',
          'enableMouseTracking': false,
          'color': 'rgb(119, 191, 152)',
          'data': magnetizationVectorEllipse,
          'lineWidth': 1,
          'marker': {
            'enabled': false
          }	
        }, {
          'type': 'scatter',
          'linkedTo': 'a95MagPole',
          'data': magnetizationVectorEndPoints,
          'color': 'rgb(119, 191, 152)',
          'marker': {
            'symbol': 'circle',
            'radius': 4,
          }
        }, {
          'name': 'Dyke Pole Interval',
          'type': 'line',
          'id': 'a95DykePole',
          'enableMouseTracking': false,
          'data': dykePoleEllipse,
          'lineWidth': 1,
          'color': 'orange',
          'marker': {
            'enabled': false
          }	
        }, {
          'linkedTo': 'a95DykePole',
          'type': 'line',
          'color': 'orange',
          'enableMouseTracking': false,
          'data': dykePoleEllipse,
          'lineWidth': 1,
          'marker': {
            'enabled': false
          }
        }, {
          'type': 'scatter',
          'linkedTo': 'a95DykePole',
          'data': dykePoleEndPoints,
          'color': 'orange',
          'marker': {
            'symbol': 'circle',
            'radius': 4,
          }
        }, {
          'name': 'Reference Pole Interval',
          'type': 'line',
          'id': 'a95ReferencePole',
          'enableMouseTracking': false,
          'data': referencePoleEllipse,
          'lineWidth': 1,
          'color': 'rgb(191, 119, 152)',
          'marker': {
            'enabled': false
          }	
        }, {
          'linkedTo': 'a95ReferencePole',
          'type': 'line',
          'enableMouseTracking': false,
          'data': referencePoleEllipse,
          'color': 'rgb(191, 119, 152)',
          'lineWidth': 1,
          'marker': {
            'enabled': false
          }	
        }, {
          'type': 'scatter',
          'linkedTo': 'a95ReferencePole',
          'data': referencePoleEndPoints,
          'color': 'rgb(191, 119, 152)',			
          'marker': {
            'symbol': 'circle',
            'radius': 4,
          }
        }, {
          'name': 'Solution 1 (Confidence Interval)',
          'type': 'scatter',
          'color': 'violet',
          'data': intersectionArray1,
          'marker': {
            'symbol': 'circle',
            'radius': 4,
          }
        }, {
          'name': 'Solution 2 (Confidence Interval)',
          'type': 'scatter',
          'color': 'orange',
          'data': intersectionArray2,
          'marker': {
            'symbol': 'circle',
            'radius': 4,
          }
        })
      }
		
      // Call plotting series
      drawGraph(plotSeries, container);

      if(iterate) {
        plotWindRose(dataOne, dataTwo, 'windrosePlot');
      }

      isRunning = false;

    }

  })();
	
}

/* function getTickMarks
 * description: returns an array of tick marks for equal area proj
 */
function getTickMarks(plotSeries) {

  var tickMarkersV = new Array();
  var tickMarkersH = new Array();

  for(var i = 10; i < 90; i += 10) {
    var proj = projectInclination(i);
    tickMarkersV.push([270, proj], [90, proj]);
    tickMarkersH.push([0, proj], [180, proj]);
  }

  plotSeries.push({
    'data': tickMarkersH,
    'type': 'scatter',
    'enableMouseTracking': false,
    'zIndex': 1,
    'showInLegend': false,
    'marker': {
      'symbol': 'horLine',
      'lineWidth': 1,
      'lineColor': 'lightgrey'
    }
  })

  plotSeries.push({
    'data': tickMarkersV,
    'type': 'scatter',
    'enableMouseTracking': false,
    'zIndex': 1,
    'showInLegend': false,
    'marker': {
      'symbol': 'vertLine',
      'lineWidth': 1,
      'lineColor': 'lightgrey'
    }
  })

}

function drawGraph( plotSeries, container ) {

  getTickMarks(plotSeries);

  // Specify chart options for equal area projection
  var chartOptions = {
    'chart': {
      'backgroundColor': 'rgba(255, 255, 255, 0)',
      'id': container,
      'polar': true,
      'animation': true,
      'renderTo': container, //Container that the chart is rendered to.
    },
    'tooltip': {
      'borderColor': 'rgb(119, 152, 191)',
    },
    'legend': {
      'title': {
        'text': 'NTR Analysis Legend'
      },
      'enabled': true,
      'align': container === 'iterationPlot' ? 'middle' : 'left',
      'verticalAlign': container === 'iterationPlot' ? 'bottom' : 'middle',
      'layout': container === 'iterationPlot' ? 'horizontal' : 'vertical',
      'floating': container === 'iterationPlot' ? true : false
    },
    'title': {
      'text': 'NTR Analysis',
    },
    'subtitle': {
      'text': container === 'iterationPlot' ? 'Collection of solutions for rotation poles ' : 'Solution for rotation poles (dotted planes are lower hemisphere)',
    },
    'pane': {
      'startAngle': 0,
      'endAngle': 360
    },
    'yAxis': {
      'type': 'linear',
      'reversed': true,
      'labels': {
        'enabled': false
      },
      'tickInterval': 90,
      'min': 0,
      'max': 90,
    },
    'tooltip': {
      'formatter': function() {
        if(this.series.name == 'Solution 1 (Confidence Interval)' || this.series.name == 'Solution 2 (Confidence Interval)') {
          return '<b>Name:</b> ' + this.series.name + '<br><b>Declatinion:</b> ' + this.x.toFixed(1) + '<br><b>Inclination:</b> ' + this.point.inc.toFixed(1) + '<br><b>Rotation:</b> ' + this.point.rotation.toFixed(1) + ' ' + this.point.rotationSense + '<br><b>Initial Dyke Strike:</b> ' + this.point.dykeStrike + '<br><b>Initial Dyke Dip:</b> ' + this.point.dykeDip;
        } else {
          return '<b>Name:</b> ' + this.series.name + '<br><b>Declatinion:</b> ' + this.x.toFixed(1) + '<br><b>Inclination:</b> ' + this.point.inc.toFixed(1);
        }
      }
    },
    'exporting': { 
      'enabled': true,
      'sourceWidth': 800,
      'filename': 'NTR',
      'sourceHeight': 800,
      'buttons': {
        'contextButton': {
          'symbolStroke': '#7798BF',
          'align': 'right'
        }
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (NTR Analysis) - <i> after Allerton and Vine, 1987, Morris et al., 1998 </i>",
      'href': ''
    },
    'xAxis': {
      'minorTickPosition': 'inside',
      'type': 'linear',
      'min': 0,
      'max': 360,
      'minorGridLineWidth': 0,
      'tickPositions': [0, 90, 180, 270, 360],
      'minorTickInterval': 10,
      'minorTickLength': 5,
      'minorTickWidth': 1,
      'labels': {
        'formatter': function() {
          return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
        }
      }
    },
    'plotOptions': {
      'series': {
        'animation': true,
      }
    },
    'series': plotSeries,
  };

  chartFoldLeft = new Highcharts.Chart(chartOptions); //Initialize chart with specified options.
  $("#" + container).show().css('display', 'inline-block');

}

/* FUNCTION getCSV
 * Description: custom function to parse Highcharts data to csv format on exporting
 * Input: triggered by clicking export CSV -> passes chart ID
 * Output: CSV formatted variable that can be downloaded through dlItem routine
 */
(function (Highcharts) {

  downloadAttrSupported = document.createElement('a').download !== undefined;
		
  // Options
  var itemDelimiter = '","';
  var lineDelimiter = '\n';

  // Add a prototype function
  Highcharts.Chart.prototype.getCSV = function () {

    var csv = "";

    if(this.userOptions.chart.id === 'initialPlot') {
      notify('failure', 'Exporting empty file - not implemented.');
    } 
		 
    // Plot for iteration
    if(this.userOptions.chart.id === 'iterationPlot') {
		 	
      var columns = ['Solution 1'];
      csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;

      var columns = ['Declination', 'Inclination', 'Rotation', 'Sense', 'Dyke Orientation'];	
      csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
			
      for(var i = 0; i < this.series[9].data.length; i++) {
        var columns = [
          this.series[9].data[i].x,
          this.series[9].data[i].inc,
          this.series[9].data[i].rotation,
          this.series[9].data[i].rotationSense,
          this.series[9].data[i].dykeStrike
        ];	
        csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
      }
			
      csv += lineDelimiter;
			
      var columns = ['Solution 2'];	
      csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;

      var columns = ['Declination', 'Inclination', 'Rotation', 'Sense', 'Dyke Orientation'];	
      csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;	
			
      for(var i = 0; i < this.series[10].data.length; i++) {
        var columns = [
          this.series[10].data[i].x,
          this.series[10].data[i].inc,
          this.series[10].data[i].rotation,
          this.series[10].data[i].rotationSense,
          this.series[10].data[i].dykeStrike
        ];	
        csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
      }
    }

    return csv;
		
  };  
	
}(Highcharts));


/*
 * FUNCTION plotWindRose
 * Description: code for the plotting of a wind rose and sorting of declination in bins of 10 degrees
 * Input: data array with the declinations, and container for chart to be rendered in
 * Output: VOID (calls Highcharts constructor for new chart)
 */
function plotWindRose(dataOne, dataTwo, container) {

  var binSize = 5;
	
  function prepData(newDatArray) {
	
    // This algorithm sorts declinations in the newDatArray to bins of binSize degrees
    // Notice: 360 % binSize must be 0 
    var sortedArr = new Object();
    sortedArr['dump'] = 0;
    for(var i = 0; i < newDatArray.length; i++) {
      if(Math.round(newDatArray[i])%360 === 0) {
        sortedArr['dump'] += 1;
      } else {
        // Round to the nearest bin degrees
        // If the bin already exists, increment by one, otherwise create the bin starting at 1
        var declination = Math.abs(Math.round(newDatArray[i] / binSize) * binSize)%360;
        sortedArr[declination] ? sortedArr[declination] += 1 : sortedArr[declination] = 1;
      }
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
        dataList.push({'x': i, y: Math.sqrt(sortedArr[i])});
      } else {
        dataList.push({'x': i, 'y': 0});		
      }
			
      // Get the maximum value of declinations, this will be the maximum y-value for the chart as wells
      if(sortedArr[i] > max) {
        max = sortedArr[i];
      }
    }

    return {'data': dataList, 'max': max}

  }

  var data1 = prepData(dataOne);
  var data2 = prepData(dataTwo);
	
  var max = data1.max;
	
  // Data series for the rose chart
  var dataSeries = [{
    'borderWidth': 1, 
    'borderColor': 'grey',
    'color': 'rgb(119, 152, 191)',
    'zIndex': 100, 
    'name': 'Solution 1 - Original Dyke Poles', 
    'data': data1.data
  }, {
    'borderWidth': 1, 
    'borderColor': 'grey',  
    'color': 'rgb(191, 152, 119)',
    'zIndex': 100, 
    'name': 'Solution 2 - Original Dyke Poles', 
    'data': data2.data
  }];

  // Parse the data from an inline table using the Highcharts Data plugin
  var chartOptions = {
    'chart': {
      'polar': true,
      'type': 'column',
      'renderTo': container,
    },
    'legend': {
      'enabled': true,
      'floating': true,
    },
    'title': {
      'text': 'Original Dyke Pole Density',
    },
    'subtitle': {
      'text': 'Intersections of Beta with the horizontal (single solutions not shown)',
    },
    'xAxis': {
      'minorTickPosition': 'outside',
      'type': 'linear',
      'min': 0,
      'max': 360,
      'minorGridLineWidth': 0,
      'tickPositions': [0, 90, 180, 270, 360],
      'minorTickInterval': 10,
      'minorTickLength': 2,
      'minorTickWidth': 1,
      'labels': {
        'formatter': function () {
          return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
        }
      }
    },
    'pane': {
      'startAngle': 0,
      'endAngle': 360
    },
    'yAxis': {
      'min': 0,
      'tickPositions': [0, this.max],
      'endOnTick': false,
      'labels': {
        'enabled': false
      },
    },
    'tooltip': {
      'formatter': function () {
        return '<b> Cumulative Declination </b> <br><b>Declination Bin: </b>' + this.x + '<br><b>Number of Declinations: </b>' + Math.pow(this.y, 2).toFixed(1);
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (NTR Analysis) - <i> after Allerton and Vine, 1987, Morris et al., 1998 </i>",
      'href': ''
    },
    'plotOptions': {
      'series': {
        'stacking': 'normal',
        'animation': false,
        'shadow': false,
        'groupPadding': 0,
        'pointPadding': 0,
        'pointPlacement': 'on',
      },
      'column': {
        'colorByPoint': false
      }
    },
    'series': dataSeries,
  }

  new Highcharts.Chart(chartOptions);
  $("#windrosePlot").show().css('display', 'inline-block');

}

// Now we want to add "Download CSV" to the exporting menu.
// Code changed after https://github.com/highslide-software/export-csv
// Original Author: Torstein Honsi (Highcharts)
Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({

  'text': 'Download CSV file',
  'onclick': function () {
	
    // Download the parsed CSV
    dlItem(this.getCSV(), 'csv');

  }

});

/* FUNCTION dlItem
 * Description: creates a BLOB that can be downloaded
 * Input: string to be downloaded (usually a csv-formatted string), and extension for the file
 * Output: VOID
 */
function dlItem ( string, extension ) {
	
  // Check if supported
  downloadAttrSupported = document.createElement('a').download !== undefined;
	
  var blob = new Blob([string], { type: 'data:text/csv;charset=utf-8,'});
  var csvUrl = URL.createObjectURL(blob);
  var name = 'export';

  // Download attribute supported
  if(downloadAttrSupported) {
    a = document.createElement('a');
    a.href = csvUrl;
    a.target      = '_blank';
    a.download    = name + '.' + extension;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else if (window.Blob && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, name + '.' + extension);
  } else {
    Highcharts.post('http://www.highcharts.com/studies/csv-export/download.php', {
      'data': string,
      'type': 'txt',
      'extension': extension
    });
  }

}
