/*jslint bitwise: true, browser: true, eqeqeq: true, immed: true, newcap: true, nomen: true, regexp: true, undef: true, white: true, indent: 4 */

/* This Java-script program was written by Ari ��r�arson (August 2009).
The code is based on a Fortran-program written by ��r�ur Arason (2006). 
The program is intended to work with the web-calculator available at
http://www.vedur.is/~arason/paleomag/incl-only/index.html
to find the maximum likelihood solution for inclination-only data in paleomagnetism */

var Pal = {};

/* Trim white space from the start and the end of a string */
Pal.Trim = function (str)
{
	return str.replace(/^\s+/, '').replace(/\s+$/, '');
};

Pal.Bessel = function (x)
{
	var output = {};

	var p1 = 1;
	var p2 = 3.5156229;
	var p3 = 3.0899424;
	var p4 = 1.2067492;
	var p5 = 0.2659732;
	var p6 = 0.360768e-1;
	var p7 = 0.45813e-2;
	
	var q1 = 0.39894228;
	var q2 = 0.1328592e-1;
	var q3 = 0.225319e-2;
	var q4 = -0.157565e-2;
	var q5 = 0.916281e-2;
	var q6 = -0.2057706e-1;
	var q7 = 0.2635537e-1;
	var q8 = -0.1647633e-1;
	var q9 = 0.392377e-2;
	
	var u1 = 0.5;
	var u2 = 0.87890594;
	var u3 = 0.51498869;
	var u4 = 0.15084934;
	var u5 = 0.2658733e-1;
	var u6 = 0.301532e-2;
	var u7 = 0.32411e-3;
	
	var v1 = 0.39894228;
	var v2 = -0.3988024e-1;
	var v3 = -0.362018e-2;
	var v4 = 0.163801e-2;
	var v5 = -0.1031555e-1;
	var v6 = 0.2282967e-1;
	var v7 = -0.2895312e-1;
	var v8 = 0.1787654e-1;
	var v9 = -0.420059e-2;

	var t;
	var b0;
	var b1;
	
	if (Math.abs(x) < 3.75)
	{
		t = (x / 3.75) * (x / 3.75);
		b0 = p1 + t * (p2 + t * (p3 + t * (p4 + t * (p5 + t * (p6 + t * p7)))));
		b1 = x * (u1 + t * (u2 + t * (u3 + t * (u4 + t * (u5 + t * (u6 + t * u7))))));
		output.bi0e = b0 / Math.exp(Math.abs(x));
		output.bi1e = b1 / Math.exp(Math.abs(x));
		output.bi1i0 = b1 / b0;
	}
	else
	{
		t = 3.75 / Math.abs(x);
		b0 = q1 + t * (q2 + t * (q3 + t * (q4 + t * (q5 + t * (q6 + t * (q7 + t * (q8 + t * q9)))))));
		b1 = v1 + t * (v2 + t * (v3 + t * (v4 + t * (v5 + t * (v6 + t * (v7 + t * (v8 + t * v9)))))));
		if (x < 0)
		{
			b1 = -b1;
		}
		output.bi0e = b0 / Math.sqrt(Math.abs(x));
		output.bi1e = b1 / Math.sqrt(Math.abs(x));
		output.bi1i0 = b1 / b0;
	}

	return output;
};

Pal.Coth = function (x)
{
	var t, ep, em;
	
	var COTH;

	if (x === 0)
	{
		COTH = 0;
		return COTH;
	}

	t = Math.abs(x);
	if (t < 0.001)
	{
		COTH = 1 / t + t / 3 - Math.pow(t, 3) / 45 + Math.pow(t, 5) * 2 / 945;
	}
	else if (t <= 15)
	{
		ep = Math.exp(t);
		em = Math.exp(-t);
		COTH = (ep + em) / (ep - em);
	}
	else
	{
		COTH = 1;
	}

	if (x < 0)
	{
		COTH = -COTH;
	}

	return COTH;
};


Pal.AL1 = function (th, the, ak)
{
	var n = th.length;
	
	var dr, s, c, x, bi0e, bi1e, bi1i0;

	dr = 0.0174532925199433; /* Degrees to radians (pi/180) */

	s = 0;
	c = 0;
	var i;
	var besselOutput;
	for (i = 0; i < n; i++)
	{
		x = ak * Math.sin(the * dr) * Math.sin(th[i] * dr);
		besselOutput = Pal.Bessel(x);
		bi0e = besselOutput.bi0e;
		bi1e = besselOutput.bi1e;
		bi1i0 = besselOutput.bi1i0;
		s = s + Math.sin(th[i] * dr) * bi1i0;
		c = c + Math.cos(th[i] * dr);
	}

	var al1 = Math.atan2(s, c) / dr;

	if (al1 < 0.000001)
	{
		al1 = 0.000001;
	}
	if (al1 > 179.999999)
	{
		al1 = 179.999999;
	}

	return al1;
};

Pal.AL2 = function (th, the, ak)
{
	var n = th.length;
	var dr, s, c, x, bi0e, bi1e, bi1i0;

	dr = 0.0174532925199433; /* ! Degrees to radians (pi/180) */

	s = 0;
	c = 0;
	var i;
	var besselOutput;
	for (i = 0; i < n; i++)
	{
		x = ak * Math.sin(the * dr) * Math.sin(th[i] * dr);
		besselOutput = Pal.Bessel(x);
		bi0e = besselOutput.bi0e;
		bi1e = besselOutput.bi1e;
		bi1i0 = besselOutput.bi1i0;
		s = s + Math.sin(th[i] * dr) * bi1i0;
		c = c + Math.cos(th[i] * dr);
	}
	
	var al2;
	x = n * Pal.Coth(ak) - Math.cos(the * dr) * c - Math.sin(the * dr) * s;
	al2 = 1e10;
	if (x / n > 1e-10)
	{
		al2 = n / x;
	}
	if (al2 < 1e-06)
	{
		al2 = 1e-06;
	}

	return al2;
};

Pal.Xlik = function (th, the, ak)
{
	var n = th.length;
	var a1, a2, a3, q, pi, dr;
	var x, bi0e, bi1e, bi1i0;

	dr = 0.0174532925199433; /* ! Degrees to radians (pi/180) */
	pi = 180 * dr;

	var XLIK;
	
	/* Illegal use */
	if (n < 1)
	{
		XLIK = -1e10;
		return XLIK;
	}
	if (ak < 0)
	{
		XLIK = -1e10;
		return XLIK;
	}

	/* A1(k) = N ln(k) - N ln(sinh k) - N ln(2) */

	a1 = 0;
	if (ak >= 0 && ak < 0.01)
	{
		q = -ak * (1 - ak * (2 / 3 - ak * (1 / 3 - ak * (2 / 15 - ak * (8 / 45)))));
		a1 = n * (-Math.log(2) - Math.log(1 + q) - ak);
	}
	else if (ak >= 0.01 && ak <= 15)
	{
		a1 = n * (Math.log(ak) - Math.log(1 - Math.exp(-2 * ak)) - ak);
	}
	else
	{
		a1 = n * (Math.log(ak) - ak);
	}

	/* A2(k,t,ti) = Sum(k cos t cos ti) + Sum(ln(BessIo(k sin t sin ti))) */

	a2 = 0;
	
	var i;
	var besselOutput;
	for (i = 0; i < n; i++)
	{
		x = ak * Math.sin(the * dr) * Math.sin(th[i] * dr);
		besselOutput = Pal.Bessel(x);
		bi0e = besselOutput.bi0e;
		bi1e = besselOutput.bi1e;
		bi1i0 = besselOutput.bi1i0;
		a2 = a2 + ak * Math.cos((th[i] - the) * dr) + Math.log(bi0e);
	}

	/* A3(ti) = Sum( ln(sin(ti)) ) */

	a3 = 0;
	
	for (i = 0; i < n; i++)
	{
		x = th[i];
		if (x < 0.000001)
		{
			x = 0.000001;
		}
		if (x > 179.999999)
		{
			x = 179.999999;
		}
		a3 = a3 + Math.log(Math.sin(x * dr));
	}

	/* The log-likelihood function */

	XLIK = a1 + a2 + a3;

	return XLIK;
};

Pal.ArithmeticMean = function (th)
{
	var n = th.length;	
	var dr = 0.0174532925199433;
	
	var i;
	var s = 0;
	var s2 = 0;
	for (i = 0; i < n; i++)
	{
		s = s + th[i];
		s2 = s2 + Math.pow(th[i], 2);
	}
	var output = {};
	output.rt = s / n;
	output.rk = (n - 1) / ((s2 - s * s / n) * dr * dr);
	
	return output;
};

Pal.ARALEV = function (xinc)
{
	var n = xinc.length;
	var output = {};
	var ie1, ie2, ie3;
	var th = [];
	var dr, t63max, a95max;
	var s, s2, c, x, rt, rk, rt1, rk1, co, dk, dt;
	var the1, the2, the3, the4, akap1, akap2, akap3, akap4;
	var xl, xl1, xl2, xl3, xl4;

	/* Set constants */

	dr = 0.0174532925199433; /* Degrees to radians (pi/180) */
	t63max = 105.070062145; /* 63 % of a sphere. */
	a95max = 154.158067237; /* 95 % of a sphere. */
	output.ierr = 1;

	/* Check for illegal use */

	if (n === 1)
	{
		output.ainc = xinc[0];
		output.ak = -1;
		output.t63 = t63max;
		output.a95 = a95max;
		output.ierr = 0;
		alert("ERROR: Only one or none observed inclination in ARALEV");
		return output;
	}

	/* Check if incl are out of range */

	var i;
	for (i = 0; i < n; i++)
	{
		if (!(xinc[i] >= -90 && xinc[i] <= 90))
		{
			output.ainc = -98;
			output.ak = -1;
			output.t63 = -1;
			output.a95 = -1;
			alert("ERROR: Inclination data out of range [-90, +90] in ARALEV");
			return output;
		}
	}

	/* Check if all incl are identical */
	var same = true;
	for (i = 1; i < n; i++)
	{
		if (xinc[i] !== xinc[0])
		{
			same = false;
		}
	}
	
	if (same)
	{
		output.ainc = xinc[1];
		output.ak = 1e10;
		output.t63 = 0;
		output.a95 = 0;
		output.ierr = 0;
		alert(" WARNING: All incl identical in ARALEV");
		return output;
	}

	
	
	/* Inclinations to co-inclinations */

	for (i = 0; i < n; i++)
	{
		th[i] = 90 - xinc[i];
	}

	/* Calculate arithmetic mean to use as first guess */

	s = 0;
	s2 = 0;
	c = 0;
	for (i = 0; i < n; i++)
	{
		s = s + th[i];
		s2 = s2 + th[i] * th[i];
		c = c + Math.cos(th[i] * dr);
	}
	c = c / n;

	rt = s / n;
	x = (s2 - s * s / n) * dr * dr;
	rk = 1e10;
	if (x / (n - 1) > 1e-10)
	{
		rk = (n - 1) / x;
	}
	rt1 = rt;
	rk1 = rk;

	/* Iterate in the interior to find solution to (theta, kappa) */
	/* Start iteration at arithmetic mean (theta, kappa) */

	rt = rt1;
	rk = rk1;
	ie1 = 0;

	the1 = rt;
	akap1 = rk;
	var j;
	var conv = false;
	for (j = 0; j < 10000; j++)
	{
		rt = Pal.AL1(th, rt, rk);
		rk = Pal.AL2(th, rt, rk);
		dt = Math.abs(rt - the1);
		dk = Math.abs((rk - akap1) / rk);
		the1 = rt;
		akap1 = rk;
		if (j > 10 && dt < 1e-6 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}
	if (!conv)
	{
		ie1 = 1;
	}
	
	the1 = rt;
	akap1 = rk;
	xl1 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (theta = 0) */

	rt = 0;
	rk = rk1;
	x = 1 - c;
	if (x > 1e-10)
	{
		rk = 1 / x;
	}
	ie2 = 0;

	akap2 = rk;
	
	conv = false;
	for (j = 0; j < 10000; j++)
	{
		x = Pal.Coth(rk) - c;
		if (x > 1e-10)
		{
			rk = 1 / x;
		}
		else
		{
			rk = 1e10;
		}
		dk = Math.abs((rk - akap2) / rk);
		akap2 = rk;
		if (j > 4 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}
	if (!conv)
	{
		ie2 = 1;
	}
	the2 = 0;
	akap2 = rk;
	xl2 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (theta = 180) */


	rt = 180;
	rk = rk1;
	x = 1 + c;
	if (x > 1e-10)
	{
		rk = 1 / x;
	}
	ie3 = 0;

	akap3 = rk;
	conv = false;
	for (j = 0; j < 10000; j++)
	{
		x = Pal.Coth(rk) + c;
		if (x > 1e-10)
		{
			rk = 1 / x;
		}
		else
		{
			rk = 1e10;
		}
		dk = Math.abs((rk - akap3) / rk);
		akap3 = rk;
		if (j > 4 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}
	if (!conv)
	{
		ie3 = 1;
	}
	the3 = 180;
	akap3 = rk;
	xl3 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (kappa = 0) */

	rt = 90;
	rk = 0;
	the4 = rt;
	akap4 = rk;
	xl4 = Pal.Xlik(th, rt, rk);

	/* Use the best solution of the four */

	var isol = 1;
	output.ierr = ie1;
	if (xl2 > xl1)
	{
		the1 = the2;
		akap1 = akap2;
		xl1 = xl2;
		isol = 2;
		output.ierr = 1;
		if (ie2 === 0)
		{
			output.ierr = 0;
		}
	}
	if (xl3 > xl1)
	{
		the1 = the3;
		akap1 = akap3;
		xl1 = xl3;
		isol = 3;
		output.ierr = 1;
		if (ie3 === 0)
		{
			output.ierr = 0;
		}
	}
	if (xl4 > xl1)
	{
		the1 = the4;
		akap1 = akap4;
		xl1 = xl4;
		isol = 4;
		output.ierr = 0;
	}
	output.ainc = 90 - the1;
	output.ak = akap1;
	if (output.ierr !== 0)
	{
		console.log("WARNING: Convergence problems in ARALEV");
	}

	/* Test robustness of solution theta +/- 0.01� and kappa +/- 0.1% */

	for (x = 0; x < 16; x++)
	{
		rt = the1 + 0.01 * Math.cos(22.5 * x * dr);
		rk = akap1 * (1 + 0.001 * Math.sin(22.5 * x * dr));
		if (rt >= 0 && rt <= 180)
		{
			xl = Pal.Xlik(th, rt, rk);
			if (xl > xl1)
			{
				output.ierr = output.ierr + 2;
				console.log("WARNING: Robustness problem in ARALEV");
			}
		}
	}

	/* Estimation of angular standard deviation */
	/* c	Theta-63 calculated from (kappa), same method as Kono (1980) */

	if (akap1 >= 20)
	{
		co = 1 + Math.log(1 - 0.63) / akap1;
	}
	if (akap1 > 0.1 && akap1 < 20)
	{
		co = 1 + Math.log(1 - 0.63 * (1 - Math.exp(-2 * akap1))) / akap1;
	}
	if (akap1 <= 0.1)
	{
		co = -0.26 + 0.4662 * akap1;
	}
	
	output.t63 = 0;
	if (co < 0)
	{
		output.t63 = 180;
	}
	
	if (Math.abs(co) < 1)
	{
		output.t63 = 90 - Math.atan(co / Math.sqrt(1 - co * co)) / dr;
	}
	if (output.t63 > t63max)
	{
		output.t63 = t63max;
	}

	/* Estimation of 95% (circular) symmetric confidence limit of the mean */
	/* Alpha-95 calculated from (N, kappa), same method as Kono (1980) */

	co = 1 - (n - 1) * (Math.pow(20, 1 / (n - 1)) - 1) / (n * (akap1 - 1) + 1);
	 
	output.a95 = 0;
	if (co < 0)
	{
		output.a95 = 180;
	}
	if (Math.abs(co) < 1)
	{
		output.a95 = 90 - Math.atan(co / Math.sqrt(1 - co * co)) / dr;
	}
	if (output.a95 > a95max)
	{
		output.a95 = a95max;
	}

	return output;
};

Pal.EvaluateInput = function (inclinations)
{
	var inputNumbers = inclinations
	
	var th = [];
	var inc = [];
	var n = inputNumbers.length;
	var i;
	for (i = 0; i < n; i++)
	{
		inc[i] = Number(inputNumbers[i]);
		th[i] = 90 - inc[i];
	}
	
	var mean = Pal.ArithmeticMean(th);

	var nSamples = th.length.toString();
	var arithmeticMean = Pal.FormatNumber(90 - mean.rt);
	var inverseVariance = Pal.FormatNumber(mean.rk);
	
	var aralevOutput = Pal.ARALEV(inc);
	var meanInclination = Pal.FormatNumber(aralevOutput.ainc)
	var precisionParameter = Pal.FormatNumber(aralevOutput.ak)
	var angularStandardDeviation = Pal.FormatNumber(aralevOutput.t63)
	var confidenceLimits95 = Pal.FormatNumber(aralevOutput.a95)
	var errorFlag = aralevOutput.ierr

	return {
		nSamples: nSamples,
		arithmeticMean: arithmeticMean,
		inverseVariance: inverseVariance,
		meanInclination: meanInclination,
		precisionParameter: precisionParameter,
		angularStandardDeviation: angularStandardDeviation,
		confidenceLimits95: confidenceLimits95,
		errorFlag: errorFlag
	}
};

Pal.GetPrecisionParameter = function (inclinations)
{
	var inputNumbers = inclinations

	var inc = [];
	var n = inputNumbers.length;
	var i;
	for (i = 0; i < n; i++)
	{
		inc[i] = Number(inputNumbers[i]);
	}

	var aralevOutput = Pal.ARALEVOnlyK(inc);

	return Pal.FormatNumber(aralevOutput.ak)
};

Pal.ARALEVOnlyK = function (xinc)
{
	var n = xinc.length;
	var output = {};
	var th = [];
	var dr;
	var s, s2, c, x, rt, rk, rt1, rk1, dk, dt;
	var the1, akap1, akap2, akap3, akap4;
	var xl1, xl2, xl3, xl4;

	/* Set constants */

	dr = 0.0174532925199433; /* Degrees to radians (pi/180) */
	output.ierr = 1;

	/* Check for illegal use */

	if (n === 1)
	{
		output.ak = -1;
		alert("ERROR: Only one or none observed inclination in ARALEV");
		return output;
	}

	/* Check if incl are out of range */

	var i;
	for (i = 0; i < n; i++)
	{
		if (!(xinc[i] >= -90 && xinc[i] <= 90))
		{
			output.ak = -1;
			alert("ERROR: Inclination data out of range [-90, +90] in ARALEV");
			return output;
		}
	}

	/* Check if all incl are identical */
	var same = true;
	for (i = 1; i < n; i++)
	{
		if (xinc[i] !== xinc[0])
		{
			same = false;
		}
	}

	if (same)
	{
		output.ak = 1e10;
		alert(" WARNING: All incl identical in ARALEV");
		return output;
	}

	/* Inclinations to co-inclinations */

	for (i = 0; i < n; i++)
	{
		th[i] = 90 - xinc[i];
	}

	/* Calculate arithmetic mean to use as first guess */

	s = 0;
	s2 = 0;
	c = 0;
	for (i = 0; i < n; i++)
	{
		s = s + th[i];
		s2 = s2 + th[i] * th[i];
		c = c + Math.cos(th[i] * dr);
	}
	c = c / n;

	rt = s / n;
	x = (s2 - s * s / n) * dr * dr;
	rk = 1e10;
	if (x / (n - 1) > 1e-10)
	{
		rk = (n - 1) / x;
	}
	rt1 = rt;
	rk1 = rk;

	/* Iterate in the interior to find solution to (theta, kappa) */
	/* Start iteration at arithmetic mean (theta, kappa) */

	rt = rt1;
	rk = rk1;

	the1 = rt;
	akap1 = rk;
	var j;
	var conv = false;
	for (j = 0; j < 10000; j++)
	{
		rt = Pal.AL1(th, rt, rk);
		rk = Pal.AL2(th, rt, rk);
		dt = Math.abs(rt - the1);
		dk = Math.abs((rk - akap1) / rk);
		the1 = rt;
		akap1 = rk;
		if (j > 10 && dt < 1e-6 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}

	akap1 = rk;
	xl1 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (theta = 0) */

	rt = 0;
	rk = rk1;
	x = 1 - c;
	if (x > 1e-10)
	{
		rk = 1 / x;
	}

	akap2 = rk;

	for (j = 0; j < 10000; j++)
	{
		x = Pal.Coth(rk) - c;
		if (x > 1e-10)
		{
			rk = 1 / x;
		}
		else
		{
			rk = 1e10;
		}
		dk = Math.abs((rk - akap2) / rk);
		akap2 = rk;
		if (j > 4 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}
	akap2 = rk;
	xl2 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (theta = 180) */


	rt = 180;
	rk = rk1;
	x = 1 + c;
	if (x > 1e-10)
	{
		rk = 1 / x;
	}

	akap3 = rk;
	for (j = 0; j < 10000; j++)
	{
		x = Pal.Coth(rk) + c;
		if (x > 1e-10)
		{
			rk = 1 / x;
		}
		else
		{
			rk = 1e10;
		}
		dk = Math.abs((rk - akap3) / rk);
		akap3 = rk;
		if (j > 4 && dk < 1e-6)
		{
			conv = true;
			break;
		}
	}
	akap3 = rk;
	xl3 = Pal.Xlik(th, rt, rk);

	/* Find the maximum on the edge (kappa = 0) */

	rt = 90;
	rk = 0;
	akap4 = rk;
	xl4 = Pal.Xlik(th, rt, rk);

	/* Use the best solution of the four */

	if (xl2 > xl1)
	{
		akap1 = akap2;
		xl1 = xl2;
	}
	if (xl3 > xl1)
	{
		akap1 = akap3;
		xl1 = xl3;
	}
	if (xl4 > xl1)
	{
		akap1 = akap4;
	}
	output.ak = akap1;

	return output;
};

Pal.GetInverseVariance = function (inclinations)
{
	var inputNumbers = inclinations

	var th = [];
	var inc = [];
	var n = inputNumbers.length;
	var i;
	for (i = 0; i < n; i++)
	{
		inc[i] = Number(inputNumbers[i]);
		th[i] = 90 - inc[i];
	}

	var mean = Pal.ArithmeticMean(th);
	return Pal.FormatNumber(mean.rk)
};

/* Changes a number so that it has not to many extra digits. */
Pal.FormatNumber = function (num)
{
	return Math.round(100 * num) / 100;
};

Pal.Reset = function ()
{
	document.getElementById('result1').setAttribute('value', '');
	document.getElementById('result2').setAttribute('value', '');
	document.getElementById('result3').setAttribute('value', '');
	document.getElementById('result4').setAttribute('value', '');
	document.getElementById('result5').setAttribute('value', '');
	document.getElementById('result6').setAttribute('value', '');
	document.getElementById('result7').setAttribute('value', '');
	document.getElementById('result8').setAttribute('value', '');
	document.getElementById('result9').setAttribute('value', '');
	document.getElementById('textInput').value = '';
};
