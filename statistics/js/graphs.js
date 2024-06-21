function showGeographicAndTectonicPlot(geographic, tectonic) {

    /*
     * Function showGeographicAndTectonicPlot
     * Shows the extreme (geoographic & tectonic) coordinates for the Foltest module
     */

    const CHART_CONTAINER = "foldtest-geographic-container";
    const CHART_CONTAINER2 = "foldtest-tectonic-container";

    var dataSeriesGeographic = new Array();
    var dataSeriesTectonic = new Array();

    geographic.forEach(function (components) {

        components.forEach(function (component) {

            // Go over each step
            var direction = literalToCoordinates(component.coordinates).toVector(Direction);

            dataSeriesGeographic.push({
                "component": component,
                "x": direction.dec,
                "y": projectInclination(direction.inc),
                "inc": direction.inc,
            });

        });

    });

    tectonic.forEach(function (components) {

        components.forEach(function (component) {

            // Go over each step
            var direction = literalToCoordinates(component.coordinates).toVector(Direction);

            dataSeriesTectonic.push({
                "component": component,
                "x": direction.dec,
                "y": projectInclination(direction.inc),
                "inc": direction.inc,
            });

        });

    });

    var dataSeries = [{
        "name": "Geomagnetic Directions",
        "type": "scatter",
        "data": dataSeriesGeographic
    }];

    var dataSeries2 = [{
        "name": "Geomagnetic Directions",
        "type": "scatter",
        "data": dataSeriesTectonic
    }];

    eqAreaChart(CHART_CONTAINER, dataSeries);
    eqAreaChart(CHART_CONTAINER2, dataSeries2);

}

function bootstrapFoldtest() {

    /*
     * Function bootstrapFoldtest
     * Completes the classical foldtest but does a bootstrap on N randomly sampled data sets
     */

    const NUMBER_OF_BOOTSTRAPS = 1000;
    const NUMBER_OF_BOOTSTRAPS_SAVED = 50;
    const progressBarElement = $("#foldtest-progress");

    // Get a list of the selected sites
    var collections = getSelectedCollections();

    if (collections.length === 0) {
        return notify("danger", "Select at least one collection.");
    }

    if (foldtestRunning) {
        return notify("warning", "The foldtest module is already running.");
    }

    foldtestRunning = true;

    // Get the components for each site (no cutoff applied)
    var cutoffCollectionsG = collections.map(function (collection) {
        return collection.components.map(x => x.inReferenceCoordinates("geographic"));
    });

    // The same for tectonic coordinates
    var cutoffCollectionsT = collections.map(function (collection) {
        return collection.components.map(x => x.inReferenceCoordinates("tectonic"));
    });

    // Show the extremes
    showGeographicAndTectonicPlot(cutoffCollectionsG, cutoffCollectionsT);

    // Combine all geographic components to a single array
    var vectors = [].concat(...cutoffCollectionsG);

    var untilts = [];
    var savedBootstraps = [];

    // Save the unfolding of actual data
    savedBootstraps.push(unfold(vectors, 0).taus);
    // savedBootstraps.push(unfoldInclinationOnly(vectors).inverseVariances);
    //
    // No bootstrap, only unfold the data
    if (!document.getElementById("foldtest-bootstrap-checkbox").checked) {
        return plotFoldtestCDF(untilts, savedBootstraps);
    }

    var result, next;
    var iteration = 0;

    // Asynchronous bootstrapping
    (next = function () {

        // Number of bootstraps were completed
        if (++iteration > NUMBER_OF_BOOTSTRAPS) {
            return plotFoldtestCDF(untilts, savedBootstraps);
        }

        // drawBootstrap generates a random array
        result = unfold(drawBootstrap(vectors), iteration);
        // result = unfoldInclinationOnly(drawBootstrap(vectors), iteration);

        // Save the index of maximum untilting
        untilts.push(result.index);

        // Save the first N bootstraps
        if (iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
            savedBootstraps.push(result.taus);
        }

        // Update the DOM progress bar with the percentage completion
        progressBarElement.css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

        // Queue for next bootstrap but release UI thread
        setTimeout(next);

    })();

}

var shallowingRunning = false;
var foldtestRunning = false;

function bootstrapShallowing() {

    /*
     * Function bootstrapShallowing
     * Bootstraps the inclination shallowing module
     */

    function formatHSArray(x) {

        /*
         * Function formatHSArray
         * Formats the derived elongation, flattening as a highcharts point object
         */

        return {
            "x": x.inclination,
            "y": x.elongation,
            "f": x.flattening
        }

    }

    const NUMBER_OF_BOOTSTRAPS = 1000;
    const NUMBER_OF_BOOTSTRAPS_SAVED = 25;
    const NUMBER_OF_COMPONENTS_REQUIRED = 80;

    const progressBarElement = $("#shallowing-progress");

    // Get the single selected site
    var collections = getSelectedCollections();

    if (collections.length === 0) {
        return notify("danger", "No collections are selected.");
    }

    if (collections.length > 1) {
        return notify("danger", "Only one collection may be selected.");
    }

    if (shallowingRunning) {
        return notify("warning", "The inclination shallowing module is already running.");
    }

    // Get the vector in the reference coordinates
    var dirs = doCutoff(collections[0].components.map(x => x.inReferenceCoordinates())).components;

    dirs = dirs.filter(x => !x.rejected);

    if (dirs.length < NUMBER_OF_COMPONENTS_REQUIRED) {
        notify("warning", "A minimum of " + NUMBER_OF_COMPONENTS_REQUIRED + " components is recommended.");
    }

    shallowingRunning = true;

    var nIntersections = 0;
    var bootstrapIteration = 0;

    var inclinations = new Array();

    var originalInclination = meanDirection(dirs.map(x => x.coordinates)).inc;
    var originalUnflatted = unflattenDirections(dirs);

    var savedBootstraps = new Array();

    // Original data does not have an intersection with TK03.GAD
    if (originalUnflatted !== null) {
        savedBootstraps.push(originalUnflatted.map(formatHSArray));
        unflattenedInclination = originalUnflatted[originalUnflatted.length - 1].inclination;
    } else {
        savedBootstraps.push({"x": null, "y": null});
        unflattenedInclination = null;
    }

    // No bootstrap requested
    if (!document.getElementById("shallowing-bootstrap-checkbox").checked) {
        return EICompletionCallback(inclinations, originalInclination, unflattenedInclination, savedBootstraps);
    }

    var next;
    var iteration = 0;

    // Asynchronous bootstrapping
    (next = function () {

        progressBarElement.css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

        // Bootstrapp completed: finish
        if (++iteration > NUMBER_OF_BOOTSTRAPS) {
            return EICompletionCallback(inclinations, originalInclination, unflattenedInclination, savedBootstraps);
        }

        var result = unflattenDirections(drawBootstrap(dirs));

        // No intersection with TK03.GAD: proceed immediately next bootstrap
        if (result === null) {
            return setTimeout(next);
        }

        // Save the first 24 bootstraps
        if (iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
            savedBootstraps.push(result.map(formatHSArray));
        }

        // Save the inclination of intersection
        inclinations.push(result.pop().inclination);

        // Queue for next bootstrap
        setTimeout(next);

    })();

}

function EICompletionCallback(inclinations, originalInclination, unflattenedInclination, bootstraps) {

    /*
     * Function EICompletionCallback
     * Callback fired when the EI module has completed
     */

    // Unlock
    shallowingRunning = false;
    $("#shallowing-progress").css("width", "0%");

    // Initialize the two charts
    plotEIBootstraps(bootstraps, inclinations.length);
    plotEICDF(inclinations, originalInclination, unflattenedInclination);

}

function EIBootstrapTooltipFormatter() {

    /*
     * Function EIBootstrapTooltipFormatter
     * Formatter for the EI bootstrap chart
     */

    if (this.series.name == "Bootstraps") {
        return [
            "<b>Unflattened Collection</b>",
            "<b>Inclination: </b> " + this.x.toFixed(3),
            "<b>Elongation: </b>" + this.y.toFixed(3),
            "<b>Flattening factor </b> at " + this.point.f
        ].join("<br>");
    } else {
        return [
            "<b>TK03.GAD Expected Elongation</b>",
            "<b>Inclination: </b>" + this.x,
            "<b>Elongation: </b>" + this.y.toFixed(3)
        ].join("<br>");
    }

}

function getPolynomialSeries(min, max) {

    /*
     * Function getPolynomialSeries
     * Gets the TK03.GAD Polynomial as a Highcharts data array from min to max
     */

    const MINIMUM_LATITUDE = -90;
    const MAXIMUM_LATITUDE = +90;

    var TK03Poly = new Array();

    for (var i = MINIMUM_LATITUDE; i <= MAXIMUM_LATITUDE; i++) {
        TK03Poly.push({
            "x": i,
            "y": TK03Polynomial(i)
        });
    }

    return TK03Poly;

}

function plotEIBootstraps(bootstraps, totalBootstraps) {

    /*
     * Function plotEIBootstraps
     * Plotting function for the EI bootstraps
     */

    const CHART_CONTAINER = "ei-bootstrap-container";

    // Define the initial series (TK03.GAD Polynomial) and the unflattening of the actual non-bootstrapped data (kept in data[0])
    var mySeries = [{
        "name": "TK03.GAD Polynomial",
        "data": getPolynomialSeries(),
        "dashStyle": "ShortDash",
        "lineWidth": 3,
        "zIndex": 100,
        "type": "spline",
        "marker": {
            "enabled": false
        }
    }, {
        "name": "Bootstraps",
        "color": HIGHCHARTS_PINK,
        "id": "bootstrap",
        "type": 'spline',
        "data": bootstraps.shift(),
        "zIndex": 100,
        "lineWidth": 3,
        "marker": {
            "enabled": false,
            "symbol": "circle",
        }
    }]

    // Add the other bootstraps
    bootstraps.forEach(function (bootstrap) {
        mySeries.push({
            "data": bootstrap,
            "type": "spline",
            "color": PLOTBAND_COLOR_BLUE,
            "linkedTo": "bootstrap",
            "enableMouseTracking": false,
            "marker": {
                "enabled": false
            }
        })
    });

    new Highcharts.chart(CHART_CONTAINER, {
        "chart": {
            "id": "EI-bootstraps",
            "zoomType": "x"
        },
        "title": {
            "text": "Bootstrapped E-I Pairs",
        },
        "subtitle": {
            "text": "Found " + totalBootstraps + " bootstrapped intersections with the TK03.GAD Field Model (" + COORDINATES + " coordinates)"
        },
        "exporting": {
            "filename": "TK03-EI",
            "sourceWidth": 1200,
            "sourceHeight": 600,
            "buttons": {
                "contextButton": {
                    "symbolStroke": "#7798BF",
                    "align": "right"
                }
            }
        },
        "xAxis": {
            "min": -90,
            "max": 90,
            "title": {
                "text": "Inclination (°)"
            }
        },
        "yAxis": {
            "floor": 1,
            "ceiling": 3,
            "title": {
                "text": "Elongation (τ2/τ3)"
            },
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
            "href": ""
        },
        "plotOptions": {
            "series": {
                "turboThreshold": 0,
                "point": {
                    "events": {
                        "click": plotUnflattenedData
                    }
                }
            }
        },
        "tooltip": {
            "formatter": EIBootstrapTooltipFormatter
        },
        "series": mySeries
    });

}


function plotUnfoldedData() {

    const CHART_CONTAINER = "modal-container";

    if (this.series.name !== "Bootstraps") {
        return;
    }

    var unfolding = this.x;

    // Get the single selected site
    var collections = getSelectedCollections();

    // Get the components for each site (no cutoff)
    var cutoffCollectionsG = collections.map(function (collection) {
        return collection.components.map(x => x.inReferenceCoordinates("geographic"));
    });

    // Combine all geographic components to a single array
    var dirs = new Array().concat(...cutoffCollectionsG);

    // Also check in the original data for plotting
    var originalData = dirs.map(function (component) {

        var direction = literalToCoordinates(component.coordinates).toVector(Direction);

        return {
            "component": component,
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc
        }

    });

    // Apply the King, 1966 flattening factor
    var unfoldedData = dirs.map(function (component) {

        var direction = literalToCoordinates(component.coordinates).correctBedding(component.beddingStrike, 1E-2 * unfolding * component.beddingDip).toVector(Direction);

        return {
            "component": component,
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc
        }

    });

    var plotData = [{
        "name": "Unfolded Directions",
        "data": unfoldedData,
        "type": "scatter",
        "marker": {
            "symbol": "circle"
        }
    }, {
        "name": "Original Directions",
        "type": "scatter",
        "data": originalData,
        "enableMouseTracking": false,
        "color": "lightgrey"
    }, {
        "linkedTo": ":previous",
        "type": "line",
        "data": createConnectingLine(originalData, unfoldedData),
        "color": "lightgrey",
        "marker": {
            "enabled": false
        },
        "enableMouseTracking": false,
    }];


    // Update the chart title
    document.getElementById("modal-title").innerHTML = "Geomagnetic Directions at <b>" + unfolding + "</b>% unfolding.";
    eqAreaChart(CHART_CONTAINER, plotData);

    // Show the modal
    $("#map-modal-2").modal("show");

}

function plotUnflattenedData() {

    /*
     * Function plotUnflattenedData
     * Plots unflattened data at a given flattening factor
     */

    const CHART_CONTAINER = "modal-container";

    if (this.series.name !== "Bootstraps") {
        return;
    }

    var flattening = this.f;

    // Get the single selected site
    var collections = getSelectedCollections();

    // Get the vector in the reference coordinates
    var dirs = doCutoff(collections[0].components.map(x => x.inReferenceCoordinates())).components;
    dirs = dirs.filter(x => !x.rejected);

    // Apply the King, 1966 flattening factor
    var unflattenData = dirs.map(function (component) {

        var direction = literalToCoordinates(component.coordinates).toVector(Direction);

        // Unflatten inclination at the requested flattening factor
        var uInclination = Math.atan(Math.tan(direction.inc * RADIANS) / flattening) / RADIANS;

        return {
            "component": component,
            "x": direction.dec,
            "y": projectInclination(uInclination),
            "inc": uInclination
        }

    });

    // Also check in the original data for plotting
    var originalData = dirs.map(function (component) {

        var direction = literalToCoordinates(component.coordinates).toVector(Direction);

        return {
            "component": component,
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc
        }

    });

    var plotData = [{
        "name": "Unflattened Directions",
        "data": unflattenData,
        "type": "scatter",
        "marker": {
            "symbol": "circle"
        }
    }, {
        "name": "Original Directions",
        "type": "scatter",
        "data": originalData,
        "enableMouseTracking": false,
        "color": "lightgrey"
    }, {
        "linkedTo": ":previous",
        "type": "line",
        "data": createConnectingLine(originalData, unflattenData),
        "color": "lightgrey",
        "marker": {
            "enabled": false
        },
        "enableMouseTracking": false,
    }];

    // Update the chart title
    document.getElementById("modal-title").innerHTML = "Unflattened Directions with factor <b>" + flattening + "</b>.";
    eqAreaChart(CHART_CONTAINER, plotData);

    // Show the modal
    $("#map-modal-2").modal("show");

}

function createConnectingLine(one, two) {

    var lines = new Array();

    one.forEach(function (x, i) {
        lines.push({
            "x": one[i].x,
            "y": one[i].y
        }, {
            "x": two[i].x,
            "y": two[i].y
        }, {
            "x": null,
            "y": null
        });
    });

    return lines;

}

function getAverageInclination(cdf) {

    /*
     * Function getAverageInclination
     * Returns the average from the cumulative distribution
     */

    var sum = 0;

    cdf.forEach(function (x) {
        sum = sum + x.x;
    });

    return sum / cdf.length;

}

function getConfidence(cdf) {

    /*
     * Function getConfidence
     * Returns the upper and lower 2.5% of a cumulative distribution function
     */

    var array = cdf.map(x => x.x);

    var lower = array[parseInt(0.025 * array.length, 10)];
    var upper = array[parseInt(0.975 * array.length, 10)];

    return {lower, upper}

}

function getVerticalLine(x) {

    /*
     * Function getVerticalLine
     * Return a vertical line in a CDF chart from 0 -> 1 at position x
     */

    return new Array([x, 0], [x, 1]);

}

function plotEICDF(inclinations, originalInclination, unflattenedInclination) {

    /*
     * Function plotEICDF
     * Creates the CDF chart for the EI module
     */

    function tooltip() {

        /*
         * Function plotEICDF::tooltip
         * Handles tooltip for the EI CDF Chart
         */

        return [
            "<b>Cumulative Distribution </b>",
            "<b>Latitude: </b>" + this.x.toFixed(2),
            "<b>CDF: </b>" + this.point.y.toFixed(3)
        ].join("<br>");

    }

    const CHART_CONTAINER = "ei-cdf-container";

    // Calculate the cumulative distribution
    // And round to full degrees to get a nicer step function
    var cdf = getCDF(inclinations.map(x => Math.round(x)));

    // Get the lower and upper 2.5%
    var confidence = getConfidence(cdf);
    var lower = confidence.lower || -90;
    var upper = confidence.upper || 90;

    // Add the confidence plot band
    var plotBands = [{
        "id": "plotband",
        "color": PLOTBAND_COLOR_BLUE,
        "from": lower,
        "to": upper
    }];

    var mySeries = [{
        "name": "Original Inclination",
        "type": "line",
        "data": getVerticalLine(originalInclination),
        "color": HIGHCHARTS_PINK,
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    }];

    //Define the cumulative distribution function
    if (cdf.length) {

        // Calculate the average inclination of all bootstraps
        var averageInclination = getAverageInclination(cdf);

        mySeries.push({
            "name": "Cumulative Distribution",
            "data": cdf,
            "step": true,
            "marker": {
                "enabled": false
            }
        }, {
            "name": "Average Bootstrapped Inclination",
            "type": "line",
            "data": getVerticalLine(averageInclination),
            "color": HIGHCHARTS_ORANGE,
            "enableMouseTracking": false,
            "marker": {
                "enabled": false
            }
        });

    }

    // If the original data intersected with TK03.GAD
    if (unflattenedInclination !== null) {

        mySeries.push({
            "name": "Unflattened Inclination",
            "type": "line",
            "color": HIGHCHARTS_GREEN,
            "data": getVerticalLine(unflattenedInclination),
            "enableMouseTracking": false,
            "marker": {
                "enabled": false
            }
        });

    }

    mySeries.push({
        "color": HIGHCHARTS_BLUE,
        "name": "Confidence Interval",
        "lineWidth": 0,
        "marker": {
            "symbol": "square"
        },
        "events": {
            "legendItemClick": (function (closure) {
                return function (event) {
                    closure.forEach(function (plotBand) {
                        if (this.visible) {
                            this.chart.xAxis[0].removePlotBand(plotBand.id);
                        } else {
                            this.chart.xAxis[0].addPlotBand(plotBand);
                        }
                    }, this);
                }
            })(memcpy(plotBands))
        }
    });

    new Highcharts.chart(CHART_CONTAINER, {
        "chart": {
            "zoomType": "x"
        },
        "title": {
            "text": "Cumulative Distribution of bootstrapped TK03.GAD intersections",
        },
        "exporting": {
            "filename": "TK03_CDF",
            "sourceWidth": 1200,
            "sourceHeight": 600,
            "buttons": {
                "contextButton": {
                    "symbolStroke": "#7798BF",
                    "align": "right"
                }
            }
        },
        "subtitle": {
            "text": "<b>Original Inclination</b>: " + originalInclination.toFixed(2) + " <b>Unflattened Inclination</b>: " + (unflattenedInclination === null ? "NaN" : unflattenedInclination.toFixed(2)) + " <b>Bootstrapped Confidence</b>: " + lower.toFixed(2) + " to " + upper.toFixed(2) + " (" + COORDINATES + " coordinates)"
        },
        "xAxis": {
            "min": -90,
            "max": 90,
            "plotBands": plotBands,
            "title": {
                "text": "Inclination (°)"
            }
        },
        "plotOptions": {
            "series": {
                "turboThreshold": 0
            }
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
            "href": ""
        },
        "tooltip": {
            "formatter": tooltip
        },
        "yAxis": {
            "min": 0,
            "max": 1,
            "title": {
                "text": "Cumulative Distribution"
            }
        },
        "series": mySeries
    });

}

function unflattenDirections(data) {

    /*
     * Function unflattenDirections
     * Unflatted a list of directions towards the TK03.GAD polynomial
     */

    data = data.map(x => x.coordinates.toVector(Direction));

    // Get the tan of the observed inclinations (equivalent of tan(Io))
    var tanInclinations = data.map(x => Math.tan(x.inc * RADIANS));

    var results = new Array();

    // Decrement over the flattening values f from 100 to 20
    // We will find f with a resolution of 1%
    for (var i = 100; i >= 20; i--) {

        // Flattening factor (from 1 to 0.2)
        var f = i / 100;

        // Unflattening function after King, 1955
        // (tanIo = f tanIf) where tanIo is observed and tanIf is recorded.
        // Create unflattenedData containing (dec, inc) pair for a particular f
        var unflattenedData = tanInclinations.map(function (x, i) {
            return new Direction(data[i].dec, Math.atan(x / f) / RADIANS)
        });

        // Calculate mean inclination for unflattenedData and get eigenvalues
        var meanInc = meanDirection(unflattenedData.map(x => x.toCartesian())).inc;
        var eigenvalues = getEigenvaluesFast(TMatrix(unflattenedData.map(x => x.toCartesian().toArray())));
        var elongation = eigenvalues.t2 / eigenvalues.t3;

        results.push({
            "flattening": f,
            "elongation": elongation,
            "inclination": meanInc
        });

        // In case we initially start above the TK03.GAD Polynomial
        // For each point check if we are above the polynomial; if so pop the parameters and do not save them
        // This simple algorithm finds the line below the TK03.GAD polynomial
        // Compare expected elongation with elongation from data from TK03.GAD
        // Only do this is Epoly < Edata
        // If there is more than 1 consecutive flattening factor in the array
        // This means we have a line under the TK03.GAD Polynomial
        // So we can return our parameters

        if (TK03Polynomial(meanInc) <= elongation) {

            if (results.length === 1) {
                results.pop();
                continue;
            }

            return results;

        }

    }

    // No intersection with TK03.GAD polynomial
    return null;

}

function TK03Polynomial(inclination) {

    /*
     * Function polynomial
     * Plots the foldtest data (coefficients taken from Pmag.py (Lisa Tauxe))
     */

    const COEFFICIENTS = [
        +3.15976125E-06,
        -3.52459817E-04,
        -1.46641090E-02,
        +2.89538539E+00
    ];

    // Symmetrical
    var inc = Math.abs(inclination);

    // Polynomial coefficients
    return COEFFICIENTS[0] * Math.pow(inc, 3) + COEFFICIENTS[1] * Math.pow(inc, 2) + COEFFICIENTS[2] * inc + COEFFICIENTS[3];

}

function plotFoldtestCDF(untilt, savedBootstraps) {

    /*
     * Function plotFoldtestCDF
     * Plots the foldtest data
     */

    function tooltip() {

        if (this.series.name === "Bootstraps") {
            return [
                "<b>Original Data</b>",
                "<b>Unfolding Percentage</b>: " + this.x + "%",
                "<b>Maximum Eigenvalue</b>: " + this.y.toFixed(3)
            ].join("<br>");
        } else if (this.series.name === "CDF") {
            return [
                "<b>Cumulative Probability</b>",
                "<b>Unfolding Percentage</b>: " + this.x + "%",
                "<b>Probability</b>: " + this.y.toFixed(3)
            ].join("<br>");
        }

    }

    // Release the test
    foldtestRunning = false;
    $("#foldtest-progress").css("width", "0%");

    const CHART_CONTAINER = "foldtest-full-container";
    const UNFOLDING_MIN = -50;
    const UNFOLDING_MAX = 150;

    var cdf = getCDF(untilt);
    var lower = untilt[parseInt(0.025 * cdf.length, 10)] || UNFOLDING_MIN;
    var upper = untilt[parseInt(0.975 * cdf.length, 10)] || UNFOLDING_MAX;

    // Create plotband for 95% bootstrapped confidence interval
    var plotBands = [{
        "id": "plotband",
        "color": PLOTBAND_COLOR_BLUE,
        "from": lower,
        "to": upper
    }];

    var mySeries = [{
        "name": "CDF",
        "type": "line",
        "step": true,
        "data": cdf,
        "marker": {
            "enabled": false
        }
    }, {
        "name": "Bootstraps",
        "type": "spline",
        "data": savedBootstraps.shift(),
        "id": "bootstraps",
        "color": "red",
        "zIndex": 10
    }]

    mySeries.push({
        "name": "Geographic Coordinates",
        "type": "line",
        "color": HIGHCHARTS_GREEN,
        "data": getVerticalLine(0),
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    }, {
        "name": "Tectonic Coordinates",
        "type": "line",
        "data": getVerticalLine(100),
        "color": HIGHCHARTS_ORANGE,
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    });

    savedBootstraps.forEach(function (bootstrap) {
        mySeries.push({
            "color": PLOTBAND_COLOR_BLUE,
            "data": bootstrap,
            "type": "spline",
            "linkedTo": "bootstraps",
            "enableMouseTracking": false,
        });
    });

    // The legend item click must contain a closure for the plotband data
    // Loop over the plotband data to add or remove it
    mySeries.push({
        "color": HIGHCHARTS_BLUE,
        "name": "Confidence Interval",
        "lineWidth": 0,
        "marker": {
            "symbol": "square"
        },
        "events": {
            "legendItemClick": (function (closure) {
                return function (event) {
                    closure.forEach(function (plotBand) {
                        if (this.visible) {
                            this.chart.xAxis[0].removePlotBand(plotBand.id);
                        } else {
                            this.chart.xAxis[0].addPlotBand(plotBand);
                        }
                    }, this);
                }
            })(memcpy(plotBands))
        }
    });

    new Highcharts.chart(CHART_CONTAINER, {
        "chart": {
            "id": "foldtest",
            "renderTo": "container5",
            "zoomType": "x"
        },
        "title": {
            "text": "Bootstrapped foldtest",
        },
        "subtitle": {
            "text": "highest τ1 between [" + lower + ", " + upper + "] % unfolding (" + cdf.length + " bootstraps)",
        },
        "exporting": {
            "filename": "Foldtest",
            "sourceWidth": 1200,
            "sourceHeight": 600,
            "buttons": {
                "contextButton": {
                    "symbolStroke": "#7798BF",
                    "align": "right"
                }
            }
        },
        "xAxis": {
            "min": UNFOLDING_MIN,
            "max": UNFOLDING_MAX,
            "tickInterval": 10,
            "pointInterval": 10,
            "title": {
                "text": "Percentage Unfolding"
            },
            "plotBands": plotBands
        },
        "yAxis": {
            "floor": 0,
            "ceiling": 1,
            "title": {
                "text": "τ1 (maximum eigenvalue)"
            }
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [Foldtest Module] - <i>after Tauxe et al., 2010 </i>",
            "href": ""
        },
        "tooltip": {
            "enabled": true,
            "formatter": tooltip
        },
        "plotOptions": {
            "spline": {
                "marker": {
                    "enabled": false
                },
                "point": {
                    "events": {
                        "click": plotUnfoldedData
                    }
                }
            }

        },
        "series": mySeries
    });

}

function unfoldInclinationOnly(vectors, type, iteration) {
    /*
     * Function unfold
     * Unfolds a bunch of vectors following their bedding
     */

    function inverseVarianceOfUnfoldedDirections(vectors, unfoldingPercentage) {

        // Do the tilt correction on all points in pseudoDirections
        var tilts = vectors.map(function (vector) {
            var coords = literalToCoordinates(vector.coordinates).correctBedding(vector.beddingStrike, 1E-2 * unfoldingPercentage * vector.beddingDip);
            return [coords.x, coords.y, coords.z]
        })
        var tiltsDecInc = cart2dir(math.matrix(tilts))
        var inclinations = tiltsDecInc._data.map((vector) => {
            return vector[1]
        })
        return Pal.GetInverseVariance(inclinations)
    }

    function arasonLevyOfUnfoldedDirections(vectors, unfoldingPercentage) {

        // Do the tilt correction on all points in pseudoDirections
        var tilts = vectors.map(function (vector) {
            var coords = literalToCoordinates(vector.coordinates).correctBedding(vector.beddingStrike, 1E-2 * unfoldingPercentage * vector.beddingDip);
            return [coords.x, coords.y, coords.z]
        })
        var tiltsDecInc = cart2dir(math.matrix(tilts))
        var inclinations = tiltsDecInc._data.map((vector) => {
            return vector[1]
        })
        return Pal.GetPrecisionParameter(inclinations)
    }

    const UNFOLDING_MIN = -50;
    const UNFOLDING_MAX = 150;
    const NUMBER_OF_BOOTSTRAPS_SAVED = 50;

    // Variable max to keep track of the maximum eigenvalue and its unfolding % index
    var max = 0;
    var index = 0;

    // Array to capture all maximum eigenvalues for one bootstrap over the unfolding range
    var invVariances = [];

    // For this particular random set of directions unfold from the specified min to max percentages
    // With increments of 10 degrees
    for (var i = UNFOLDING_MIN; i <= UNFOLDING_MAX; i += 10) {

        // Calculate the eigenvalues
        var values
        if (type === 'inv') {
            values = inverseVarianceOfUnfoldedDirections(vectors, i)
        } else {
            values = arasonLevyOfUnfoldedDirections(vectors, i)
        }

        // Save the first 24 bootstraps
        if (iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
            invVariances.push({
                "x": i,
                "y": values
            });
        }

        if (values > max) {
            max = values;
            index = i;
        }

    }

    // Hone in with a granularity of a single degree
    for (var i = index - 9; i <= index + 9; i++) {

        // Only if within specified minimum and maximum bounds
        if (i < UNFOLDING_MIN || i > UNFOLDING_MAX) {
            continue;
        }

        // Calculate the eigenvalues
        var values
        if (type === 'inv') {
            values = inverseVarianceOfUnfoldedDirections(vectors, i)
        } else {
            values = arasonLevyOfUnfoldedDirections(vectors, i)
        }

        // Save the maximum eigenvalue for this bootstrap and unfolding increment
        if (values > max) {
            max = values;
            index = i;
        }

    }

    return {
        "index": index,
        "invVariances": invVariances
    }

}

function plotFoldtestInclinationOnly(untilt, savedBootstraps, type) {

    function tooltipIO() {

        if (this.series.name === "Bootstraps") {
            return [
                "<b>Original Data</b>",
                "<b>Unfolding Percentage</b>: " + this.x + "%",
                "<b>"+((type==='inv')?"Maximum inverse variance":"Maximum Arason-Levi (k)")+"</b>: " + this.y.toFixed(3)
            ].join("<br>");
        } else if (this.series.name === "CDF") {
            return [
                "<b>Cumulative Probability</b>",
                "<b>Unfolding Percentage</b>: " + this.x + "%",
                "<b>Probability</b>: " + this.y.toFixed(3)
            ].join("<br>");
        }

    }

    // Release the test
    foldtestRunning = false;
    $("#foldtest-inclination-only-progress").css("width", "0%");

    const CHART_CONTAINER = "foldtest-io-full-container";
    const UNFOLDING_MIN = -50;
    const UNFOLDING_MAX = 150;

    var cdf = getCDF(untilt);
    var lower = untilt[parseInt(0.025 * cdf.length, 10)];
    var upper = untilt[parseInt(0.975 * cdf.length, 10)];

    // Create plotband for 95% bootstrapped confidence interval
    var plotBands = [{
        "id": "plotband",
        "color": PLOTBAND_COLOR_BLUE,
        "from": lower,
        "to": upper
    }];

    var mySeries = [{
        "name": "Bootstraps",
        "type": "spline",
        "data": savedBootstraps.shift(),
        "id": "bootstraps",
        "color": "red",
        "zIndex": 10
    }]

    savedBootstraps.forEach(function (bootstrap) {
        mySeries.push({
            "color": PLOTBAND_COLOR_BLUE,
            "data": bootstrap,
            "type": "spline",
            "linkedTo": "bootstraps",
            "enableMouseTracking": false,
        });
    });

    // The legend item click must contain a closure for the plotband data
    // Loop over the plotband data to add or remove it
    mySeries.push({
        "color": HIGHCHARTS_BLUE,
        "name": "Confidence Interval",
        "lineWidth": 0,
        "marker": {
            "symbol": "square"
        },
        "events": {
            "legendItemClick": (function (closure) {
                return function (event) {
                    closure.forEach(function (plotBand) {
                        if (this.visible) {
                            this.chart.xAxis[0].removePlotBand(plotBand.id);
                        } else {
                            this.chart.xAxis[0].addPlotBand(plotBand);
                        }
                    }, this);
                }
            })(memcpy(plotBands))
        }
    });

    new Highcharts.chart(CHART_CONTAINER, {
        "chart": {
            "id": "foldtest-io",
            "renderTo": "container5",
            "zoomType": "x"
        },
        "title": {
            "text": "Bootstrapped Inclination Only Tilt Test",
        },
        "subtitle": {
            "text": ((type==='inv')?"Highest inverse variance":"Highest Arason-Levi (k)")+" between [" + lower + ", " + upper + "] % unfolding (" + cdf.length + " bootstraps)",
        },
        "exporting": {
            "filename": "Foldtest",
            "sourceWidth": 1200,
            "sourceHeight": 600,
            "buttons": {
                "contextButton": {
                    "symbolStroke": "#7798BF",
                    "align": "right"
                }
            }
        },
        "xAxis": {
            "min": UNFOLDING_MIN,
            "max": UNFOLDING_MAX,
            "tickInterval": 10,
            "pointInterval": 10,
            "title": {
                "text": "Percentage Unfolding"
            },
            "plotBands": plotBands
        },
        "yAxis": {
            "floor": 0,
            "ceiling": 500,
            "title": {
                "text": (type==='inv')?"Maximum inverse variance":"Maximum Arason-Levi (k)"
            }
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [Foldtest Module] - <i>after Tauxe et al., 2010 </i>",
            "href": ""
        },
        "tooltip": {
            "enabled": true,
            "formatter": tooltipIO
        },
        "plotOptions": {
            "spline": {
                "marker": {
                    "enabled": false
                },
                "point": {
                    "events": {
                        "click": plotUnfoldedData
                    }
                }
            }

        },
        "series": mySeries
    });

}

function unfold(vectors, iteration) {

    /*
     * Function unfold
     * Unfolds a bunch of vectors following their bedding
     */

    function eigenvaluesOfUnfoldedDirections(vectors, unfoldingPercentage) {
        /*
         * Function eigenvaluesOfUnfoldedDirections
         * Returns the three eigenvalues of a cloud of vectors at a percentage of unfolding
         */

        // Do the tilt correction on all points in pseudoDirections
        var tilts = vectors.map(function (vector) {
            return literalToCoordinates(vector.coordinates).correctBedding(vector.beddingStrike, 1E-2 * unfoldingPercentage * vector.beddingDip);
        });
        // Return the eigen values of a real, symmetrical matrix
        return getEigenvaluesFast(TMatrix(tilts.map(x => x.toArray())));

    }

    const UNFOLDING_MIN = -50;
    const UNFOLDING_MAX = 150;
    const NUMBER_OF_BOOTSTRAPS_SAVED = 24;

    // Variable max to keep track of the maximum eigenvalue and its unfolding % index
    var max = 0;
    var index = 0;

    // Array to capture all maximum eigenvalues for one bootstrap over the unfolding range
    var taus = [];

    // For this particular random set of directions unfold from the specified min to max percentages
    // With increments of 10 degrees
    for (var i = UNFOLDING_MIN; i <= UNFOLDING_MAX; i += 10) {

        // Calculate the eigenvalues
        var tau = eigenvaluesOfUnfoldedDirections(vectors, i);

        // Save the first 24 bootstraps
        if (iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
            taus.push({
                "x": i,
                "y": tau.t1
            });
        }

        if (tau.t1 > max) {
            max = tau.t1;
            index = i;
        }

    }

    // Hone in with a granularity of a single degree
    for (var i = index - 9; i <= index + 9; i++) {

        // Only if within specified minimum and maximum bounds
        if (i < UNFOLDING_MIN || i > UNFOLDING_MAX) {
            continue;
        }

        // Calculate the eigenvalues
        var tau = eigenvaluesOfUnfoldedDirections(vectors, i);

        // Save the maximum eigenvalue for this bootstrap and unfolding increment
        if (tau.t1 > max) {
            max = tau.t1;
            index = i;
        }

    }

    return {
        "index": index,
        "taus": taus
    }

}

function getEigenvaluesFast(T) {

    /*
     * Function getEigenvaluesFast
     * Algorithm to find eigenvalues of a symmetric, real matrix.
     * We need to compute the eigenvalues for many (> 100.000) real, symmetric matrices (Orientation Matrix T).
     * Calling available libraries (Numeric.js) is much slower so we implement this algorithm instead.
     * Publication: O.K. Smith, Eigenvalues of a symmetric 3 × 3 matrix - Communications of the ACM (1961)
     * See https://en.wikipedia.org/wiki/Eigenvalue_algorithm#3.C3.973_matrices
     */

    // Calculate the trace of the orientation matrix
    // 3m is equal to the trace
    var m = (T[0][0] + T[1][1] + T[2][2]) / 3;

    // Calculate the sum of squares
    var p1 = Math.pow(T[0][1], 2) + Math.pow(T[0][2], 2) + Math.pow(T[1][2], 2);
    var p2 = Math.pow((T[0][0] - m), 2) + Math.pow((T[1][1] - m), 2) + Math.pow((T[2][2] - m), 2) + 2 * p1;

    // 6p is equal to the sum of squares of elements
    var p = Math.sqrt(p2 / 6);

    // Identity Matrix I and empty storage matrix B
    var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

    for (var i = 0; i < 3; i++) {
        for (var k = 0; k < 3; k++) {
            B[i][k] = (1 / p) * (T[i][k] - m * I[i][k]);
        }
    }

    // Half determinant of matrix B.
    var r = 0.5 * numeric.det(B);

    var phi;
    if (r <= -1) {
        phi = Math.PI / 3;
    } else if (r >= 1) {
        phi = 0;
    } else {
        phi = Math.acos(r) / 3;
    }

    // Calculate the three eigenvalues
    var eig1 = m + 2 * p * Math.cos(phi);
    var eig3 = m + 2 * p * Math.cos(phi + (2 * Math.PI / 3));

    // Last eigenvector can be derived
    var eig2 = 3 * m - eig1 - eig3;

    // Normalize eigenvalues
    var tr = eig1 + eig2 + eig3;

    return {
        "t1": eig1 / tr,
        "t2": eig2 / tr,
        "t3": eig3 / tr
    }

}

function getSelectedComponents() {

    /*
     * Function getSelectedComponents
     * Gets all the components from all collections as if it was a single collection
     */

    var components = new Array();

    getSelectedCollections().forEach(function (collection) {

        // Get the components in the correct coordinate system
        var collectionComponents = collection.components.map(x => x.inReferenceCoordinates());
        components = components.concat(collectionComponents);

    });

    return components;

}

function createCTMDGrid() {

    /*
     * Function createCTMDGrid
     * Creates the CTMD grid
     */
    document.getElementById('grid-overview-note').innerHTML = [
        "<small class='text-muted'>* This calculation is an estimate. Correct data is calculated in pairs.</small>"
    ]

    var collections = getSelectedCollections();

    if (collections.length < 2) {
        return notify("danger", "Select two or more selections for the grid view.");
    }

    var names = collections.map(x => x.name);

    // Asynchronous call (using setTimeout)
    CTMDPermutations(collections, function (result) {

        // Create heatmap data series
        var success = new Array();
        var fail = new Array();

        result.forEach(function (x) {

            // Push to the correct data series
            if (x.match) {
                success.push({"x": x.i, "y": x.j}, {"x": x.j, "y": x.i})
            } else {
                fail.push({"x": x.i, "y": x.j}, {"x": x.j, "y": x.i});
            }

        });

        // Create the heat map
        CTMDHeatmapChart(names, success, fail);

    });

}

function CTMDHeatmapChart(names, match, noMatch) {

    /*
     * Function CTMDHeatmapChart
     * Creates a heatmap of all selected collection pairs
     */

    // Put a black square on the diagonal
    var empty = new Array();

    for (var i = 0; i < Math.sqrt(match.length + noMatch.length); i++) {
        empty.push({"x": i, "y": i});
    }

    new Highcharts.chart("permutation-table", {
        "chart": {
            "width": 600,
            "height": 600,
            "type": "heatmap",
        },
        "xAxis": {
            "categories": names,
            "tickInterval": 1,
            "gridLineWidth": 2,
            "tickLength": 0,
            "lineWidth": 1,
        },
        "title": {
            "text": "Common True Mean Directions",
        },
        "tooltip": {
            "formatter": function () {
                return [
                    "<b>Common True Mean Direction Results</b>",
                    "<b>Collection one:</b>" + this.series.yAxis.categories[this.point.y],
                    "<b>Collection two:</b>" + this.series.xAxis.categories[this.point.x]
                ].join("<br>");
            }
        },
        "subtitle": {
            "text": "Showing " + (Math.pow(empty.length, 2) - empty.length) + " permutations"
        },
        "credits": {
            "enabled": ENABLE_CREDITS
        },
        "yAxis": {
            "categories": names,
            "tickInterval": 1,
            "gridLineWidth": 2,
            "tickLength": 0,
            "lineWidth": 1
        },
        "plotOptions": {
            "heatmap": {
                "pointPadding": 1
            }
        },
        "series": [{
            "name": "Match",
            "data": match,
            "color": HIGHCHARTS_GREEN,
        }, {
            "name": "No Match",
            "data": noMatch,
            "color": HIGHCHARTS_RED
        }, {
            "showInLegend": false,
            "enableMouseTracking": false,
            "data": empty,
            "color": HIGHCHARTS_BLACK
        }]
    });

}

function simulateCTMDGrid(one, two) {

    /*
     * Function simulateCTMD
     * Does a single CTMD simulation
     */

    const NUMBER_OF_BOOTSTRAPS = 500;

    // Buckets for the coordinates
    var xOne = [];
    var xTwo = [];
    var yOne = [];
    var yTwo = [];
    var zOne = [];
    var zTwo = [];

    one = one.filter(x => !x.rejected);
    two = two.filter(x => !x.rejected);

    // Complete N bootstraps
    for (var i = 0; i < NUMBER_OF_BOOTSTRAPS; i++) {

        // Draw a random selection from the site
        var sampledOne = drawBootstrap(one);
        var sampledTwo = drawBootstrap(two);

        // Calculate the mean value
        var statisticsOne = getStatisticalParameters(sampledOne);
        var statisticsTwo = getStatisticalParameters(sampledTwo);

        // Get unit coordinates of mean
        var coordinatesOne = statisticsOne.dir.mean.unit().toCartesian();
        var coordinatesTwo = statisticsTwo.dir.mean.unit().toCartesian();

        // Make it a reversal test!
        if (coordinatesOne.angle(coordinatesTwo) > 90) {
            coordinatesOne = coordinatesOne.reflect();
        }

        // Save the coordinates
        xOne.push(coordinatesOne.x);
        yOne.push(coordinatesOne.y);
        zOne.push(coordinatesOne.z);

        xTwo.push(coordinatesTwo.x);
        yTwo.push(coordinatesTwo.y);
        zTwo.push(coordinatesTwo.z);

    }

    return {xOne, xTwo, yOne, yTwo, zOne, zTwo}

}


function CTMDPermutations(collections, callback) {

    /*
     * Function CTMDPermutations
     * Does CTMD test on all permutations of selected collections
     */

    function getPairs(collections) {

        /*
         * function CTMDPermutations::getPairs
         * Returns permutation pairs for all selected collections
         */

        var pairs = [];

        // All permutations: j starts after i
        for (var i = 0; i < collections.length; i++) {
            for (var j = i + 1; j < collections.length; j++) {

                // Create a permutation pair
                pairs.push({
                    "i": i,
                    "j": j,
                    "pair": [collections[i].components, collections[j].components].map(function (components) {
                        return doCutoff(components.map(x => x.inReferenceCoordinates())).components;
                    })
                });

            }
        }

        return pairs;

    }

    // Create collection permutations
    var pairs = getPairs(collections);

    var results = [];

    // Run through all permutations but non-blocking
    (next = function () {

        // Iteration can be stopped
        if (pairs.length === 0) {
            return callback(results);
        }

        var permutation = pairs.pop();

        // Simulate the current pair
        var result = simulateCTMDGrid(...permutation.pair)

        var x = {
            "one": getConfidence(getCDF(result.xOne)),
            "two": getConfidence(getCDF(result.xTwo))
        }

        var y = {
            "one": getConfidence(getCDF(result.yOne)),
            "two": getConfidence(getCDF(result.yTwo))
        }

        var z = {
            "one": getConfidence(getCDF(result.zOne)),
            "two": getConfidence(getCDF(result.zTwo))
        }

        // Check whether the two collections are statistically "equivalent"
        results.push({
            "i": permutation.i,
            "j": permutation.j,
            "match": doesMatchBootstrap(x, y, z)
        });

        // Proceed
        setTimeout(next);

    })();

}

function form_Q(a, b) {
    // a = np.matrix(a)
    a = math.matrix(a)

    // a = np.reshape(a, (3, 1))
    a = math.reshape(a, [3, 1])

    // b = np.matrix(b)
    b = math.matrix(b)

    // b = np.reshape(b, (3, 1))
    b = math.reshape(b, [3, 1])

    // c = b - a * (a.getT() * b)
    var c = math.subtract(b, math.multiply(a, math.multiply(math.transpose(a), b)))
    // c /= np.linalg.norm(c)
    c = math.divide(c, math.norm(math.transpose(c._data)[0]))

    // alpha = np.arccos(a.getT() * b)
    const prod = math.multiply(math.transpose(a), b)
    var alpha = math.map(prod, value => Math.acos(value))
    alpha = alpha._data[0][0]

    // A = a * c.getT() - c * a.getT()
    const A = math.subtract(math.multiply(a, math.transpose(c)), math.multiply(c, math.transpose(a)))

    // Q = np.eye(3) + np.multiply(np.sin(alpha), A) + np.multiply(np.cos(alpha) - 1, a * a.getT() + c * c.getT())
    const a_aT = math.multiply(a, math.transpose(a))
    const c_cT = math.multiply(c, math.transpose(c))
    const sin_alpha = math.sin(alpha)
    const sin_alpha_A = math.multiply(sin_alpha, A)
    const cos_alpha = math.cos(alpha)
    const cos_alpha_minus_1 = cos_alpha - 1
    const term3 = math.multiply(cos_alpha_minus_1, math.add(a_aT, c_cT))
    const eye = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const Q = math.add(eye, sin_alpha_A, term3)

    return Q
}

function form_Mhat(mhat) {
    // input - mhat, estimated sample mean direction
    // output - Mhat matrix according to equation 4

    var b = [[mhat._data[0]], [mhat._data[1]]];
    var c = mhat._data[2];

    var A1;
    if (c === 0) {
        A1 = math.subtract([[1, 0], [0, 1]], math.multiply(b, math.transpose(math.conj(b))))
    } else {
        var c_abs = math.abs(c)
        // Divide each element of the matrix c by its absolute value:
        var x = math.divide(c, c_abs)
        // Create the 2x2 identity matrix (np.eye(2)) and multiply element by element:
        var eye = [[1, 0], [0, 1]]
        var A = math.multiply(x, eye)
        // Calculate the square of the absolute value of each element of the matrix c:
        var square = math.square(c_abs)
        // Add the absolute value of each element of the matrix c with the square of the absolute value:
        var sum = math.sum(c_abs, square)
        // Divide each element of the matrix c by the sum calculated in the previous step:
        var div = math.divide(c, sum)
        // Calculate the Hermitian conjugate of the matrix b (b.getH()):
        var getH = math.transpose(math.conj(b))
        // Multiply element by element the matrix b by its Hermitian conjugate:
        var mul_getH = math.multiply(b, getH)
        // Multiply each element of the matrix calculated in step 6 by the matrix calculated in step 8:
        var B = math.multiply(div, mul_getH)
        A1 = math.subtract(A, B)
    }

    var A2 = [[-b[0][0]], [-b[1][0]]];
    var Mhat = [[A1[0][0], A1[0][1], A2[0][0]], [A1[1][0], A1[1][1], A2[1][0]]];
    return Mhat;
}

function form_Ghat(X, Mhat) {
    // input - X, collection of directions (one per column)
    // input - Mhat, Mhat matrix for mean direction
    // output - Ghat matrix according to equation 5

    // n = np.shape(X)[1]
    const n = X[0].length;
    // term1 = np.power(np.linalg.norm(np.sum(X, axis=1) / n), -2) / n
    const term1 = Math.pow(math.norm(math.divide(math.sum(X, 1), n)), -2) / n
    // X = np.matrix(X)
    X = math.matrix(X)
    // Mhat_T = Mhat.getT()
    const Mhat_T = math.transpose(Mhat)
    // Ghat = np.matrix(np.zeros((2, 2)))
    let Ghat = math.zeros([2, 2])

    for (let u = 0; u < 2; u++) {
        for (let v = 0; v < 2; v++) {
            // Ghat[u][v] = 0;
            for (let i = 0; i < n; i++) {
                // Select the column u of the Mhat_T matrix:
                var col_u = math.column(Mhat_T, u)
                // Transpose the selected column:
                var colU_T = math.transpose(col_u)
                // Select column i of the X matrix:
                var col_i = math.column(X, i)
                // Calculate the external product of the transpose of column u and column i:
                var prod = math.multiply(colU_T, col_i)
                // Select column i of matrix X and transpose it:
                var colI_T = math.transpose(col_i)
                // Calculate the outer product of the matrix calculated in step 4 and the matrix calculated in step 5:
                var prod2 = math.multiply(prod, colI_T)
                // Select column v of the Mhat_T matrix:
                var col_v = math.column(Mhat_T, v)
                // Calculate the outer product of the matrix calculated in step 6 and column v:
                var innerProduct = math.multiply(prod2, col_v)
                Ghat[u][v] += innerProduct._data[0][0]
            }
            Ghat[u][v] *= term1;
        }
    }

    return Ghat;
}

function dir2cart(d) {
    // Converts a list or array of vector directions in degrees (declination, inclination)
    // to an array of the direction in cartesian coordinates (x,y,z).

    // Parameters
    // ----------
    // d : list or array of [dec,inc] or [dec,inc,intensity]
    // Returns
    // -------
    // cart : array of [x,y,z]

    const rad = Math.PI / 180;
    let ints = Array.isArray(d[0]) ? d.map(() => 1) : [1];
    d = Array.isArray(d[0]) ? d : [d];

    const cart = d.map((vector) => {
        const dec = vector[0] * rad;
        const inc = vector[1] * rad;
        const int = vector.length === 3 ? vector[2] : 1;

        return [
            int * Math.cos(dec) * Math.cos(inc),
            int * Math.sin(dec) * Math.cos(inc),
            int * Math.sin(inc),
        ];
    });

    return cart.length === 1 ? cart[0] : cart;
}

function cart2dir(cart) {
    const rad = Math.PI / 180;  // constante para convertir grados a radianes
    cart = math.matrix(cart)

    let Xs_m, Ys_m, Zs_m;
    if (cart._size.length > 1) {
        Xs_m = math.column(cart, 0);
        Ys_m = math.column(cart, 1);
        Zs_m = math.column(cart, 2);
    } else {
        Xs_m = cart.get([0]);
        Ys_m = cart.get([1]);
        Zs_m = cart.get([2]);
    }

    if (math.isComplex(Xs_m)) {
        Xs_m = math.re(Xs_m);
    }
    if (math.isComplex(Ys_m)) {
        Ys_m = math.re(Ys_m);
    }
    if (math.isComplex(Zs_m)) {
        Zs_m = math.re(Zs_m);
    }

    var Xs = []
    var Ys = []
    var Zs = []
    for (let value of Xs_m) {
        Xs.push(value.value)
    }
    for (let value of Ys_m) {
        Ys.push(value.value)
    }
    for (let value of Zs_m) {
        Zs.push(value.value)
    }

    const Xs2 = math.map(Xs, x => x ** 2)
    const Ys2 = math.map(Ys, y => y ** 2)
    const Zs2 = math.map(Zs, z => z ** 2)

    const XYZadd = math.add(Xs2, math.add(Ys2, Zs2))

    const Rs = math.map(XYZadd, x => Math.sqrt(x))

    // Calcular declinación teniendo en cuenta los cuadrantes correctos (arctan2) y
    // aplicando el módulo 360.
    const arctan2 = math.map(Ys, (y, index) => math.atan2(y, Xs[index]))
    const arctan2_d = math.divide(arctan2, rad)
    const Decs = math.mod(arctan2_d, 360)

    try {
        // Calcular la inclinación (convirtiendo a grados) #
        const Incs = math.divide(math.map(Zs, (x, index) => Math.asin(x / Rs[index])), rad)
        const directionArray = math.ctranspose(math.matrix([Decs, Incs, Rs]));
        return math.squeeze(directionArray)
    } catch (error) {
        console.log('Problema en cart2dir');  // probablemente división por cero en algún lugar
        return math.zeros([3]);
    }
}

function linspace(start, end, numPoints) {
    const step = (end - start) / (numPoints - 1);
    return Array.from({length: numPoints}, (_, index) => start + step * index);
}

// Función de interpolación cúbica
function interp(x, xp, fp) {
    // Verificar si los arreglos de entrada tienen la misma longitud
    if (xp.length !== fp.length) {
        throw new Error("Los arreglos de entrada deben tener la misma longitud.");
    }

    // Encontrar los índices donde x estaría ubicado en el arreglo xp
    var i = 1;
    while (i < xp.length && x > xp[i]) {
        i++;
    }

    // Calcular la interpolación lineal
    var x0 = xp[i - 1];
    var x1 = xp[i];
    var f0 = fp[i - 1];
    var f1 = fp[i];

    return f0 + ((f1 - f0) / (x1 - x0)) * (x - x0);
}

function find_CMDT_CR(Ahat, Tc, mhat12) {
    var eigen = math.eigs(Ahat)

    const D = eigen.values.reverse()
    const V = eigen.eigenvectors.reverse()
    var mCI = math.zeros([3, 201])
    var y = math.matrix(math.zeros([3, 1]))
    y = y.toArray()

    for (var i = 0; i < 201; i++) {
        var theta = i * Math.PI / 100
        var ylen = math.zeros(201)
        ylen = ylen.toArray()
        var phi = linspace(0, Math.PI / 2, 201)
        for (var j = 0; j < 201; j++) {
            y[0] = (math.sin(phi[j]) * math.cos(theta) * math.sqrt(Tc)) / math.sqrt(D[0])
            y[1] = (math.sin(phi[j]) * math.sin(theta) * math.sqrt(Tc)) / math.sqrt(D[1])
            y[2] = (math.cos(phi[j]) * math.sqrt(Tc)) / math.sqrt(D[2])
            ylen[j] = math.norm(y)
        }
        var idx = math.range(0, ylen.length)
        idx = math.sort(idx, (a, b) => ylen[a] - ylen[b])
        idx = idx.toArray()

        const phi0 = interp(
            1.0,
            idx.map(index => ylen[index]),
            idx.map(index => phi[index])
        )

        y[0] = math.sin(phi0) * math.cos(theta) * math.sqrt(Tc) / math.sqrt(D[0])
        y[1] = math.sin(phi0) * math.sin(theta) * math.sqrt(Tc) / math.sqrt(D[1])
        y[2] = math.cos(phi0) * math.sqrt(Tc) / math.sqrt(D[2])

        y = math.reshape(y, [y.length, 1])
        var V_matrix = [V[0].vector, V[1].vector, V[2].vector]
        V_matrix = math.transpose(V_matrix)
        V_matrix = math.multiply(V_matrix, -1) // TODO: REVISAR POR QUÉ APARECE CON LOS SIGNOS CONTRARIOS
        var result = math.multiply(V_matrix, y)
        var flatten = math.flatten(result)
        for (let row = 0; row < mCI.length; row++) {
            mCI[row][i] = flatten[row];
        }
    }

    const mCIbar = math.divide(math.mean(mCI, 1), math.norm(math.mean(mCI, 1)))

    const crossProduct = math.cross(math.transpose(mhat12), mCIbar);
    const dotProduct = math.dot(math.transpose(mhat12), mCIbar);

    // Calcula la norma del producto cruzado
    const normCrossProduct = math.norm(crossProduct);

    // Calcula la arco tangente y verifica la condición
    if (Math.atan2(normCrossProduct, dotProduct) > Math.PI / 2) {
        // Multiplica mCI por -1
        mCI = math.multiply(mCI, -1);
    }
    // console.log('mCI', mCI)
    return mCI
}


function simulateCTMD(one, two, grid, containers) {

    /*
     * Function simulateCTMD
     * Does a single CTMD simulation
     */

    let NUMBER_OF_BOOTSTRAPS
    if (grid) {
        NUMBER_OF_BOOTSTRAPS = 500
    } else {
        NUMBER_OF_BOOTSTRAPS = 1000
    }


    // Buckets for the coordinates
    var xOne = [];
    var xTwo = [];
    var yOne = [];
    var yTwo = [];
    var zOne = [];
    var zTwo = [];

    one = one.filter(x => !x.rejected);
    two = two.filter(x => !x.rejected);

    for (let c of one) {
        xOne.push(c.coordinates.x)
        yOne.push(c.coordinates.y)
        zOne.push(c.coordinates.z)
    }

    for (let c of two) {
        xTwo.push(c.coordinates.x)
        yTwo.push(c.coordinates.y)
        zTwo.push(c.coordinates.z)
    }

    var X1 = math.matrix([xOne, yOne, zOne])
    var X2 = math.matrix([xTwo, yTwo, zTwo])

    xOne = []
    xTwo = []
    yOne = []
    yTwo = []
    zOne = []
    zTwo = []

    const n1 = X1._size[1]
    const n2 = X2._size[1]
    const n = n1 + n2

    const X12 = math.concat(X1, X2, 1)

    var mhat1 = math.mean(X1, 1)
    mhat1 = math.divide(mhat1, math.norm(mhat1))
    var mhat2 = math.mean(X2, 1)
    mhat2 = math.divide(mhat2, math.norm(mhat2))
    var mhat12 = math.mean(X12, 1)
    mhat12 = math.divide(mhat12, math.norm(mhat12))

    const Mhat1 = form_Mhat(mhat1)
    const Ghat1 = form_Ghat(X1._data, Mhat1)

    const Mhat2 = form_Mhat(mhat2)
    const Ghat2 = form_Ghat(X2._data, Mhat2)

    const Ahat1 = math.multiply(math.conj(math.transpose(Mhat1)), math.multiply(math.inv(Ghat1), Mhat1))
    const Ahat2 = math.multiply(math.conj(math.transpose(Mhat2)), math.multiply(math.inv(Ghat2), Mhat2))
    var Ahat = math.add(Ahat1, Ahat2)
    Ahat = math.multiply(Ahat, n)

    const eigen = math.eigs(Ahat)
    const idx = eigen.values.indexOf(math.min(...eigen.values))
    const Lmin = eigen.values[idx]
    const eigen_v = math.matrixFromColumns(...eigen.eigenvectors.map(obj => obj.vector))
    var mhat0 = math.column(eigen_v, idx)
    mhat0 = math.multiply(mhat0, -1) // TODO: REVISAR POR QUÉ APARECE CON LOS SIGNOS CONTRARIOS

    const Q1 = form_Q(mhat0, mhat1)
    const X10 = math.multiply(Q1, X1)

    const Q2 = form_Q(mhat0, mhat2)
    const X20 = math.multiply(Q2, X2)

    // Complete N bootstraps
    var Lmin_b = math.zeros(NUMBER_OF_BOOTSTRAPS)
    var T_b = math.zeros(NUMBER_OF_BOOTSTRAPS)

    var data = {
        'n': n,
        'n1': n1,
        'X10': X10,
        'n2': n2,
        'X20': X20,
        'mhat0': mhat0
    }

    var result, next
    var iteration = 0;

    (next = function () {

        // Number of bootstraps were completed
        if (++iteration > NUMBER_OF_BOOTSTRAPS) {
            var CMDTData = {
                "Lmin": Lmin,
                "Lmin_b": Lmin_b,
                "T_b": T_b,
                "Ahat": Ahat,
                "mhat12": mhat12._data,
                "X1": X1,
                "X2": X2
            }
            var finalResult = {
                xOne,
                xTwo,
                yOne,
                yTwo,
                zOne,
                zTwo,
                CMDTData
            }
            $("#CMDT-progress").css("width", "0%");
            return plotBootstrapCTMD(NUMBER_OF_BOOTSTRAPS, finalResult, containers)
        }

        result = calculateIterationBootstrap(one, two, grid, data)

        xOne.push(result.coordinates.xOne)
        yOne.push(result.coordinates.yOne)
        zOne.push(result.coordinates.zOne)
        xTwo.push(result.coordinates.xTwo)
        yTwo.push(result.coordinates.yTwo)
        zTwo.push(result.coordinates.zTwo)
        Lmin_b._data[iteration] = result.CMDTdata.Lmin_b
        T_b._data[iteration] = result.CMDTdata.T_b

        // Update the DOM progress bar with the percentage completion
        $("#CMDT-progress").css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

        // Queue for next bootstrap but release UI thread
        setTimeout(next);

    })();

    return result

}

function calculateIterationBootstrap(one, two, grid, data) {


    // Draw a random selection from the site
    var sampledOne = drawBootstrap(one);
    var sampledTwo = drawBootstrap(two);

    // Calculate the mean value
    var statisticsOne = getStatisticalParameters(sampledOne);
    var statisticsTwo = getStatisticalParameters(sampledTwo);

    // Get unit coordinates of mean
    var coordinatesOne = statisticsOne.dir.mean.unit().toCartesian();
    var coordinatesTwo = statisticsTwo.dir.mean.unit().toCartesian();

    // Make it a reversal test!
    if (coordinatesOne.angle(coordinatesTwo) > 90) {
        coordinatesOne = coordinatesOne.reflect();
    }

    /////////

    var Lmin_b
    // if (!grid) {
    // idx1 = np.random.randint(0, n1, n1)
    var idx1 = Array.from({length: data['n1']}, () => Math.floor(Math.random() * data['n1']))

    // X10_b = np.asarray(X10[:, idx1])
    const X10_b = math.subset(data['X10'], math.index(math.range(0, math.size(data['X10'])._data[0]), idx1))

    // mhat10_b = np.mean(X10_b, axis=1)
    const mhat10_b = math.mean(X10_b, 1)

    // mhat10_b /= np.linalg.norm(mhat10_b)
    const norm_mhat10_b = math.norm(mhat10_b);
    const mhat10_b_normalized = math.divide(mhat10_b, norm_mhat10_b)

    // mhat10_b = (np.asarray(mhat10_b)).flatten()
    const mhat10_b_flat = math.flatten(math.matrix(mhat10_b_normalized._data))

    // Mhat10_b = form_Mhat(mhat10_b)
    const Mhat10_b = form_Mhat(mhat10_b_flat)

    // Ghat10_b = form_Ghat(X10_b, Mhat10_b)
    const Ghat10_b = form_Ghat(X10_b._data, Mhat10_b)

    var idx2 = Array.from({length: data['n2']}, () => Math.floor(Math.random() * data['n2']))

    // X20_b = np.asarray(X20[:, idx2])
    const X20_b = math.subset(data['X20'], math.index(math.range(0, math.size(data['X20'])._data[0]), idx2))

    // mhat20_b = np.mean(X20_b, axis=1)
    const mhat20_b = math.mean(X20_b, 1)

    // mhat20_b /= np.linalg.norm(mhat20_b)
    const norm_mhat20_b = math.norm(mhat20_b);
    const mhat20_b_normalized = math.divide(mhat20_b, norm_mhat20_b)

    // mhat20_b = (np.asarray(mhat20_b)).flatten()
    const mhat20_b_flat = math.flatten(math.matrix(mhat20_b_normalized._data))

    // Mhat20_b = form_Mhat(mhat20_b)
    const Mhat20_b = form_Mhat(mhat20_b_flat)

    // Ghat20_b = form_Ghat(X20_b, Mhat20_b)
    const Ghat20_b = form_Ghat(X20_b._data, Mhat20_b)

    const Ahat10_b = math.multiply(math.conj(math.transpose(Mhat10_b)), math.multiply(math.inv(Ghat10_b), Mhat10_b))
    const Ahat20_b = math.multiply(math.conj(math.transpose(Mhat20_b)), math.multiply(math.inv(Ghat20_b), Mhat20_b))
    var Ahat_b = math.add(Ahat10_b, Ahat20_b)
    Ahat_b = math.multiply(Ahat_b, data['n'])

    // Eigenvalues and eigenvectors
    const eigen = math.eigs(Ahat_b)
    Lmin_b = math.min(eigen.values)

    const result = {
        'coordinates': {
            'xOne': coordinatesOne.x,
            'yOne': coordinatesOne.y,
            'zOne': coordinatesOne.z,
            'xTwo': coordinatesTwo.x,
            'yTwo': coordinatesTwo.y,
            'zTwo': coordinatesTwo.z
        },
        'CMDTdata': {
            'Lmin_b': Lmin_b,
            'T_b': math.multiply(math.transpose(data['mhat0']), math.multiply(Ahat_b, data['mhat0']))[0][0]
        }
    }

    return result
    // }
}

function calculateConfidenceRegion(T_b) {
    const sortedT = math.sort(T_b._data)
    const qT = Math.ceil((1 - 0.05) * sortedT.length) - 1;
    return sortedT[qT]
}

function calculateTestedDirection(Ahat, DEC, INC) {
    const m = math.transpose(dir2cart([DEC, INC]))
    const resultMatrix = math.multiply(m, Ahat);
    return math.multiply(resultMatrix, m);
}


async function bootstrapCTMD() {

    /*
     * Function bootstrapCTMD
     * Does a bootstrap on the true data
     */

    $("#CMDT-progress").css("width", "0%")
    await new Promise(r => setTimeout(r, 1000));

    const CONTAINER_X = "ctmd-container-x";
    const CONTAINER_Y = "ctmd-container-y";
    const CONTAINER_Z = "ctmd-container-z";

    const containers = {
        "x": CONTAINER_X,
        "y": CONTAINER_Y,
        "z": CONTAINER_Z
    }

    var collections = getSelectedCollections();

    if (collections.length !== 2) {
        return notify("danger", "Select two collections to compare.");
    }

    // Get the site components in reference coordinates
    cSites = collections.map(function (collection) {
        return doCutoff(collection.components.map(x => x.inReferenceCoordinates()));
    });

    simulateCTMD(cSites[0].components, cSites[1].components, false, containers);
}

function plotBootstrapCTMD(NUMBER_OF_BOOTSTRAPS, result, containers) {
    const Lmin_c = calculateLminC(result.CMDTData.Lmin_b)
    const p = calculatePValue(result.CMDTData.Lmin, result.CMDTData.Lmin_b, NUMBER_OF_BOOTSTRAPS)

    const X1c = cart2dir(math.transpose(result.CMDTData.X1))
    const X1c_di = X1c._data.map(row => new Object({
        x: row[0],
        y: projectInclination(row[1]),
        inc: row[1]
    }))

    // const X2c = cart2dir(math.transpose(math.multiply(result.CMDTData.X2, -1)))
    const X2c = cart2dir(math.transpose(result.CMDTData.X2))
    const X2c_di = X2c._data.map(row => new Object({
        x: row[0],
        y: projectInclination(row[1]),
        inc: row[1]
    }))

    const CMDTValue = result.CMDTData.Lmin.toFixed(2)
    const CMDTCriticalValue = Lmin_c.toFixed(2)
    const CMDTPValue = p.toFixed(2)

    var names = {
        "one": collections[0].name,
        "two": collections[1].name
    }

    // Call plotting routine for each component
    var xParams = plotCartesianBootstrap(containers['x'], getCDF(result.xOne), getCDF(result.xTwo), names, NUMBER_OF_BOOTSTRAPS);
    var yParams = plotCartesianBootstrap(containers['y'], getCDF(result.yOne), getCDF(result.yTwo), names, NUMBER_OF_BOOTSTRAPS);
    var zParams = plotCartesianBootstrap(containers['z'], getCDF(result.zOne), getCDF(result.zTwo), names, NUMBER_OF_BOOTSTRAPS);

    // Update the table
    updateCTMDTable(names, xParams, yParams, zParams, CMDTValue, CMDTCriticalValue, CMDTPValue, result.CMDTData.T_b, result.CMDTData.Ahat, X1c_di, X2c_di, result.CMDTData.mhat12);
    plotHistograms(result.CMDTData.Lmin_b, NUMBER_OF_BOOTSTRAPS, result.CMDTData.Lmin, Lmin_c);
    plotCMDT(X1c_di, X2c_di, names)
}

function calculateLminC(Lmin_b) {
    const Lmin_b_toSort = Lmin_b._data.slice()
    const sortedL = math.sort(Lmin_b_toSort)
    const qL = Math.ceil((1 - 0.05) * sortedL.length) - 1;
    return sortedL[qL]
}

function calculatePValue(Lmin, Lmin_b, NUMBER_OF_BOOTSTRAPS) {
    const tV = math.sum(math.sign(math.subtract(Lmin_b, Lmin)).map(value => (value >= 0) ? 1 : 0))
    return (1 + tV) / (NUMBER_OF_BOOTSTRAPS + 1)
}

function calculateCMDTWithDirection(T_b, Ahat, X1c_di, X2c_di, names, mhat12) {
    const T_c = calculateConfidenceRegion(T_b)
    const confidenceRegion = T_c.toFixed(2)

    const DEC = document.getElementById('declination').value;
    const INC = document.getElementById('inclination').value;
    const T_m = calculateTestedDirection(Ahat, DEC, INC)
    console.log("T_m", T_m)
    const testedDirection = T_m.toFixed(2)

    const mCI = find_CMDT_CR(Ahat, T_c, mhat12)
    const DIc = cart2dir(math.transpose(mCI))
    const DIc_di = DIc._data.map(row => new Object({
        x: row[0],
        y: projectInclination(row[1]),
        inc: row[1]
    }))

    updateCTMDWithDirectionTable(confidenceRegion, testedDirection)
    plotCMDT(X1c_di, X2c_di, names, DIc_di)
}

function updateCTMDWithDirectionTable(confidenceRegion, testedDirection) {
    document.getElementById("bootstrap-cmdt-direction-table").innerHTML = [
        "  <thead>",
        "  <tr>",
        "    <td>95% confidence region threshold</td>",
        "    <td>Tested direction</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + confidenceRegion + "</td>",
        "    <td>" + testedDirection + "</td>",
        "  </tr>",
        "  </tbody>"
    ].join("\n");
}

function plotCMDT(X1c, X2c, names, DIc_di) {
    if (document.getElementById("declination") && document.getElementById("inclination")) {
        var DEC = document.getElementById("declination").value;
        var INC = document.getElementById("inclination").value;
    }

    if ((DEC < 0 || DEC > 360) && (INC < -90 || INC > 90)) {
        return notify("danger", "Declination has to be a value between 0 and 360 and inclination has to be a value between -90 and 90.");
    } else if (DEC < 0 || DEC > 360) {
        return notify("danger", "Declination has to be a value between 0 and 360.");
    } else if (INC < -90 || INC > 90) {
        return notify("danger", "Inclination has to be a value between -90 and 90.");
    }

    if (!DIc_di) {
        Highcharts.chart('container-dot-chart', {
                chart: {
                    polar: true,
                    animation: false,
                    height: 600
                },
                title: {
                    text: null
                },
                exporting: {
                    filename: "coordinate-bootstrap",
                    sourceWidth: 400,
                    sourceHeight: 400,
                    buttons: {
                        contextButton: {
                            "symbolStroke": "#7798BF",
                            align: "right"
                        },
                    }
                },
                pane: {
                    startAngle: 0,
                    endAngle: 360
                },
                credits: {
                    enabled: ENABLE_CREDITS
                },
                yAxis: {
                    type: "linear",
                    reversed: true,
                    labels: {
                        enabled: false
                    },
                    min: -90,
                    max: 90,
                    tickPositions: [0, 90]
                },
                xAxis: {
                    minorTickPosition: "inside",
                    type: "linear",
                    min: 0,
                    max: 360,
                    minorGridLineWidth: 0,
                    tickPositions: [0, 90, 180, 270, 360],
                    minorTickInterval: 10,
                    minorTickLength: 5,
                    minorTickWidth: 1
                },
                tooltip: {
                    formatter: function () {
                        return [
                            "<b>Declination: </b>" + this.x.toFixed(1),
                            "<b>Inclination </b>" + this.point.inc.toFixed(1)
                        ].join("<br>");
                    }
                },
                plotOptions: {
                    line: {
                        lineWidth: 1,
                        color: "rgb(119, 152, 191)"
                    },
                    series: {
                        animation: false,
                        cursor: "pointer"
                    }
                },
                series: [
                    {
                        type: 'scatter',
                        name: names.one,
                        data: X1c.map(function (point) {
                            return {
                                x: point.x,
                                y: point.y,
                                inc: point.inc,
                                color: point.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLUE,
                            };
                        }),
                        marker: {
                            lineColor: HIGHCHARTS_BLUE,
                            lineWidth: 1,
                            symbol: 'circle'
                        }
                    },
                    {
                        type: 'scatter',
                        name: names.two,
                        data: X2c.map(function (point) {
                            return {
                                x: point.x,
                                y: point.y,
                                inc: point.inc,
                                color: point.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK,
                            };
                        }),
                        marker: {
                            lineColor: HIGHCHARTS_BLACK,
                            lineWidth: 1,
                            symbol: 'circle'
                        }
                    }
                ]
            }
        );
    } else {
        Highcharts.chart('container-dot-chart', {
                chart: {
                    polar: true,
                    animation: false,
                    height: 600
                },
                title: {
                    text: null
                },
                exporting: {
                    filename: "coordinate-bootstrap",
                    sourceWidth: 400,
                    sourceHeight: 400,
                    buttons: {
                        contextButton: {
                            "symbolStroke": "#7798BF",
                            align: "right"
                        },
                    }
                },
                pane: {
                    startAngle: 0,
                    endAngle: 360
                },
                credits: {
                    enabled: ENABLE_CREDITS
                },
                yAxis: {
                    type: "linear",
                    reversed: true,
                    labels: {
                        enabled: false
                    },
                    min: -90,
                    max: 90,
                    tickPositions: [0, 90]
                },
                xAxis: {
                    minorTickPosition: "inside",
                    type: "linear",
                    min: 0,
                    max: 360,
                    minorGridLineWidth: 0,
                    tickPositions: [0, 90, 180, 270, 360],
                    minorTickInterval: 10,
                    minorTickLength: 5,
                    minorTickWidth: 1
                },
                tooltip: {
                    formatter: function () {
                        return [
                            "<b>Declination: </b>" + this.x.toFixed(1),
                            "<b>Inclination </b>" + this.point.inc.toFixed(1)
                        ].join("<br>");
                    }
                },
                plotOptions: {
                    line: {
                        lineWidth: 1,
                        color: "rgb(119, 152, 191)"
                    },
                    series: {
                        animation: false,
                        cursor: "pointer"
                    }
                },
                series: [
                    {
                        type: 'scatter',
                        name: names.one,
                        data: X1c.map(function (point) {
                            return {
                                x: point.x,
                                y: point.y,
                                inc: point.inc,
                                color: point.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLUE,
                            };
                        }),
                        marker: {
                            lineColor: HIGHCHARTS_BLUE,
                            lineWidth: 1,
                            symbol: 'circle'
                        }
                    },
                    {
                        type: 'scatter',
                        name: names.two,
                        data: X2c.map(function (point) {
                            return {
                                x: point.x,
                                y: point.y,
                                inc: point.inc,
                                color: point.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_BLACK,
                            };
                        }),
                        marker: {
                            lineColor: HIGHCHARTS_BLACK,
                            lineWidth: 1,
                            symbol: 'circle'
                        }
                    },
                    {
                        name: '95% confidence region',
                        data: DIc_di,
                        color: HIGHCHARTS_RED,
                        marker: {
                            radius: 0.5
                        }
                    },
                    {
                        name: 'Tested Direction',
                        type: 'scatter',
                        data: [
                            [parseInt(DEC), parseInt(INC), 1]
                        ],
                        color: HIGHCHARTS_GREEN,
                        marker: {
                            symbol: 'square',
                            radius: 5
                        }
                    }
                ]
            }
        );
    }

}

function plotHistograms(Lmin_b, B, Lmin, Lmin_c) {
    var binCount = Math.sqrt(B).toFixed(0)
    var binWidth = (Math.max(...Lmin_b._data) - Math.min(...Lmin_b._data)) / binCount
    var binFrequencies = []
    for (var i = 0; i < binCount; i++) {
        binFrequencies[i] = 0
    }

    Lmin_b._data.forEach(value => {
        var binIndex = Math.floor((value - Math.min(...Lmin_b._data)) / binWidth)
        if (binIndex >= 0 && binIndex < binCount) {
            binFrequencies[binIndex] += 1;
        }
    })

    Highcharts.chart('container-histogram-1', {
        chart: {
            type: 'column'
        },
        title: {
            text: null
        },
        exporting: {
            filename: "coordinate-bootstrap",
            sourceWidth: 400,
            sourceHeight: 400,
            buttons: {
                contextButton: {
                    "symbolStroke": "#7798BF",
                    align: "right"
                },
            }
        },
        credits: {
            enabled: ENABLE_CREDITS
        },
        xAxis: {
            title: {
                text: 'Lambda min'
            },
            categories: binFrequencies.map((_, i) => `${i + 1}`),
            min: 0,
            max: 30,
            plotLines: [
                {
                    color: HIGHCHARTS_RED,
                    width: 1,
                    value: Lmin, // Test line
                    zIndex: 5, // Fixes layer 
                    label: {
                        text: 'Test statistic', // line tag
                        align: 'left',
                        style: {
                            color: 'gray' // tag color
                        }
                    }
                },
                {
                    color: HIGHCHARTS_RED,
                    width: 1,
                    dashStyle: 'Dash',
                    value: Lmin_c, // Critical lambda
                    zIndex: 5, // Fixes layer
                    label: {
                        text: 'Critical value', // line tag
                        align: 'left',
                        style: {
                            color: 'gray' // tag color
                        }
                    }
                }
            ]
        },
        yAxis: {
            title: {
                text: 'Frequency'
            },
        },
        series: [
            {
                name: null,
                data: binFrequencies,
                color: HIGHCHARTS_BLUE,
                borderColor: HIGHCHARTS_BLUE,
                pointWidth: 15,
                showInLegend: false
            }
        ]
    })
}

function doesMatch(CMDTValue, CMDTCriticalValue, CMDTPValue) {

    /*
     * Function doesMatch
     * Checks whether two CTMD bootstraps overlap and are statistically "equivalent"
     */

    // Are the confidence regions overlapping?
    // console.log(parseFloat(CMDTValue))
    // console.log(parseFloat(CMDTCriticalValue))
    // console.log(parseFloat(CMDTPValue))

    return parseFloat(CMDTValue) < parseFloat(CMDTCriticalValue) && parseFloat(CMDTPValue) > 0.05;

}

function doesMatchBootstrap(xParams, yParams, zParams) {

    if (xParams.one.upper > xParams.two.lower && xParams.one.lower < xParams.two.upper) {
        if (yParams.one.upper > yParams.two.lower && yParams.one.lower < yParams.two.upper) {
            if (zParams.one.upper > zParams.two.lower && zParams.one.lower < zParams.two.upper) {
                return true;
            }
        }
    }
    return false;
}

function updateCTMDTable(names, xParams, yParams, zParams, CMDTValue, CMDTCriticalValue, CMDTPValue, T_b, Ahat, X1c_di, X2c_di, mhat12) {

    /*
     * Function updateCTMDTable
     * Updates the CTMD table with the two collections and parameters
     */

    function getMatchHTML(match) {

        /*
         * Function getMatchHTML
         * Returns HTML showing whether the test was a match or not
         */

        if (match) {
            return "<span class='text-success'><b><i class='fas fa-check'></i> Match!</b></span>";
        } else {
            return "<span class='text-danger'><b><i class='fas fa-times'></i> No Match!</b></span>";
        }

    }

    const PRECISION = 2;

    var match = doesMatch(CMDTValue, CMDTCriticalValue, CMDTPValue);
    var matchBootstrap = doesMatchBootstrap(xParams, yParams, zParams);

    document.getElementById("bootstrap-table").innerHTML = [

        "  <caption>1000 bootstrapped Cartesian coordinates for the collections at 95% confidence. " + getMatchHTML(matchBootstrap) + "</caption>",
        "  <thead>",
        "  <tr>",
        "  <td colspan=7><h5> (A) CTMD (Tauxe et al., 2010)</h5></td>",
        "  <tr>",
        "    <td>Collection</td>",
        "    <td>xMinimum</td>",
        "    <td>xMaximum</td>",
        "    <td>yMinimum</td>",
        "    <td>yMaximum</td>",
        "    <td>zMinimum</td>",
        "    <td>zMaximum</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + names.one + "</td>",
        "    <td>" + xParams.one.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + xParams.one.upper.toFixed(PRECISION) + "</td>",
        "    <td>" + yParams.one.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + yParams.one.upper.toFixed(PRECISION) + "</td>",
        "    <td>" + zParams.one.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + zParams.one.upper.toFixed(PRECISION) + "</td>",
        "  </tr>",
        "  <tr>",
        "    <td>" + names.two + "</td>",
        "    <td>" + xParams.two.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + xParams.two.upper.toFixed(PRECISION) + "</td>",
        "    <td>" + yParams.two.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + yParams.two.upper.toFixed(PRECISION) + "</td>",
        "    <td>" + zParams.two.lower.toFixed(PRECISION) + "</td>",
        "    <td>" + zParams.two.upper.toFixed(PRECISION) + "</td>",
        "  </tr>",
        "  </tbody>"
    ].join("\n");

    document.getElementById("bootstrap-table-new").innerHTML = [
        "  <thead>",
        "  <tr>",
        "  <td colspan=4><h5> (B) CMTD (Heslop et al., 2023)</h5></td>",
        "  <tr>",
        "    <td>CMDT value</td>",
        "    <td>CMDT critical value</td>",
        "    <td>CMDT p-value</td>",
        "    <td>Match?</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + CMDTValue + "</td>",
        "    <td>" + CMDTCriticalValue + "</td>",
        "    <td>" + CMDTPValue + "</td>",
        "    <td>" + getMatchHTML(match) + "</td>",
        "  </tr>",
        "  </tbody>"
    ].join("\n");

    // console.log(T_b)
    if (match) {
        document.getElementById("bootstrap-direction-form").innerHTML = [
            "<label>Do you want to test the selected collections against a known direction?</label>",
            "<form>",
            "<div class=\"form-row\">",
            "<div class=\"form-group col-md-6\">",
            "<label for=\"declination\">Declination</label>",
            "<input type=\"number\" class=\"form-control\" id=\"declination\" min=\"0\" max=\"360\" name=\"declination\"/>",
            "</div>",
            "<div class=\"form-group col-md-6\">",
            "<label for=\"inclination\">Inclination</label>",
            "<input type=\"number\" class=\"form-control\" id=\"inclination\" min=\"-90\" max=\"90\" name=\"declination\"/>",
            "</div>",
            "</div>",
            "</form>",
            "<button type=\"button\" class=\"btn btn-sm pull-right btn-primary\" id=\"btn-calculate\"><i class=\"fas fa-play\"></i> <b>Calculate</b></button>",
            "<br/>"
        ].join("\n");

        document.getElementById("btn-calculate").onclick = function () {
            calculateCMDTWithDirection(T_b, Ahat, X1c_di, X2c_di, names, mhat12)
        }
    }

}

function getCDF(input) {

    /*
     * Functiom getCDF
     * Returns the cumulative distribution function of an array
     */

    // Calculate the cumulative distribution function of the sorted input
    return input.sort(numericSort).map(function (x, i) {
        return {
            "x": x,
            "y": i / (input.length - 1)
        }
    });

}

function plotCartesianBootstrap(container, cdfOne, cdfTwo, names, nBootstraps) {

    /*
     * Function plotCartesianBootstrap
     * Plots a single cartesian bootstrap to a container
     */

    function CTMDTooltip() {

        /*
         * Function CTMDTooltip
         * Returns the formatted CTMD tooltip
         */

        return [
            "<b>Cumulative Distribution </b>",
            "<b>Collection: </b>" + this.series.name,
            "<b>Coordinate: </b>" + this.x.toFixed(2),
            "<b>CDF: </b>" + this.point.y.toFixed(3)
        ].join("<br>");

    }

    // Get the index of the upper and lower 5%
    var lower = parseInt(0.025 * nBootstraps, 10);
    var upper = parseInt(0.975 * nBootstraps, 10);

    //Define plot bands to represent confidence envelopes
    var plotBands = [{
        "from": cdfOne[lower].x,
        "to": cdfOne[upper].x,
        "color": PLOTBAND_COLOR_BLUE
    }, {
        "from": cdfTwo[lower].x,
        "to": cdfTwo[upper].x,
        "color": PLOTBAND_COLOR_RED
    }];

    //Define the cumulative distribution function
    //Info array contains site names
    var coordinateSeries = [{
        "name": names.one,
        "data": cdfOne,
        "step": true,
        "color": HIGHCHARTS_BLUE,
        "marker": {
            "enabled": false
        }
    }, {
        "name": names.two,
        "color": HIGHCHARTS_RED,
        "step": true,
        "data": cdfTwo,
        "marker": {
            "enabled": false
        }
    }];

    new Highcharts.chart(container, {
        "title": {
            "text": container.slice(-1) + "-component",
        },
        "exporting": {
            "filename": "coordinate-bootstrap",
            "sourceWidth": 400,
            "sourceHeight": 400,
            "buttons": {
                "contextButton": {
                    "symbolStroke": "#7798BF",
                    "align": "right"
                },
            }
        },
        "subtitle": {
            "text": "(" + COORDINATES + " coordinates; N = " + nBootstraps + ")"
        },
        "plotOptions": {
            "series": {
                "turboThreshold": 0
            }
        },
        "xAxis": {
            "title": {
                "text": "Cartesian Coordinate on Unit Sphere"
            },
            "plotBands": plotBands,
        },
        "credits": {
            "enabled": ENABLE_CREDITS,
            "text": "Paleomagnetism.org [CTMD] - Coordinate Bootstrap (Tauxe et al., 2010)",
            "href": ""
        },
        "tooltip": {
            "formatter": CTMDTooltip
        },
        "yAxis": {
            "min": 0,
            "max": 1,
            "title": {
                "text": "Cumulative Distribution"
            }
        },
        "series": coordinateSeries
    });

    // Return the confidence bounds for the table
    return {
        "one": getConfidence(cdfOne),
        "two": getConfidence(cdfTwo)
    }

}

function drawBootstrap(data) {

    /*
     * Function drawBootstrap
     * Draws a random new distribution from a distribution of the same size
     */

    function randomSample() {

        /*
         * Function drawBootstrap::randomSample
         * Returns a random sample from an array
         */

        return data[Math.floor(Math.random() * data.length)];

    }

    return data.map(randomSample);

}

function generateHemisphereTooltip() {

    /*
     * Function generateHemisphereTooltip
     * Generates the appropriate tooltip for each series
     */

    const PRECISION = 1;

    if (this.series.name === "ChRM Directions" || this.series.name === "Geomagnetic Directions" || this.series.name === "Unflattened Directions") {
        return [
            "<b>Sample: </b>" + this.point.component.name,
            "<b>Declination: </b>" + this.x.toFixed(PRECISION),
            "<b>Inclination </b>" + this.point.inc.toFixed(PRECISION)
        ].join("<br>");
    } else if (this.series.name === "VGPs") {
        return [
            "<b>Sample: </b>" + this.point.component.name,
            "<b>Longitude: </b>" + this.x.toFixed(PRECISION),
            "<br><b>Latitude: </b>" + this.point.inc.toFixed(PRECISION)
        ].join("<br>");
    } else if (this.series.name.startsWith("Mean Direction")) {
        return [
            "<b>Mean Direction</b>",
            "<b>Declination: </b>" + this.x.toFixed(PRECISION),
            "<br><b>Inclination: </b>" + this.point.inc.toFixed(PRECISION)
        ].join("<br>");
    } else if (this.series.name === "Mean VGP") {
        return [
            "<b>Mean VGP</b>",
            "<b>Longitude: </b>" + this.x.toFixed(PRECISION),
            "<br><b>Latitude: </b>" + this.point.inc.toFixed(PRECISION)
        ].join("<br>");
    }

}

function addCollectionMetadata(index) {

    // Reference the collection
    openedCollection = collections[index]

    document.getElementById("metadata-modal-title").innerHTML = "Metadata for collection <b>" + openedCollection.name + "</b>";
    document.getElementById("color-preview").style.backgroundColor = openedCollection.color || "grey";

    document.getElementById("metadata-comments").value = openedCollection.comments || "";
    document.getElementById("metadata-authors").value = openedCollection.authors || "";
    document.getElementById("metadata-reference").value = openedCollection.doi || "";
    document.getElementById("metadata-year").value = openedCollection.year || "";

    $("#metadata-modal").modal("show");

}


function changeColor(color) {

    /*
     * Function changeColor
     * Changes the color of the selected collection
     */

    // Set the new color
    openedCollection.color = color;
    document.getElementById("color-preview").style.backgroundColor = openedCollection.color || "grey";

}


function updateCollectionMetadata() {

    /*
     * function updateCollectionMetadata
     * Updates metadata from input window
     */

    let comments = document.getElementById("metadata-comments").value;
    let authors = document.getElementById("metadata-authors").value;
    let reference = document.getElementById("metadata-reference").value;
    let year = document.getElementById("metadata-year").value;

    if (reference !== "" && !reference.startsWith("10.")) {
        return notify("danger", "The submitted DOI: <b>" + reference + "</b> is invalid.")
    }

    openedCollection.comments = comments || null;
    openedCollection.doi = reference || null;
    openedCollection.authors = authors || null;

    if (year !== "") {
        openedCollection.year = Number(year);
    } else {
        openedCollection.year = null;
    }

    notify("success", "Metadata for collection <b>" + openedCollection.name + "</b> has been succesfully updated.");

    // Deference
    openedCollection = null;

    eqAreaProjectionMean();
    saveLocalStorage();

}

function eqAreaProjectionMean() {

    /*
     * Function eqAreaProjectionMean
     * Plotting routine for collection means
     */

    const CHART_CONTAINER = "mean-container";
    const TABLE_CONTAINER = "mean-table";

    const PRECISION = 2;

    var dataSeries = new Array();
    var statisticsRows = new Array();

    var selectedCollections = getSelectedCollections();

    // Clear the charts
    if (selectedCollections.length === 0) {
        return document.getElementById(CHART_CONTAINER).innerHTML = document.getElementById(TABLE_CONTAINER).innerHTML = "";
    }

    selectedCollections.forEach(function (site) {

        let sampleColor = HIGHCHARTS_BLUE;
        let meanColor = HIGHCHARTS_GREEN;
        let ellipseColor = HIGHCHARTS_RED;

        // Overwrite with the selected color
        if (site.color) {
            meanColor = site.color;
            sampleColor = site.color;
            ellipseColor = site.color;
        }

        if (document.getElementById("random-mean-color").checked) {
            sampleColor = meanColor = ellipseColor = "#" + (0x1000000 + Math.random() * 0xFFFFFF).toString(16).substr(1, 6);
        }

        var cutofC = doCutoff(site.components.map(x => x.inReferenceCoordinates()));
        var statistics = getStatisticalParameters(cutofC.components);

        // Check if a polarity switch is requested
        var A95Ellipse = getConfidenceEllipse(statistics.pole.confidence);

        if (A95_CONFIDENCE) {
            var a95ellipse = transformEllipse(A95Ellipse, statistics.dir);
        } else {
            var a95ellipse = getPlaneData(statistics.dir.mean, statistics.dir.confidence);
        }

        dataSeries.push({
            "name": "Mean Direction " + site.name,
            "type": "scatter",
            "data": new Array(statistics.dir.mean).map(prepareDirectionData),
            "color": meanColor,
            "zIndex": 100,
            "marker": {
                "symbol": "circle",
                "radius": 6,
                "lineColor": meanColor,
                "lineWidth": 1,
                "fillColor": (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : meanColor)
            }
        }, {
            "name": "Confidence Ellipse",
            "linkedTo": ":previous",
            "type": "line",
            "color": ellipseColor,
            "data": a95ellipse,
            "enableMouseTracking": false,
            "marker": {
                "enabled": false
            }
        });

        if (document.getElementById("show-samples-mean").checked) {

            let componentSeries = new Array();

            site.components.map(x => x.inReferenceCoordinates()).forEach(function (component) {

                // Go over each step
                var direction = literalToCoordinates(component.coordinates).toVector(Direction);

                // Do not show rejected
                if (component.rejected) {
                    return;
                }

                componentSeries.push({
                    "x": direction.dec,
                    "y": projectInclination(direction.inc),
                    "inc": direction.inc,
                    "component": component,
                    "marker": {
                        "fillColor": (direction.inc < 0 ? HIGHCHARTS_WHITE : sampleColor),
                        "lineWidth": 1,
                        "lineColor": sampleColor,
                        "symbol": "circle"
                    }
                })

            });

            dataSeries.push({
                "name": "",
                "type": "scatter",
                "data": componentSeries,
                "color": sampleColor,
                "linkedTo": ":previous",
                "enableMouseTracking": false
            });

        }

        if (site.doi) {
            var icon = "<span class='text-success'><i class='fas fa-id-card'></i></span>";
        } else {
            var icon = "<span class='text-danger'><i class='fas fa-id-card'></i></span>";
        }

        statisticsRows.push([
            "<tr>",
            "  <td>" + site.name + "</td>",
            "  <td>" + cutofC.components.filter(x => !x.rejected).length + "</td>",
            "  <td>" + cutofC.components.length + "</td>",
            "  <td>" + cutofC.cutoff.toFixed(PRECISION) + "</td>",
            "  <td>" + cutofC.scatter.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.mean.dec.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.mean.inc.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.R.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.dispersion.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.confidence.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.pole.dispersion.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.pole.confidence.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.pole.confidenceMin.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.pole.confidenceMax.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.butler.dDx.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.butler.dIx.toFixed(PRECISION) + "</td>",
            "  <td>" + statistics.dir.lambda.toFixed(PRECISION) + "</td>",
            "  <td onclick='addCollectionMetadata(" + site.index + ");' style='cursor: pointer;'>" + icon + "</td>",
            "</tr>"
        ].join("\n"));

    });

    document.getElementById(TABLE_CONTAINER).innerHTML = [
        "  <caption>",
        "    <div class='text-right'>",
        "      <button class='btn btn-sm btn-light' onclick='exportMeanCSV()'><i class='far fa-file-image'></i> CSV</button>",
        "      <button class='btn btn-sm btn-light' onclick='exportMeanJSON()'><i class='far fa-file-image'></i> JSON</button>",
        "    </div>",
        "  </caption>",
        "  <thead>",
        "  <tr>",
        "    <td>Collection</td>",
        "    <td>N</td>",
        "    <td>Ns</td>",
        "    <td>Cutoff</td>",
        "    <td>S</td>",
        "    <td>Dec</td>",
        "    <td>Inc</td>",
        "    <td>R</td>",
        "    <td>k</td>",
        "    <td>a95</td>",
        "    <td>K</td>",
        "    <td>A95</td>",
        "    <td>A95min</td>",
        "    <td>A95max</td>",
        "    <td>ΔDx</td>",
        "    <td>ΔIx</td>",
        "    <td>λ</td>",
        "    <td>Metadata</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
    ].concat(statisticsRows).join("\n");

    // Create the chart
    eqAreaChart(CHART_CONTAINER, dataSeries);

}

function eqAreaProjection() {

    /*
     * Function eqAreaProjection
     * Description: Handles plotting for equal area projection
     */

    const CHART_CONTAINER = "direction-container";
    const CHART_CONTAINER2 = "pole-container";
    const TABLE_CONTAINER = "direction-table";

    // Clear if nothing is selected
    var selectedCollections = getSelectedCollections();
    if (selectedCollections.length === 0) {
        return document.getElementById(CHART_CONTAINER).innerHTML = document.getElementById(CHART_CONTAINER2).innerHTML = document.getElementById(TABLE_CONTAINER).innerHTML = "";
    }

    // Get a list of the selected sites
    var allComponents = doCutoff(getSelectedComponents());
    var statistics = getStatisticalParameters(allComponents.components);

    var dataSeries = new Array();
    var dataSeriesPole = new Array();

    var baseSite = new Site(0, 0);

    // Add each component
    allComponents.components.forEach(function (component) {

        // Go over each step
        var direction = literalToCoordinates(component.coordinates).toVector(Direction);

        var color;
        if (component.rejected) {
            color = HIGHCHARTS_RED;
        } else {
            color = HIGHCHARTS_BLUE;
        }

        dataSeries.push({
            "x": direction.dec,
            "y": projectInclination(direction.inc),
            "inc": direction.inc,
            "component": component,
            "marker": {
                "fillColor": (direction.inc < 0 ? HIGHCHARTS_WHITE : color),
                "lineWidth": 1,
                "lineColor": color
            }
        });

        var pole = baseSite.poleFrom(new Direction(direction.dec, direction.inc));

        // Simple rotation rotate all vectors with mean vector to up/north
        pole = pole.toCartesian().rotateTo(-statistics.pole.mean.lng, 90).rotateFrom(0, statistics.pole.mean.lat).rotateTo(statistics.pole.mean.lng, 90).toVector(Pole);

        dataSeriesPole.push({
            "x": pole.lng,
            "y": projectInclination(pole.lat),
            "inc": pole.lat,
            "component": component,
            "marker": {
                "fillColor": (pole.lat < 0 ? HIGHCHARTS_WHITE : color),
                "lineWidth": 1,
                "lineColor": color
            }
        });

    });

    // Get the confidence interval around the mean
    var A95Ellipse = getConfidenceEllipse(statistics.pole.confidence);

    var poleSeries = [{
        "name": "VGPs",
        "type": "scatter",
        "color": HIGHCHARTS_BLUE,
        "data": dataSeriesPole
    }, {
        "name": "Mean VGP",
        "type": "scatter",
        "color": HIGHCHARTS_GREEN,
        "marker": {
            "symbol": "circle",
            "radius": 6
        },
        "data": [{
            "x": 0,
            "y": 90,
            "inc": 90
        }]
    }, {
        "name": "Confidence Ellipse",
        "type": "line",
        "color": HIGHCHARTS_RED,
        "data": A95Ellipse.map(prepareDirectionData),
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    }, {
        "name": "Cutoff",
        "type": "line",
        "dashStyle": "LongDash",
        "color": HIGHCHARTS_CYAN,
        "data": getConfidenceEllipse(allComponents.cutoff).map(prepareDirectionData),
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    }];


    if (document.getElementById("enable-deenen").checked) {

        // Determine whether the criteria was passed or not
        var mark = (statistics.pole.confidenceMin < statistics.pole.confidence && statistics.pole.confidence < statistics.pole.confidenceMax) ? "✓" : "×";

        poleSeries.push({
            "name": "Deenen Criteria " + mark,
            "data": getConfidenceEllipse(statistics.pole.confidenceMax).map(prepareDirectionData),
            "type": "line",
            "color": HIGHCHARTS_ORANGE,
            "enableMouseTracking": false,
            "dashStyle": "ShortDash",
            "marker": {
                "enabled": false
            }
        }, {
            "linkedTo": ":previous",
            "data": getConfidenceEllipse(statistics.pole.confidenceMin).map(prepareDirectionData),
            "type": "line",
            "color": HIGHCHARTS_ORANGE,
            "enableMouseTracking": false,
            "dashStyle": "ShortDash",
            "marker": {
                "enabled": false
            }
        });

    }

    const PRECISION = 2;

    document.getElementById(TABLE_CONTAINER).innerHTML = [
        "  <caption>Statistical parameters for this distribution</caption>",
        "  <thead>",
        "  <tr>",
        "    <td>N</td>",
        "    <td>Ns</td>",
        "    <td>Cutoff</td>",
        "    <td>S</td>",
        "    <td>Dec</td>",
        "    <td>Inc</td>",
        "    <td>R</td>",
        "    <td>k</td>",
        "    <td>a95</td>",
        "    <td>K</td>",
        "    <td>A95</td>",
        "    <td>A95min</td>",
        "    <td>A95max</td>",
        "    <td>ΔDx</td>",
        "    <td>ΔIx</td>",
        "    <td>λ</td>",
        "    <td>Save</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + allComponents.components.filter(x => !x.rejected).length + "</td>",
        "    <td>" + allComponents.components.length + "</td>",
        "    <td>" + allComponents.cutoff.toFixed(PRECISION) + "</td>",
        "    <td>" + allComponents.scatter.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.mean.dec.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.mean.inc.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.R.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.dispersion.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.confidence.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.pole.dispersion.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.pole.confidence.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.pole.confidenceMin.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.pole.confidenceMax.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.butler.dDx.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.butler.dIx.toFixed(PRECISION) + "</td>",
        "    <td>" + statistics.dir.lambda.toFixed(PRECISION) + "</td>",
        "    <td onclick='saveCombinedCollection();' style='cursor: pointer;'><span class='text-success'><i class='fas fa-save'></i></span></td>",
        "  </tr>",
        "  </tbody>",
    ].join("\n");

    if (A95_CONFIDENCE) {
        var a95ellipse = transformEllipse(A95Ellipse, statistics.dir);
    } else {
        var a95ellipse = getPlaneData(statistics.dir.mean, statistics.dir.confidence);
    }

    var directionSeries = [{
        "name": "ChRM Directions",
        "type": "scatter",
        "zIndex": 5,
        "color": HIGHCHARTS_BLUE,
        "data": dataSeries
    }, {
        "name": "Mean Direction",
        "data": new Array(statistics.dir.mean).map(prepareDirectionData),
        "type": "scatter",
        "zIndex": 10,
        "color": HIGHCHARTS_GREEN,
        "marker": {
            "symbol": "circle",
            "radius": 6,
            "lineColor": HIGHCHARTS_GREEN,
            "lineWidth": 1,
            "fillColor": (statistics.dir.mean.inc < 0 ? HIGHCHARTS_WHITE : HIGHCHARTS_GREEN)
        }
    }, {
        "name": "Confidence Ellipse",
        "type": "line",
        "zIndex": 10,
        "color": HIGHCHARTS_RED,
        "data": a95ellipse,
        "enableMouseTracking": false,
        "marker": {
            "enabled": false
        }
    }];

    var plotBands = eqAreaPlotBand(statistics.dir.mean.dec, statistics.butler.dDx);

    // Delegate to plotting routines
    eqAreaChart(CHART_CONTAINER, directionSeries, plotBands);
    eqAreaChart(CHART_CONTAINER2, poleSeries);

}

function saveCombinedCollection() {

    /*
     * function saveCombinedCollection
     * Saves a combined collection
     */

    function modalConfirmCallback() {

        /*
         * function modalConfirmCallback
         * Callback fired when modal confirm is clicked for saving
         */

        var name = document.getElementById("modal-name").value;
        var discardRejected = document.getElementById("modal-discard-rejected").checked;

        // Name was not properly filled in
        if (name === "") {
            return notify("danger", "Could not add collection with an empty name.");
        }

        var components = getSelectedComponents();

        if (discardRejected) {
            components = doCutoff(components).components.filter(x => !x.rejected);
        }

        if (document.getElementById("modal-mirror-components").checked) {
            switch (document.getElementById("flip-components-direction").value) {
                case "mirror":
                    components = components.map(x => new Component(x, x.coordinates.reflect()));
                    break
                case "positive":
                    components = components.map(function (x) {
                        if (x.coordinates.z > 0) {
                            return x;
                        } else {
                            return new Component(x, x.coordinates.reflect());
                        }
                    });
                    break
                case "negative":
                    components = components.map(function (x) {
                        if (x.coordinates.z < 0) {
                            return x;
                        } else {
                            return new Component(x, x.coordinates.reflect());
                        }
                    });
                    break
            }
        }

        // Make sure the coordinates are set back to specimen coordinates
        // A user may complete a cutoff in a particular reference frame
        components = components.map(x => new Component(x, fromReferenceCoordinates(COORDINATES, x, x.coordinates)));

        collections.push({
            "name": name,
            "dirty": true,
            "type": "collection",
            "reference": null,
            "components": components,
            "created": new Date().toISOString()
        });

        notify("success", "Succesfully added collection <b>" + name + "</b> with <b>" + components.length + "</b> components in <b>" + COORDINATES + "</b> coordinates.");
        updateSpecimenSelect();
        saveLocalStorage();

    }

    // Attach callback to the click event
    document.getElementById("modal-confirm").onclick = modalConfirmCallback;

    $("#map-modal").modal("show");

}

function transformEllipse(A95Ellipse, dir) {

    /*
     * Function transformEllipse
     * Transforms the A95 confidence ellipse to a direction
     */

    // Create a fake site at the location of the expected paleolatitude for the transfomration
    var site = new Site(0, dir.lambda);

    // Go over each point and transform VGP to direction at location
    var a95Ellipse = A95Ellipse.map(function (point) {
        return site.directionFrom(new Pole(point.dec, point.inc)).toCartesian().rotateTo(dir.mean.dec, 90).toVector(Direction);
    });

    let ellipse = a95Ellipse.map(prepareDirectionData);

    // Flip was requested
    if (document.getElementById("flip-ellipse").checked) {
        return flipEllipse(dir.mean.inc, ellipse);
    }

    return ellipse;

}

function eqAreaPlotBand(mDec, decError) {

    /*
     * Function eqAreaPlotBand
     * Creates a plot band around a declination, with a particular declination error
     */

    var minError = mDec - decError;
    var maxError = mDec + decError;

    var plotBands = [{
        "id": "plotband",
        "from": minError,
        "to": maxError,
        "color": PLOTBAND_COLOR_BLUE,
        "innerRadius": "0%",
        "thickness": "100%",
    }];

    // Plotbands in polar charts cannot go below through North (e.g. 350 - 10)
    // so we go from (360 - 10) and (350 - 360) instead
    if (minError < 0) {

        plotBands.push({
            "id": "plotbandNeg",
            "from": 360,
            "to": minError + 360,
            "color": PLOTBAND_COLOR_BLUE,
            "innerRadius": "0%",
            "thickness": "100%",
        });

    }

    if (maxError > 360) {

        plotBands.push({
            "id": "plotbandPos",
            "from": 0,
            "to": maxError - 360,
            "color": PLOTBAND_COLOR_BLUE,
            "innerRadius": "0%",
            "thickness": "100%",
        });

    }

    return plotBands;

}

function prepareDirectionData(direction) {

    /*
     * Function prepareDirectionData
     * Prepared a direction for plotting by projecting the inclination
     */

    return {
        "x": direction.dec,
        "y": projectInclination(direction.inc),
        "inc": direction.inc
    }

}

function eqAreaChart(container, dataSeries, plotBands, tickPositions) {

    /*
     * Function eqAreaChart
     * Creates an equal area chart
     */

    function addDegree() {

        /*
         * Function addDegree
         * Adds a degree symbol
         */

        return this.value + "\u00B0";

    }

    function exportCSVPole() {

        /*
         * Function exportCSVPole
         * Exports VGP Distribution to CSV file
         */

        const HEADER = new Array("Sample, Pole Longitude, Pole Latitude, Core Azimuth, Core Dip, Bedding Strike, Bedding Dip, Latitude, Longitude, Age, Age Min, Age max");

        var csv = HEADER.concat(dataSeries[0].data.map(function (point) {
            return new Array(
                point.component.name,
                point.x.toFixed(PRECISION),
                point.inc.toFixed(PRECISION),
                point.component.coreAzimuth,
                point.component.coreDip,
                point.component.beddingStrike,
                point.component.beddingDip,
                point.component.latitude,
                point.component.longitude,
                point.component.age,
                point.component.ageMin,
                point.component.ageMax
            ).join(ITEM_DELIMITER)
        })).join(LINE_DELIMITER);

        downloadAsCSV("VGP-distribution.csv", csv);

    }

    function exportCSVDirection() {

        /*
         * Function exportCSVDirection
         * Exports ChRM Distribution to CSV file
         */

        const HEADER = new Array("Sample, Declination, Inclination, MAD, Core Azimuth, Core Dip, Bedding Strike, Bedding Dip, Latitude, Longitude, Age, Age Min, Age Max");

        var csv = HEADER.concat(dataSeries[0].data.map(function (point) {

            return new Array(
                point.component.name,
                point.x.toFixed(PRECISION),
                point.inc.toFixed(PRECISION),
                point.component.MAD,
                point.component.coreAzimuth,
                point.component.coreDip,
                point.component.beddingStrike,
                point.component.beddingDip,
                point.component.latitude,
                point.component.longitude,
                point.component.age,
                point.component.ageMin,
                point.component.ageMax
            ).join(ITEM_DELIMITER)
        })).join(LINE_DELIMITER);

        downloadAsCSV("ChRM-distribution.csv", csv);

    }

    function exportCSV() {

        switch (container) {
            case "pole-container":
                return exportCSVPole();
            case "direction-container":
            case "modal-container":
            case "foldtest-geographic-container":
            case "foldtest-tectonic-container":
            case "mean-container":
                return exportCSVDirection();
            default:
                return;
        }

    }

    const PRECISION = 2;

    var title;
    if (container === "pole-container") {
        title = "VGP Distribution";
    } else if (container === "direction-container" || container === "modal-container") {
        title = "ChRM Distribution";
    } else if (container === "mean-container") {
        title = "Mean Directions";
    } else if (container === "foldtest-geographic-container") {
        title = "Geographic Coordinates";
    } else if (container === "foldtest-tectonic-container") {
        title = "Tectonic Coordinates";
    }

    var subtitle;
    if (container === "foldtest-geographic-container") {
        subtitle = "";
    } else if (container === "foldtest-tectonic-container") {
        subtitle = "";
    } else {
        subtitle = "(" + COORDINATES + " coordinates)";
    }

    // Add plotband to the legend and make it a toggle
    if (plotBands !== undefined) {

        // The legend item click must contain a closure for the plotband data
        // Loop over the plotband data to add or remove it
        dataSeries.push({
            "color": HIGHCHARTS_BLUE,
            "name": "ΔDx Confidence Parachute",
            "lineWidth": 0,
            "marker": {
                "symbol": "square"
            },
            "events": {
                "legendItemClick": (function (closure) {
                    return function (event) {
                        closure.forEach(function (plotBand) {
                            if (this.visible) {
                                this.chart.xAxis[0].removePlotBand(plotBand.id);
                            } else {
                                this.chart.xAxis[0].addPlotBand(plotBand);
                            }
                        }, this);
                    }
                })(memcpy(plotBands))
            }
        });

    }

    // Default tick positions
    if (tickPositions === undefined) {
        tickPositions = new Array(0, 45, 90);
    }

    new Highcharts.chart(container, {
        "chart": {
            "polar": true,
            "animation": false,
            "height": 600,
        },
        "exporting": {
            "getCSV": exportCSV.bind(this),
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
            "text": title
        },
        "subtitle": {
            "text": subtitle
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
            "tickPositions": [0, 90]
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
            "plotBands": plotBands,
            "labels": {
                "formatter": addDegree
            }
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
        "series": dataSeries
    });

}

function bootstrapFoldtestIO() {

    var typeBootstrap = document.getElementById("select-foldtest-io").value

    const NUMBER_OF_BOOTSTRAPS = 1000;
    const NUMBER_OF_BOOTSTRAPS_SAVED = 50;
    const progressBarElement = $("#foldtest-inclination-only-progress");

    // Get a list of the selected sites
    var collections = getSelectedCollections();

    if (collections.length === 0) {
        return notify("danger", "Select at least one collection.");
    }

    if (foldtestRunning) {
        return notify("warning", "The foldtest module is already running.");
    }

    foldtestRunning = true;

    // Get the components for each site (no cutoff applied)
    var cutoffCollectionsG = collections.map(function (collection) {
        return collection.components.map(x => x.inReferenceCoordinates("geographic"));
    });

    // The same for tectonic coordinates
    var cutoffCollectionsT = collections.map(function (collection) {
        return collection.components.map(x => x.inReferenceCoordinates("tectonic"));
    });

    // Show the extremes
    showGeographicAndTectonicPlot(cutoffCollectionsG, cutoffCollectionsT);

    // Combine all geographic components to a single array
    var vectors = [].concat(...cutoffCollectionsG);

    var untilts = [];
    var savedBootstraps = [];

    // Save the unfolding of actual data
    savedBootstraps.push(unfoldInclinationOnly(vectors,  typeBootstrap, 0).invVariances);
    //
    // No bootstrap, only unfold the data
    if (!document.getElementById("foldtest-bootstrap-checkbox").checked) {
        return plotFoldtestInclinationOnly(untilts, savedBootstraps, typeBootstrap);
    }

    var result, next;
    var iteration = 0;

    // Asynchronous bootstrapping
    (next = function () {

        // Number of bootstraps were completed
        if (++iteration > NUMBER_OF_BOOTSTRAPS) {
            return plotFoldtestInclinationOnly(untilts, savedBootstraps, typeBootstrap);
            // return
        }

        // drawBootstrap genera un array aleatorio
        result = unfoldInclinationOnly(drawBootstrap(vectors), typeBootstrap, iteration)

        // Save the index of maximum untilting
        untilts.push(result.index);

        // Save the first N bootstraps
        if (iteration < NUMBER_OF_BOOTSTRAPS_SAVED) {
            savedBootstraps.push(result.invVariances);
        }

        // Update the DOM progress bar with the percentage completion
        progressBarElement.css("width", 100 * (iteration / NUMBER_OF_BOOTSTRAPS) + "%");

        // Queue for next bootstrap but release UI thread
        setTimeout(next);

    })();

}

function calculateInclinationOnly() {
    var collections = getSelectedCollections()

    if (collections.length === 0) {
        return notify("danger", "Select at least one collection.");
    }

    var cSites = collections.map(function (collection) {
        return doCutoff(collection.components.map(x => x.inReferenceCoordinates()));
    });

    var x = [];
    var y = [];
    var z = [];

    for (let col of cSites) {
        // Leemos las colecciones
        var collection = col.components.filter(x => !x.rejected);

        for (let c of collection) {
            x.push(c.coordinates.x)
            y.push(c.coordinates.y)
            z.push(c.coordinates.z)
        }
    }

    // Calculamos las inclinaciones y las guardamos en un array
    var coordinates = math.matrix([x, y, z])
    var directions = cart2dir(math.transpose(coordinates))

    var inclinations = []

    for (let d of directions._data) {
        inclinations.push(d[1])
    }

    // Calculamos los datos para ese array de inclinaciones
    var data = Pal.EvaluateInput(inclinations)

    drawIOTables(data)
    // bootstrapFoldtestIO()
}

function drawIOTables(data) {
    document.getElementById("table-inclination-only").innerHTML = [
        "  <thead>",
        "  <tr>",
        "    <td>Number of samples</td>",
        "    <td>Arithmetic mean</td>",
        "    <td>Inverse variance</td>",
        "    <td>Mean inclination (I)</td>",
        "    <td>Precision parameter (κ)</td>",
        "    <td>Angular standard deviation (θ<sub>63</sub>)</td>",
        "    <td>95% confidence limits (α<sub>95</sub>)</td>",
        "    <td>Error flag</td>",
        "  </tr>",
        "  </thead>",
        "  <tbody>",
        "  <tr>",
        "    <td>" + data.nSamples + "</td>",
        "    <td>" + data.arithmeticMean + "</td>",
        "    <td>" + data.inverseVariance + "</td>",
        "    <td>" + data.meanInclination + "</td>",
        "    <td>" + data.precisionParameter + "</td>",
        "    <td>" + data.angularStandardDeviation + "</td>",
        "    <td>" + data.confidenceLimits95 + "</td>",
        "    <td>" + data.errorFlag + "</td>",
        "  </tbody>"
    ].join("\n")
}


