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

// Returns a tab-delimited row of a MagIC table, in the order of its header
function getMagicRow(header, row) {
  return header.map(column => (row[column] === undefined || row[column] === null) ? "" : row[column]).join("\t");
}
