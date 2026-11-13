// Rows of the MagIC (data model 3.0) measurements and specimens tables, shared by the
// MagIC exports of the converter (convert_MAGIC) and of the MagIC page (exportMagIC)

const MAGIC_PROTOCOL_CODES = { thermal: "LP-DIR-T", alternating: "LP-DIR-AF" };
const MAGIC_STEP_CODES = { thermal: "LT-T-Z", alternating: "LT-AF-Z" };
const MAGIC_STEP_UNITS = { thermal: "K", alternating: "T" };

// treat_temp of the steps without heating (the NRM and alternating field steps), as PmagPy writes it and Demag GUI reads it
const MAGIC_UNHEATED_TEMPERATURE = 273;

// Returns "thermal" or "alternating" for a type set by an importer or entered by the user (e.g. "AF"), or null
function getMagicDemagnetizationType(type) {
  const value = String(type).trim().toLowerCase();
  if (["thermal", "th", "t"].includes(value)) return "thermal";
  if (["alternating", "af", "a"].includes(value)) return "alternating";
  return null;
}

// Returns the type given by the units of the step labels (20mT, AF 40; 350C, T350), or null
function getMagicDemagnetizationTypeFromSteps(steps) {
  const types = new Set();
  steps.forEach(function(step) {
    const label = String(step.step).trim();
    if (/mT$/i.test(label) || /^AF/i.test(label)) types.add("alternating");
    else if (/\d\s*(°|º)?C$/i.test(label) || /^T\s*\d/i.test(label)) types.add("thermal");
  });
  return types.size === 1 ? [...types][0] : null;
}

// Returns a Map of each specimen with steps to its type: the importer's, or the one given by the step labels.
// The type of the other specimens is asked once; cancel leaves them out (type null).
function getMagicDemagnetizationTypes(specimens) {
  const types = new Map();
  const untyped = [];

  specimens.forEach(function(specimen) {
    if (!specimen.steps || specimen.steps.length === 0) return;
    const type = getMagicDemagnetizationType(specimen.demagnetizationType) || getMagicDemagnetizationTypeFromSteps(specimen.steps);
    if (type === null) untyped.push(specimen);
    types.set(specimen, type);
  });

  if (untyped.length === 0) return types;

  const names = (list) => list.slice(0, 5).map(x => x.name).join(", ") + (list.length > 5 ? ", ..." : "");

  const askedType = getMagicDemagnetizationType(prompt(
    `${untyped.length} specimen(s) have no demagnetization type (${names(untyped)}). ` +
    "Enter thermal or alternating (AF) to use for all of them, or cancel to leave them out. " +
    "The type of each specimen can be set in the interpretation portal."
  ));

  if (askedType === null) {
    notify("danger", `${untyped.length} specimen(s) without a demagnetization type were left out of the MagIC export: ${names(untyped)}.`);
  } else {
    // Thermal steps all at 200 °C or less, or alternating fields above 300 mT
    const unlikely = untyped.filter(function(specimen) {
      const values = specimen.steps.map(x => getMagicStepValue(x.step)).filter(x => !isNaN(x));
      if (values.length === 0) return false;
      const highest = Math.max(...values);
      return askedType === "thermal" ? highest <= 200 : highest > 300;
    });
    if (unlikely.length > 0) {
      notify("warning", `${unlikely.length} of the specimen(s) exported as ${askedType} have steps to ${askedType === "thermal" ? "200 or less" : "more than 300"}: ${names(unlikely)}. Check their demagnetization type.`);
    }
  }

  untyped.forEach(specimen => types.set(specimen, askedType));
  return types;
}

// Returns the first number in a step label (T350, 350C, 20mT, A20): °C or mT.
// The NRM (NRM, an empty label, or a type without a number such as AF) is 0; other labels without a number are NaN.
function getMagicStepValue(step) {
  const label = String(step).trim();
  const number = label.match(/\d*\.?\d+/);
  if (number === null) return /^(NRM|N|AF|A|TH|T|)$/i.test(label) ? 0 : NaN;
  return Number(number[0]);
}

// Converts a step value to MagIC units: °C to K, mT to T
function toMagicStep(type, value) {
  if (type === "thermal") return value + 273;
  return Number((value / 1000).toPrecision(12)); // avoids 0.007500000000000001
}

// Returns the treatment columns and method codes of a step: LT-NO for the NRM (a step of 0, or a first
// thermal step at room temperature), LT-T-Z or LT-AF-Z otherwise
function getMagicMeasurementTreatment(type, step, index) {
  const value = getMagicStepValue(step);
  const protocol = MAGIC_PROTOCOL_CODES[type];

  // A label without a number is written without a treatment
  if (isNaN(value)) {
    return { value: value, treat_temp: "", treat_ac_field: "", method_codes: protocol };
  }

  const isNRM = value === 0 || (type === "thermal" && index === 0 && value <= 25);

  return {
    value: value,
    treat_temp: (type === "thermal" && !isNRM) ? toMagicStep(type, value) : MAGIC_UNHEATED_TEMPERATURE,
    treat_ac_field: type === "alternating" ? toMagicStep(type, value) : 0,
    method_codes: (isNRM ? "LT-NO" : MAGIC_STEP_CODES[type]) + ":" + protocol
  };
}

// Returns the lowest and highest treatment (as in the measurements table) of the steps of a specimen
// with the given indices, or of all its steps
function getMagicStepRange(type, specimen, indices) {
  const values = [];
  specimen.steps.forEach(function(step, i) {
    if (indices && !indices.includes(i)) return;
    const treatment = getMagicMeasurementTreatment(type, step.step, i);
    const value = type === "thermal" ? treatment.treat_temp : treatment.treat_ac_field;
    if (value !== "") values.push(value);
  });
  return {
    meas_step_min: values.length ? Math.min(...values) : "",
    meas_step_max: values.length ? Math.max(...values) : "",
    meas_step_unit: MAGIC_STEP_UNITS[type]
  };
}

// The reference frames of the interpretations, with their MagIC tilt correction and method code
const MAGIC_REFERENCE_FRAMES = [
  { reference: "specimen", tiltCorrection: -1, code: "DA-DIR" },
  { reference: "geographic", tiltCorrection: 0, code: "DA-DIR-GEO" },
  { reference: "tectonic", tiltCorrection: 100, code: "DA-DIR-TILT" }
];

// Returns the rows of the specimens table for the interpretations of a specimen: one row per interpretation
// in specimen, geographic and (with bedding) tectonic coordinates. base holds the columns of every row.
// A plane fitted to a mean direction (McFadden & McElhinny, 1988) has a fitted line: it is not written
// as an interpretation, and the description of the plane gives its direction.
function getMagicInterpretationRows(specimen, type, base) {
  const protocol = MAGIC_PROTOCOL_CODES[type];
  const isSet = (value) => value !== null && value !== undefined;
  const hasOrientation = isSet(specimen.coreAzimuth) && isSet(specimen.coreDip);
  const hasBedding = hasOrientation && isSet(specimen.beddingStrike) && isSet(specimen.beddingDip);
  const interpretations = specimen.interpretations || [];
  const components = [];
  const rows = [];

  interpretations.forEach(function(interpretation) {

    if (interpretation.fitted && interpretation.type === "TAU1") return;

    // Component names are unique per specimen (ChRM, ChRM_2, ...)
    const group = interpretation.group || "DEFAULT";
    const count = components.filter(x => x === group).length;
    components.push(group);

    let code = "DE-BFL";
    if (interpretation.type === "TAU3") code = "DE-BFP";
    else if (interpretation.anchored) code = "DE-BFL-A";

    const row = Object.assign({}, base, getMagicStepRange(type, specimen, getMagicInterpretationSteps(specimen, interpretation).indices), {
      dir_comp: count === 0 ? group : group + "_" + (count + 1),
      dir_n_measurements: interpretation.steps.length,
      result_quality: "g",
      software_packages: ("Paleomagnetism.org " + (interpretation.version || "")).trim()
    });

    if (isSet(interpretation.MAD) && !isNaN(interpretation.MAD)) {
      row[interpretation.anchored ? "dir_mad_anc" : "dir_mad_free"] = Number(Number(interpretation.MAD).toFixed(4));
    }

    // Angle between a free line and the center of mass of its steps
    const centerMass = interpretation.specimen.centerMass;
    if (code === "DE-BFL" && centerMass && literalToCoordinates(centerMass).length > 0) {
      const cosine = literalToCoordinates(interpretation.specimen.coordinates).unit().dot(literalToCoordinates(centerMass).unit());
      row.dir_dang = Number((Math.acos(Math.max(-1, Math.min(1, cosine))) / RADIANS).toFixed(4));
    }

    // The fitted line of this plane, if it was fitted to a mean direction
    const fitted = interpretations.find(x => x.fitted && x.type === "TAU1" && x.group === interpretation.group && x.steps.join() === interpretation.steps.join());

    MAGIC_REFERENCE_FRAMES.forEach(function(frame) {

      if (frame.reference === "geographic" && !hasOrientation) return;
      if (frame.reference === "tectonic" && !hasBedding) return;

      const direction = getMagicInterpretationCoordinates(specimen, interpretation, frame.reference).toVector(Direction);

      const notes = [];
      if (interpretation.type === "TAU3") {
        notes.push("pole to the best-fit plane " + (interpretation.anchored ? "through the origin" : "through the center of mass of the steps"));
      }
      if (fitted) {
        const fittedDirection = getMagicInterpretationCoordinates(specimen, fitted, frame.reference).toVector(Direction);
        notes.push(`direction on this plane fitted to a mean direction (McFadden and McElhinny, 1988): ${fittedDirection.dec.toFixed(1)} / ${fittedDirection.inc.toFixed(1)}`);
      }
      if (interpretation.comment) notes.push(String(interpretation.comment));

      rows.push(Object.assign({}, row, {
        dir_dec: Number(direction.dec.toFixed(4)),
        dir_inc: Number(direction.inc.toFixed(4)),
        dir_tilt_correction: frame.tiltCorrection,
        method_codes: [protocol, code, frame.code].join(":"),
        description: notes.join("; ")
      }));

    });

  });

  return rows;
}

// Returns the steps (indices) an interpretation uses. Interpretations keep the labels of their steps, and only
// visible steps can be selected, so each label is matched in order to the next visible step with that label (or,
// without one, the next step with it). The steps are ambiguous when another visible step has one of the labels.
function getMagicInterpretationSteps(specimen, interpretation) {
  const indices = [];
  let from = 0;
  interpretation.steps.forEach(function(label) {
    const next = (visibleOnly) => specimen.steps.findIndex((step, i) => i >= from && step.step === label && (!visibleOnly || step.visible !== false));
    const index = next(true) >= 0 ? next(true) : next(false);
    if (index < 0) return;
    indices.push(index);
    from = index + 1;
  });
  const ambiguous = specimen.steps.some((step, i) => !indices.includes(i) && step.visible !== false && interpretation.steps.includes(step.step));
  return { indices: indices, ambiguous: ambiguous };
}

// Returns the steps (indices) that MagIC marks b, so that the interpretations can be re-made from the measurements:
// steps hidden in Paleomagnetism.org, and steps between the first and last step of an interpretation that it does
// not use. A step that an interpretation uses is not marked; if another interpretation skips it, it is a conflict,
// as are steps that cannot be told apart from those an interpretation uses.
function getMagicExcludedSteps(specimen) {
  const skipped = new Set();
  const used = new Set();
  let ambiguous = false;

  (specimen.interpretations || []).forEach(function(interpretation) {
    const steps = getMagicInterpretationSteps(specimen, interpretation);
    const indices = steps.indices;
    if (steps.ambiguous) ambiguous = true;
    if (indices.length === 0) return;
    indices.forEach(i => used.add(i));
    for (let i = Math.min(...indices); i <= Math.max(...indices); i++) {
      if (!indices.includes(i)) skipped.add(i);
    }
  });

  const hidden = specimen.steps.map((step, i) => step.visible === false ? i : -1).filter(i => i >= 0);

  return {
    excluded: new Set([...skipped, ...hidden].filter(i => !used.has(i))),
    conflicts: [...skipped].filter(i => used.has(i)),
    ambiguous: ambiguous
  };
}

// Warns about specimens in which a step left out of one interpretation is used by another
function notifyMagicSkippedStepConflicts(names) {
  if (names.length === 0) return;
  notify("warning", `In ${names.length} specimen(s) an interpretation cannot be re-made from the MagIC measurements, because a step left out of one interpretation is used by another, or steps with the same label cannot be told apart: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ", ..." : ""}.`);
}

// Returns the direction of an interpretation in a reference frame: as stored with the interpretation (editing the
// orientation of a specimen removes its interpretations), or rotated from specimen coordinates
function getMagicInterpretationCoordinates(specimen, interpretation, reference) {
  if (interpretation[reference] && interpretation[reference].coordinates) {
    return literalToCoordinates(interpretation[reference].coordinates);
  }
  const coordinates = inReferenceCoordinates(reference, specimen, literalToCoordinates(interpretation.specimen.coordinates));
  // Poles to planes are in the upper hemisphere
  return (interpretation.type === "TAU3" && coordinates.z > 0) ? coordinates.reflect() : coordinates;
}

// Warns about samples whose specimens (or copies of one specimen) have different orientations or bedding:
// the samples table holds one orientation per sample
function notifyMagicOrientationConflicts(specimens, getSample) {
  const orientations = new Map();
  const conflicts = [];

  specimens.forEach(function(specimen) {
    const sample = getSample(specimen);
    const orientation = JSON.stringify([specimen.coreAzimuth, specimen.coreDip, specimen.beddingStrike, specimen.beddingDip]);
    if (!orientations.has(sample)) orientations.set(sample, orientation);
    else if (orientations.get(sample) !== orientation && !conflicts.includes(sample)) conflicts.push(sample);
  });

  // A specimen name that occurs more than once is exported as one specimen with the measurements of all copies
  const names = specimens.map(x => x.name);
  const repeated = [...new Set(names.filter((name, i) => names.indexOf(name) !== i))];
  if (repeated.length > 0) {
    notify("warning", `${repeated.length} specimen name(s) occur more than once: ${repeated.slice(0, 5).join(", ")}${repeated.length > 5 ? ", ..." : ""}. ` +
      "Their copies are exported as numbered experiments of one specimen. Give them distinct names if they are different specimens.");
  }

  if (conflicts.length === 0) return;

  notify("warning", `${conflicts.length} sample(s) have specimens (or copies of a specimen) with different orientations or bedding: ${conflicts.slice(0, 5).join(", ")}${conflicts.length > 5 ? ", ..." : ""}. ` +
    "The MagIC samples table holds the orientation of the first, so the geographic and tilt-corrected directions of the others do not follow from it. " +
    "Give these specimens distinct names and samples before exporting.");
}

// Returns a function giving the site of a sample by one of PmagPy's sample naming conventions
// ("1", "2", "3", "4-Z", "5", "7-Z"), or null for an answer that is not one of them
function parseMagicSiteNaming(answer) {
  if (answer === null || answer === undefined) return null;
  const match = String(answer).trim().match(/^([1-57])(?:-(\d+))?$/);
  if (!match) return null;
  const convention = match[1];
  const z = Number(match[2]);
  if ((convention === "4" || convention === "7") && !(z > 0)) return null;
  const site = function(sample) {
    switch (convention) {
      case "1": return sample.slice(0, -1);
      case "2": return sample.replace(/^-+|-+$/g, "").split("-")[0];
      case "3": return sample.split(".")[0];
      case "4": return sample.slice(0, -z);
      case "7": return sample.slice(0, z);
      default: return sample;
    }
  };
  // A convention that leaves nothing of the name gives the sample name
  return sample => site(String(sample)) || String(sample);
}

// Asks once how site names follow from the sample names; an answer that is not a convention uses the sample names
function getMagicSiteNaming() {
  const answer = prompt(
    "Sites are taken from the sample names. Enter the sample naming convention: " +
    "1 = XXXXY (site XXXX, sample letter Y); 2 = XXXX-YY; 3 = XXXX.YY; " +
    "4-Z = XXXXYYY with a sample designation of Z characters; 5 = site name same as sample; " +
    "7-Z = XXXXYYY with a site designation of Z characters.", "5");
  const naming = parseMagicSiteNaming(answer);
  if (naming === null) {
    notify("warning", "No sample naming convention was given (" + answer + "): each sample is exported as its own site.");
    return parseMagicSiteNaming("5");
  }
  return naming;
}

// MagIC dip (the plunge of the specimen X axis) from the Paleomagnetism.org core dip, between -180 and 180
function getMagicDip(coreDip) {
  if (coreDip === null || coreDip === undefined || coreDip === "") return "";
  const dip = ((coreDip - 90 + 180) % 360 + 360) % 360 - 180;
  return roundToPrecisionOf(dip, coreDip);
}

// MagIC azimuth (0-360) from a Paleomagnetism.org azimuth or strike plus an offset, or "" when it is not set
function getMagicAzimuth(value, offset) {
  if (value === null || value === undefined || value === "") return "";
  return roundToPrecisionOf((((value + (offset || 0)) % 360) + 360) % 360, value);
}

// Returns the age columns of a site from the [age, ageMin, ageMax] of its specimens (Ma): their age (the mean
// when they differ) and the lowest and highest bounds, or empty columns without ages
function getMagicSiteAge(ages) {
  const numbers = (k) => ages.map(x => x[k]).filter(x => x !== null && x !== undefined && x !== "" && !isNaN(x)).map(Number);
  const age = numbers(0), low = numbers(1), high = numbers(2);
  if (age.length + low.length + high.length === 0) return { age: "", age_low: "", age_high: "", age_unit: "" };
  return {
    age: age.length === 0 ? "" : (new Set(age).size === 1 ? age[0] : age.reduce((a, b) => a + b) / age.length),
    age_low: low.length ? Math.min(...low) : "",
    age_high: high.length ? Math.max(...high) : "",
    age_unit: "Ma"
  };
}

// One location holds all sites of the export (MagIC requires each site to have one). Locations that group
// sites differently, such as those of poles, can be added to it later.
const MAGIC_LOCATION_HEADER = [
  "location", "location_type", "geologic_classes", "lithologies", "lat_s", "lat_n", "lon_w", "lon_e",
  "age_low", "age_high", "age_unit", "method_codes", "citations", "software_packages", "description"
];

// Asks for the name of the location of the study; an empty answer or cancel keeps the default name
function getMagicLocationName(defaultName) {
  const answer = prompt("All sites are put in one location for the study. Enter its name (for example the study area):", defaultName);
  return (answer === null || answer.trim() === "") ? defaultName : answer.trim();
}

// Returns the row of the study location from its specimens: latitude and longitude bounds (longitudes 0-360,
// across 0 when that spans less), ages, geology, lithology and the protocol codes
function getMagicLocationRow(name, specimens, protocols) {
  const isNumber = (x) => x !== null && x !== undefined && x !== "" && !isNaN(x);
  const positioned = specimens.filter(x => isNumber(x.latitude) && isNumber(x.longitude));
  const latitudes = positioned.map(x => Number(x.latitude));
  const wrap = (x) => (x % 360 < 0 ? x % 360 + 360 : x % 360);
  const longitudes = [...new Set(positioned.map(x => wrap(Number(x.longitude))))].sort((a, b) => a - b);

  // West and east bounds are on either side of the widest gap between longitudes
  let west = "", east = "";
  if (longitudes.length > 0) {
    let gap = longitudes[0] + 360 - longitudes[longitudes.length - 1];
    west = longitudes[0];
    east = longitudes[longitudes.length - 1];
    for (let i = 1; i < longitudes.length; i++) {
      if (longitudes[i] - longitudes[i - 1] > gap) {
        gap = longitudes[i] - longitudes[i - 1];
        west = longitudes[i];
        east = longitudes[i - 1];
      }
    }
  }

  const lows = specimens.flatMap(x => [x.ageMin, x.age]).filter(isNumber).map(Number);
  const highs = specimens.flatMap(x => [x.ageMax, x.age]).filter(isNumber).map(Number);

  return {
    location: name,
    location_type: determineLocationType(latitudes, positioned.map(x => x.longitude), specimens.map(x => x.level)),
    geologic_classes: getMagicGeologicClasses(specimens.map(x => x.geology)),
    lithologies: joinMagicValues(specimens.map(x => x.lithology)),
    lat_s: latitudes.length ? Math.min(...latitudes) : "",
    lat_n: latitudes.length ? Math.max(...latitudes) : "",
    lon_w: west,
    lon_e: east,
    age_low: lows.length ? Math.min(...lows) : "",
    age_high: highs.length ? Math.max(...highs) : "",
    age_unit: lows.length || highs.length ? "Ma" : "",
    method_codes: joinMagicValues(protocols),
    citations: "This study",
    software_packages: "Paleomagnetism.org " + __VERSION__,
    description: "All sites of the study"
  };
}

// Returns the mean of positions [latitude, longitude] as { lat, lon } (longitude 0-360), or null without positions
function getMagicMeanPosition(positions) {
  const valid = positions.filter(p => p[0] !== null && p[0] !== undefined && p[1] !== null && p[1] !== undefined);
  if (valid.length === 0) return null;
  let x = 0, y = 0, z = 0;
  valid.forEach(function([lat, lon]) {
    x += Math.cos(lat * RADIANS) * Math.cos(lon * RADIANS);
    y += Math.cos(lat * RADIANS) * Math.sin(lon * RADIANS);
    z += Math.sin(lat * RADIANS);
  });
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / RADIANS;
  const lon = ((Math.atan2(y, x) / RADIANS) + 360) % 360;
  return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
}

// Joins the distinct, non-empty values of a list with ":"
function joinMagicValues(values) {
  return [...new Set(values.filter(x => x !== null && x !== undefined && String(x).trim() !== "").map(String))].join(":");
}

// MagIC vocabulary value for a geologic class or type that is not given
const MAGIC_NOT_SPECIFIED = "Not Specified";

// Returns the geologic classes of a value or list of values, or "Not Specified" without any
function getMagicGeologicClasses(values) {
  return joinMagicValues([].concat(values)) || MAGIC_NOT_SPECIFIED;
}

// Lab formats that give magnetizations (A/m) without a specimen volume, and the volume (cc) their importers set
const MAGIC_ASSUMED_VOLUMES = { ANU: 10, JR5: 10, JR6: 10, CENIEH: 10, CENIEHREG: 10, MUNICH: 10, XIAN: 10, RS3: 1 };

// Returns the specimen volume in cc, or null when it is not given or was assumed on import
function getMagicVolume(specimen) {
  const volume = Number(specimen.volume);
  if (specimen.volume === null || specimen.volume === undefined || specimen.volume === "" || !(volume > 0)) return null;
  if (specimen.volumeAssumed || MAGIC_ASSUMED_VOLUMES[specimen.format] === volume) return null;
  return volume;
}

// Returns the magnetization of a step: magn_volume (A/m) and, with a specimen volume, the moment magn_moment
// and its components magn_x, magn_y, magn_z (Am²). Steps are in μA/m, or in pAm² for the Utrecht intensity bug.
// Specimens marked volumeAssumed were imported from moments with an assumed volume: they get the moment only.
function getMagicMagnetization(specimen, step) {
  const volume = getMagicVolume(specimen);
  const length = Math.sqrt(step.x * step.x + step.y * step.y + step.z * step.z);
  let momentScale = null, volumeScale = null;
  if (specimen.volumeAssumed && Number(specimen.volume) > 0) {
    momentScale = 1E-12 * Number(specimen.volume);
  } else if (isUtrechtIntensityBug(specimen)) {
    momentScale = 1E-12;
    if (volume !== null) volumeScale = 1E-6 / volume;
  } else {
    volumeScale = 1E-6;
    if (volume !== null) momentScale = 1E-12 * volume;
  }
  return {
    magn_x: momentScale === null ? "" : momentScale * step.x,
    magn_y: momentScale === null ? "" : momentScale * step.y,
    magn_z: momentScale === null ? "" : momentScale * step.z,
    magn_moment: momentScale === null ? "" : momentScale * length,
    magn_volume: volumeScale === null ? "" : volumeScale * length
  };
}

// Returns a tab-delimited row of a MagIC table, in the order of its header
function getMagicRow(header, row) {
  return header.map(column => (row[column] === undefined || row[column] === null) ? "" : row[column]).join("\t");
}
