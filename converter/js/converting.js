// Global variable for converter specimens
var specimens = [];

function xyzToDirectionFromStep(step) {
  const x = Number(step.x);
  const y = Number(step.y);
  const z = Number(step.z);

  const intensity = Math.sqrt(x*x + y*y + z*z);

  if (intensity === 0) {
    return { dec: 0, inc: 0, intensity: 0 };
  }

  let dec = Math.atan2(x, y) * 180.0 / Math.PI;
  if (dec < 0) dec += 360;

  let inc = Math.atan2(z, Math.sqrt(x*x + y*y)) * 180.0 / Math.PI;

  return {
    dec: dec,
    inc: inc,
    intensity: intensity
  };
}

function stepToCoordinates(step) {
  return new Coordinates(Number(step.x) || 0, Number(step.y) || 0, Number(step.z) || 0);
}

function stepToDirection(step) {
  return stepToCoordinates(step).toVector(Direction);
}

function normalizeDec(dec) {
  var value = Number(dec) || 0;
  if (value < 0) {
    value += 360;
  }
  return value % 360;
}

function safeFileBase(specimen, index) {
  const baseName = (specimen.name || specimen.sample || `specimen_${sIndex + 1}`);
  const safeBase = baseName.replace(/[^a-z0-9_\-]/gi, "_");
  //const base = (specimen.originalFile || specimen.sample || specimen.name || ("specimen_" + (index + 1))).toString();
  return safeBase;
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPerSpecimenText(specimensList, extension, suffix, buildContent) {
  const multiple = specimensList.length > 1;
  if (!multiple) {
    const only = specimensList[0];
    const base = safeFileBase(only, 0);
    downloadTextFile(buildContent(only, 0), base + suffix + extension);
    return;
  }

  const zip = new JSZip();
  specimensList.forEach(function(specimen, index) {
    const base = safeFileBase(specimen, index);
    zip.file(base + suffix + extension, buildContent(specimen, index));
  });

  zip.generateAsync({ type: "blob" }).then(function(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = extension.replace(/^\./, "") + "_export.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Returns a Promise<string> with the hex SHA-256 of `message`
function sha256Hex(message) {
  if (!window.crypto || !crypto.subtle) {
    throw new Error("Web Crypto API not available — include a polyfill (e.g. js-sha256).");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function convert_UTRECHT() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }
  let content = "";
  content += "\n"; // top header
  specimens.forEach(function(specimen) {
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;
    
    // Header
    content += `"${sample}",,${coreAzimuth},${coreDip},${volume},${beddingStrike},${beddingDip}\n`;
    
    steps.forEach(function(step) {
      const a = -step.z * volume;
      const b = -step.x * volume;
      const c = step.y * volume;
      content += `${step.step},${a},${b},${c},${step.error},,\n`;
    });
    
    content += "9999\n";
  });

  content += '"END"\n';
  
  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  let exportName = specimens[0].originalFile || "converted_specimens.th";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_utrecht.th";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convert_HELSINKI() {
  console.warn(
    "Helsinki format does not store orientation metadata. " +
    "bedding orientations will be lost."
  );
  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".csv", "_converted_to_helsinki", function(specimen) {
    let content = "";
    const { sample, volume, coreAzimuth, coreDip, demagnetizationType, steps } = specimen;

    // ---- Header (first 12 lines, mostly placeholders except a few fields) ----
    // We'll reconstruct enough to make it a valid Helsinki file
    content += ";\n".repeat(5); // lines 0-4: empty placeholders

    // Line 5: sample name + core azimuth
    // Format: ;sampleName;;;;;;coreAzimuth
    content += `;${sample};;;;;;${coreAzimuth}\n`;

    // Line 6: core dip
    content += `;;;;;;;${coreDip}\n`;

    // Line 7: volume and demagnetization type
    // Format: ;;volume;;;;;demagType
    content += `;;${volume};;;;;${demagnetizationType}\n`;

    // Lines 8-11: empty placeholders
    content += ";\n".repeat(4);

    // ---- Measurements ----
    steps.forEach(function(step) {
      // Convert µA/m back to mA/m (divide by 1E3)
      const x = (step.x / 1E3).toFixed(6);
      const y = (step.y / 1E3).toFixed(6);
      const z = (step.z / 1E3).toFixed(6);

      // Build a 24-field row (only some are filled, rest empty)
      let fields = new Array(24).fill("");
      fields[1] = step.step;
      fields[13] = x;
      fields[14] = y;
      fields[15] = z;

      content += fields.join(";") + "\n";
    });
    return content;
  });
}

function convert_HELSINKIBLOCK() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".csv", "_converted_to_helsinki_block", function(specimen) {
    let content = "";
    const { sample, volume, coreAzimuth, coreDip, demagnetizationType, steps } = specimen;

    // Reverse transform azimuth back to strike
    const strike = (Number(coreAzimuth) + 90).toFixed(1);

    // Reverse transform dip convention
    const dip = 90 - Number(coreDip);

    // Header block — need at least 12 lines 
    content += ";\n".repeat(5); // filler lines 0-4
    content += `;${sample};;;;;;${strike}\n`; // line 5 (sample + strike)
    content += `;;;;;;;${dip}\n`;              // line 6 (dip)
    content += `;;${volume};;;;;${demagnetizationType}\n`; // line 7 (volume + type)
    content += ";\n".repeat(4); // filler lines 8-11

    // Now add steps (after line 12)
    steps.forEach(function(step) {
      // Reverse conversion (back to mA/m, so divide by 1E3)
      const y = step.y / 1E3;
      const x = step.x / 1E3;
      const z = step.z / 1E3;

      // Use semicolon-separated fields (24 columns needed)
      // Only filling the key indices used by importer: 1, 5, 6, 13, 14, 15
      // Others stay empty.
      let cols = new Array(24).fill("");
      cols[1] = step.step;
      cols[5] = "0";   // dec (not recovered from import, so placeholder)
      cols[6] = "0";   // inc (not recovered, placeholder)
      cols[13] = y;
      cols[14] = -x;
      cols[15] = z;

      content += cols.join(";") + "\n";
    });
    return content;
  });
}

function convertAgicoInverse(coreAzimuth, coreDip, beddingStrike, beddingDip) {

  const P1 = 12;
  const P2 = 0;
  const P3 = 12;
  const P4 = 90;

  const exportCoreDip = 90 - coreDip;
  const exportBeddingStrike = beddingStrike;

  return {
    P1,
    P2,
    P3,
    P4,
    coreAzimuth,
    coreDip: exportCoreDip,
    beddingStrike: exportBeddingStrike,
    beddingDip
  };
}

function convert_RS3() {

  if (!Array.isArray(specimens) || specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  const multiple = specimens.length > 1;
  const zip = multiple ? new JSZip() : null;

  specimens.forEach(function(specimen, sIndex) {

    const sample = (specimen.sample || specimen.name || `S${sIndex}`)
      .toString()
      .substring(0, 8);

    const latitude  = specimen.latitude  != null ? specimen.latitude  : 0;
    const longitude = specimen.longitude != null ? specimen.longitude : 0;

    const internalCoreAzimuth   = Number(specimen.coreAzimuth)   || 0;
    const internalCoreDip       = Number(specimen.coreDip)       || 0;
    const internalBeddingStrike = Number(specimen.beddingStrike) || 0;
    const internalBeddingDip    = Number(specimen.beddingDip)    || 0;

    const agico = convertAgicoInverse(
      internalCoreAzimuth,
      internalCoreDip,
      internalBeddingStrike,
      internalBeddingDip
    );


    const steps = Array.isArray(specimen.steps) ? specimen.steps : [];

    // Supported AGICO parameter set
    const P1 = 12;
    const P2 = 0;
    const P3 = 12;
    const P4 = 90;

    let content = "";

    // ---------------- HEADER LINE ----------------
    // We build a 122-character fixed-width header to satisfy import slices
	  content += " ".repeat(120) + "\n";  //adds top header
    let header = Array(130).fill(" ");

    function writeAt(str, start) {
      for (let i = 0; i < str.length; i++) {
        header[start + i] = str[i];
      }
    }

    writeAt(sample.padEnd(8, " "), 0);                // 0–7 sample name
    writeAt(String(latitude).padStart(4, " "), 21);  // 21–24 latitude
    writeAt(String(longitude).padStart(4, " "), 31); // 31–34 longitude
    writeAt(String(agico.coreAzimuth).padStart(3, " "), 74);
    writeAt(String(agico.coreDip).padStart(3, " "), 79);
    writeAt(String(agico.beddingStrike).padStart(4, " "), 86);
    writeAt(String(agico.beddingDip).padStart(3, " "), 92);

    writeAt(String(agico.P1).padStart(2, " "), 110);
    writeAt(String(agico.P2).padStart(2, " "), 113);
    writeAt(String(agico.P3).padStart(2, " "), 116);
    writeAt(String(agico.P4).padStart(2, " "), 119);


    content += header.join("") + "\n";

    // ---------------- DEMAG LINE ----------------
    let demagLine = Array(20).fill(" ");

    const isThermal = specimen.demagnetizationType === "thermal";
    const demagText = isThermal ? "C" : "AF";

    for (let i = 0; i < demagText.length; i++) {
      demagLine[4 + i] = demagText[i];  // slice(4,11) used in import
    }

    content += demagLine.join("") + "\n";

    // ---------------- STEPS ----------------
    steps.forEach(function(stepObj, idx) {

      const stepNum = stepObj.step !== undefined ? stepObj.step : (idx + 1);

      // Convert Cartesian → Direction
      const coords = new Coordinates(stepObj.x, stepObj.y, stepObj.z);
      const dir = coords.toVector(Direction);

      const intensity = dir.length / 1E6;  // back to A/m
      const declination = dir.dec;
      const inclination = dir.inc;
      const a95 = stepObj.error || 0;

      let line = Array(120).fill(" ");

      function writeStep(str, start) {
        for (let i = 0; i < str.length; i++) {
          line[start + i] = str[i];
        }
      }
	    const stepStr = String(Math.round(Number(stepNum)));  // convert step whole number, else it won't fit in the character box
      writeStep(stepStr.padStart(3, " "), 3);		       // 3–5
      writeStep(intensity.toExponential(6), 15);             // 15–27
      writeStep(declination.toFixed(1).padStart(5, " "), 28); // 28–32
      writeStep(inclination.toFixed(1).padStart(5, " "), 34); // 34–38
      writeStep(String(a95).padStart(3, " "), 77);            // 77–79

      content += line.join("") + "\n";
    });

    // ---------------- EXPORT ----------------

    const baseName = (specimen.name || specimen.sample || `specimen_${sIndex + 1}`);
    const safeBase = baseName.replace(/[^a-z0-9_\-]/gi, "_");

    if (multiple) {
      zip.file(safeBase + "converted_to_rs3.rs3", content);
    } else {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeBase + "converted_to_rs3.rs3";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

  });

  // ---------------- ZIP DOWNLOAD ----------------
  if (multiple) {
    zip.generateAsync({ type: "blob" }).then(function(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rs3_export.zip";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

function convert_CALTECH() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".txt", "_converted_to_caltech", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // First line: sample name
    content += sample + "\n";

    // Second line: core & bedding parameters
    // Recall that in importCaltech we did:
    //   coreAzimuth = (rawAzimuth + 270) % 360
    //   coreDip = 90 - rawDip
    // So we invert those here
    const rawAzimuth = (coreAzimuth + 90) % 360;   // inverse of +270 % 360
    const rawDip = 90 - coreDip;

    const paramLine = 
      rawAzimuth.toString().padStart(5, " ") +
      rawDip.toString().padStart(5, " ") +
      beddingStrike.toString().padStart(5, " ") +
      beddingDip.toString().padStart(6, " ") +
      volume.toString().padStart(6, " ");
    content += paramLine + "\n";

    // Now for the steps
    steps.forEach(function(step) {
      // We have Cartesian specimen coords in µA/m.
      // Convert back to Direction (dec/inc, intensity).
      const dir = stepToDirection(step);

      const intensity = (dir.length / 1e9).toExponential(3).padStart(8, " "); // back to emu/cm^3
      const a95 = step.error ? step.error.toString().padStart(5, " ") : "     ";
      const dec = dir.dec.toFixed(1).padStart(5, " ");
      const inc = dir.inc.toFixed(1).padStart(5, " ");

      // Placeholders for GDec/GInc and TDec/TInc
      const GDec = "0.0".padStart(5, " ");
      const GInc = "0.0".padStart(5, " ");
      const TDec = "0.0".padStart(5, " ");
      const TInc = "0.0".padStart(5, " ");

      // Step label
      const stepLabel = step.step.toString().padStart(6, " ");

      // Build line with proper column spacing (import expects specific slice positions)
      // Positions: 0-5: step, 6: space, 7-11: GDec, 12: space, 13-17: GInc, etc.
      const line =
        stepLabel +        // 0–5
        " " +              // 6
        GDec +             // 7–11
        " " +              // 12
        GInc +             // 13–17
        " " +              // 18
        TDec +             // 19–23
        " " +              // 24
        TInc +             // 25–29
        " " +              // 30
        intensity +        // 31–38
        " " +              // 39
        a95 +              // 40–44
        " " +              // 45
        dec +              // 46–50
        " " +              // 51
        inc +              // 52–56
        " ".repeat(28) +   // pad until 85
        "INFO";            // placeholder metadata (85–113)
      content += line + "\n";
    });
    return content;
  });
}

function convert_LDGO() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let content = "Sample\tStep\tDec\tInc\tInt\tCoreAzimuth\tCoreHade\tBeddingStrike\tBeddingDip\tVolume\n";

  specimens.forEach(function(specimen) {
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // Convert back LDGO-specific values
    const hade = 90 - coreDip;
    const ldgoStrike = (beddingStrike + 90) % 360;

    steps.forEach(function(step) {
      // Convert cartesian coords back to direction (dec, inc, intensity)
      const dir = stepToDirection(step);

      const dec = dir.dec;
      const inc = dir.inc;
      const intensity = dir.length / 1E6; // convert uA/m back to A/m

      content += `${sample}\t${step.step}\t${dec}\t${inc}\t${intensity}\t${coreAzimuth}\t${hade}\t${ldgoStrike}\t${beddingDip}\t${volume}\n`;
    });
  });

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  let exportName = specimens[0].originalFile || "converted_specimens.txt";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_LDGO.txt";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convert_BCN2G() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_bcn2g", function(specimen) {
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;
    let content = "";

    const sampleName = (sample || "").padEnd(7, "\0").slice(0, 7);
    const volStr = String(Math.round(Number(volume) || 10)).padStart(2, "0");//volume needs to to fit in slice(14, 16))
    const coreAzStr = String(Math.round(Number(coreAzimuth) || 0)).padStart(3, "0");
    const coreDipStr = String(Math.round(Number(coreDip) || 0)).padStart(2, "0");
    const bedStrikeStr = String(Math.round(((Number(beddingStrike) || 0) + 90) % 360)).padStart(3, "0");
    const bedDipStr = String(Math.round(Number(beddingDip) || 0)).padStart(2, "0");

    // BCN2G importer expects a nested STX/ETX block structure.
    // We add two leading delimiter-separated blocks before the actual header,
    // then put each step in its own STX-delimited block.
    let header = "#####".padEnd(5, "\0") + sampleName + "\0\0" + volStr + "\0".repeat(85);
    header += coreAzStr + "\0" + "\0" + coreDipStr + "\0\0" + bedStrikeStr + "\0\0" + bedDipStr + "\0\0" + "\0" + "\0".repeat(12) + "0000";

    content += "\u0002\u0000\u0000\u0002\u0000\u0002" + header;

    (steps || []).forEach(function(step) {
      const dir = stepToDirection(step);
      const fields = new Array(26).fill("0");
      fields[3] = String(step.step);
      fields[4] = dir.dec.toFixed(2);
      fields[5] = dir.inc.toFixed(2);
      fields[11] = (dir.length / 1e9).toExponential(6);
      content += "\u0002" + fields.join("\u0000");
    });

    content += "\u0003";
    return content;
  });
}

function convert_MUNICH() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_munich", function(specimen) {
    let content = "";
    const { sample, coreAzimuth, coreDip, beddingStrike, beddingDip, steps } = specimen;

    // Convert back hade angle and bedding strike
    const hade = 90 - coreDip;
    const originalStrike = (beddingStrike + 90) % 360;

    // Header line
    content += `${sample}, ${coreAzimuth}, ${hade}, ${originalStrike}, ${beddingDip}, ""\n`;

    // Steps
    steps.forEach(function(step) {
      // Convert back to Direction (dec/inc/intensity)
      const dir = stepToDirection(step);
      const intensity_mA = dir.length / 1000.0; // back to mA

      content += `${step.step}, ${intensity_mA}, ${step.error}, ${dir.dec}, ${dir.inc}\n`;
    });
    return content;
  });
}

function convert_CENIEHREGULAR() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_ceniehregular", function(specimen) {
    let content = "";
    const { sample, steps, coreAzimuth, coreDip, beddingStrike, beddingDip, demagnetizationType } = specimen;

    // Header: file format expects "SampleName <tab> AF/TH ..."
    const typeString = demagnetizationType === "alternating" ? "AF" : "TH";
    content += `${sample}\t${typeString}\n`;

    steps.forEach(function(step) {
      // Cartesian coords back to Direction
      const dir = new Coordinates(step.x, step.y, step.z).toVector(Direction);
      let intensity = dir.length * 1E-9; // back to emu/cc
      let dec = dir.dec;
      let inc = dir.inc;

      // Rotated vectors
      let rotated = new Coordinates(step.x, step.y, step.z)
        .rotateTo(coreAzimuth, coreDip)
        .toVector(Direction);

      // Tectonic rotated vectors
      let tectonic = new Coordinates(step.x, step.y, step.z)
        .rotateTo(coreAzimuth, coreDip)
        .correctBedding(beddingStrike, beddingDip)
        .toVector(Direction);

      // Line: sampleName step intensity dec inc rotDec rotInc ... tectDec tectInc
      // Fill with blanks/tabs for unneeded cols
      content += [
        sample,
        step.step,
        intensity.toExponential(6), // keep similar numeric style
        dec.toFixed(2),
        inc.toFixed(2),
        rotated.dec.toFixed(2),
        rotated.inc.toFixed(2),
        "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", // placeholders
        tectonic.dec.toFixed(2),
        tectonic.inc.toFixed(2)
      ].join("\t") + "\n";
    });

    return content;
  });
}

function convert_CENIEH() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_cenieh", function(specimen) {
    let content = "";
    content += "SAMPLE STEP INTENSITY DEC INC .... LEVEL\n";
    const { sample, steps } = specimen;

    steps.forEach(function(step) {
      // Convert cartesian coords back into direction
      const direction = stepToDirection(step);
      const intensity = direction.length / 1e6; // import scaled by 1E6
      const declination = direction.dec;
      const inclination = direction.inc;

      // Extract level (CENIEH requires sampleName = base.level)
      let base = sample;
      let level = "";
      if (sample.includes(".")) {
        const parts = sample.split(".");
        base = parts[0];
        level = parts[1];
      }

      // Compose line: only the fields used matter
      // placeholders for unused columns ("....")
      content += `${base} ${step.step} ${intensity.toFixed(6)} ${declination.toFixed(2)} ${inclination.toFixed(2)} .... ${level}\n`;
    });
    return content;
  });
}

function convert_NGU() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_ngu", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // NGU header
    // Remember: NGU uses different conventions:
    // - coreDip is stored as 90 - coreDip
    // - beddingStrike stored as (beddingStrike - 90) % 360
    const nguCoreDip = 90 - coreDip;
    const nguBeddingStrike = (beddingStrike + 90) % 360;

    content += `${sample} ${coreAzimuth.toFixed(1)} ${nguCoreDip.toFixed(1)} ${nguBeddingStrike.toFixed(1)} ${beddingDip.toFixed(1)} ${Number(volume || 10).toFixed(2)} 1 1\n`;

    // NGU steps: convert Cartesian back to Dec/Inc/Intensity
    steps.forEach(function(step) {
      const intensity = Math.sqrt(step.x ** 2 + step.y ** 2 + step.z ** 2);
      const dec = normalizeDec(Math.atan2(step.y, step.x) * (180 / Math.PI));
      const inc = Math.asin(step.z / intensity) * (180 / Math.PI);

      // Intensity in μA -> convert back to mA
      const intensity_mA = intensity / 1E3;
      const a95 = Number(step.error) || 0.0;

      // Append additional NGU-style placeholders to match the true format.
      content += `${step.step} ${intensity_mA.toFixed(4)} ${dec.toFixed(1)} ${inc.toFixed(1)} ${a95.toFixed(1)} 0.0 0.0 NOT MS\n`;
    });

    return content;
  });
}

function convert_ANGLIA() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_anglia", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // Adjust beddingStrike back to Anglia's convention
    const angliaBeddingStrike = (beddingStrike + 90) % 360;

    // Header line (Anglia format: SampleName CoreAz CoreDip BeddingStrike BeddingDip Volume Info?)
    content += `${sample} ${coreAzimuth} ${coreDip} ${angliaBeddingStrike} ${beddingDip} ${volume}\n`;

    steps.forEach(function(step) {
      // Convert from col format coordinates back to Anglia format
      const x = -step.x; // Flip x coordinate
      const y = step.y;
      const z = step.z;

      // Convert Cartesian back to spherical (intensity, dec, inc)
      const intensity = Math.sqrt(x*x + y*y + z*z) / 1E3; // back to mA
      const dec = normalizeDec(Math.atan2(y, x) * 180 / Math.PI); // degrees
      const inc = Math.asin(z / Math.sqrt(x*x + y*y + z*z)) * 180 / Math.PI; // degrees

      content += `${step.step} ${intensity} 0 0 0 ${dec} ${inc}\n`; // fill unused fields with 0
    });
    return content;
  });
}

function convert_OXFORD() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_oxford", function(specimen) {
    let content = "";
    content += "Sample ID\tDepth\tTreatment Type\tAF Z\tTemp C\tIRM Gauss\tIntensity\tDeclination: Sample Rotated\tInclination: Sample Rotated\tDeclination: Formation Rotated\tInclination: Formation Rotated\tDeclination: Unrotated\tInclination: Unrotated\tSample Azimiuth\tSample Dip\tFormation Dip Azimuth\tFormation Dip\tMag Dev\tVolume\tX corr\tY corr\tZ corr\tX mean\tY mean\tZ mean\tDrift corrected\tTray corrected\tX drift\tY drift\tZ drift\tX bkg #1\tX bkg #2\tY bkg #1\tY bkg #2\tZ bkg #1\tZ bkg #2\t# MM averaged\tRun #\tSample Timestamp\tTray Timestamp\tOrientation\tX intensity\tY intensity\tZ intensity\tX meter\tY meter\tZ meter\n";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps, demagnetizationType } = specimen;

    steps.forEach(function(step) {
      const intensity = Math.sqrt(step.x**2 + step.y**2 + step.z**2) * volume / 1E6; // reverse uAm/m -> original units
      const dir = stepToDirection(step);
      const dec = dir.dec;
      const inc = dir.inc;

      const demagWord = demagnetizationType === "alternating" ? "Degauss" : "Thermal";
      const row = new Array(45).fill("");
      row[0] = sample;
      row[1] = "0.00";
      row[2] = demagWord;
      row[3] = demagnetizationType === "alternating" ? String(step.step) : "0";
      row[4] = demagnetizationType === "thermal" ? String(step.step) : "NA";
      row[5] = "NA";
      row[6] = (intensity || 0).toExponential(4);
      row[7] = dec.toFixed(2);
      row[8] = inc.toFixed(2);
      row[9] = "0.00";
      row[10] = "0.00";
      row[11] = dec.toFixed(2);
      row[12] = inc.toFixed(2);
      row[13] = (Number(coreAzimuth) || 0).toFixed(2);
      row[14] = (Number(coreDip) || 0).toFixed(2);
      row[15] = (((Number(beddingStrike) || 0) + 90) % 360).toFixed(2);
      row[16] = (Number(beddingDip) || 0).toFixed(2);
      row[17] = "0.00";
      row[18] = Math.abs(Number(volume) || 10);
      
      content += row.join("\t") + "\n";
    });

    return content;
  });
}

function convert_SOUTHAMPTON() {

  if (!Array.isArray(specimens) || specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(
    specimens,
    ".dat",
    "_converted_to_southampton",
    function(specimen) {

      // IMPORTANT:
      // We must NEVER leave columns empty because the importer uses:
      // split(/[\t]+/)
      // which collapses empty tab fields.

      function makeRow() {
        return new Array(67).fill("0");
      }

      let content = "";

      // Dummy header row
      content += "Southampton\tExport\n";

      const demagLabel =
        specimen.demagnetizationType === "alternating"
          ? "Degauss"
          : "Thermal";

      const stepIndex =
        specimen.demagnetizationType === "alternating"
          ? 62
          : 66;

      const sampleVolume =
        Math.abs(Number(specimen.volume) || 1);

      // Importer reverses this with +270
      const bedStrikeInput =
        (Number(specimen.beddingStrike) + 90) % 360;


      // Measurement rows
      (specimen.steps || []).forEach(function(step) {

        const dir = stepToDirection(step);

        const row = makeRow();

        row[0] = specimen.sample || specimen.name || "";

        row[5] = sampleVolume;

        row[7]  = dir.inc.toFixed(4);
        row[10] = dir.dec.toFixed(4);

        // Importer converts back using:
        // intensity = 1E6 * value / sampleVolume
        row[13] =
          ((dir.length * sampleVolume) / 1E6).toExponential(8);

        row[14] = Number(specimen.coreAzimuth) || 0;
        row[15] = Number(specimen.coreDip) || 0;

        row[16] = bedStrikeInput;
        row[17] = Number(specimen.beddingDip) || 0;

        row[59] = demagLabel;

        row[stepIndex] = step.step;

        content += row.join("\t") + "\n";
      });

      return content;
    }
  );
}

function convert_PALEOMAC() {
  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }
  downloadPerSpecimenText(specimens, ".pmd", "_converted_to_paleomac", function(specimen) {
    let content = "";
    content += "\n"; // initial blank line to match import slice(1)
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // specimen.volume is stored as (m³ × 1E6), so convert back to m³
    const sampleVolumeM3 = volume / 1E6;

    // Header field formatting — each must occupy EXACT character positions:
    // pos 0-8:  sample name (9 chars)
    // pos 9:    ' '
    // pos 10-11:'a='
    // pos 12-16: azimuth (5 chars, right-justified)   ← slice(12,17)
    // pos 17-21: '   b='
    // pos 22-26: hade (5 chars)                       ← slice(22,27)
    // pos 27-31: '   s='
    // pos 32-36: beddingStrike (5 chars)              ← slice(32,37)
    // pos 37-41: '   d='
    // pos 42-46: beddingDip (5 chars)                 ← slice(42,47)
    // pos 47-51: '   v='
    // pos 52-58: volume (7 chars)                     ← slice(52,59)
    // pos 59+:   'm3'
    const sampleName = sample.padEnd(9, ' ');
    const coreAz    = coreAzimuth.toFixed(1).padStart(5, ' ');
    const coreHade  = (90 - coreDip).toFixed(1).padStart(5, ' ');
    const beddingStr = beddingStrike.toFixed(1).padStart(5, ' ');
    const beddingDp  = beddingDip.toFixed(1).padStart(5, ' ');

    // Volume must fit in exactly 7 chars as a valid number string
    // Use standard exponential with enough precision to stay ≤7 chars
    function formatVol(m3) {
      for (let prec = 2; prec >= 0; prec--) {
        const s = m3.toExponential(prec).toUpperCase();
        if (s.length <= 7) return s.padStart(7, ' ');
      }
      return m3.toExponential(0).toUpperCase().padStart(7, ' ');
    }
    const vol = formatVol(sampleVolumeM3);

    content += `${sampleName} a=${coreAz}   b=${coreHade}   s=${beddingStr}   d=${beddingDp}   v=${vol}m3\n`;

    // Column header line (unchanged)
    content += " PAL  Xc (Am2)  Yc (Am2)  Zc (Am2)  MAG(A/m)   Dg    Ig    Ds    Is   a95 \n";

    function formatExp(num) {
      return num.toExponential(2).toUpperCase().replace(/E([+-])(\d)$/, 'E$10$2');
    }

    // Data line field layout — must match importer slices EXACTLY:
    // [0:5]   step     (5 chars, left-justified)
    // [5:14]  x        (9 chars, right-justified)    ← slice(5,14)
    // [14]    ' '
    // [15:24] y        (9 chars, right-justified)
    // [24]    ' '      → y occupies [15:25] as read by importer ✓
    // [25:34] z        (9 chars, right-justified)    ← slice(25,34)
    // [34:36] '  '
    // [36:44] mag      (8 chars, right-justified)    ← slice(36,44)
    // [44:50] Dg       (6 chars)
    // [50:56] Ig       (6 chars)
    // [56:62] Ds       (6 chars)
    // [62:68] Is       (6 chars)
    // [68]    ' '
    // [69:73] a95      (4 chars)                     ← slice(69,73)

    steps.forEach(function(step) {
      const stepNum = (parseFloat(step.step) % 1 === 0
        ? parseInt(step.step).toString()
        : parseFloat(step.step).toString()
      ).padEnd(5, ' ');//file format only allows int, or else it won't fit when step is >1000
      const x   = formatExp(step.x * sampleVolumeM3 / 1E6).padStart(9, ' ');
      const y   = formatExp(step.y * sampleVolumeM3 / 1E6).padStart(9, ' ');
      const z   = formatExp(step.z * sampleVolumeM3 / 1E6).padStart(9, ' ');
      const m   = Math.sqrt(step.x * step.x + step.y * step.y + step.z * step.z);
      const mag = formatExp(m * sampleVolumeM3 / 1E6).padStart(8, ' ');
      const a95 = (step.error || 0).toFixed(1).padStart(4, ' ');

      // Placeholder direction fields (6 chars each)
      const dg = '   0.0';
      const ig = '   0.0';
      const ds = '   0.0';
      const is_ = '   0.0';

      content += `${stepNum}${x} ${y} ${z}  ${mag}${dg}${ig}${ds}${is_} ${a95}\n`;
    });

    content += "\n";
    return content;
  });
}

function convert_JR6() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let content = "";

  specimens.forEach(function(specimen) {
    const { sample, steps, coreAzimuth, coreDip, beddingStrike, beddingDip, volume } = specimen;

    function formatJR6Component(value) {
      return value.toFixed(2).replace(/\.?0+$/, '').padStart(6, ' ');
    }

    steps.forEach(function(step) {
      // Reverse Coordinates scaling
      const x = step.x / 1e6; // Step values in import used exp factor
      const y = step.y / 1e6;
      const z = step.z / 1e6;

      // Determine exponent (power of 10)
      let exp = 0;
      let maxComp = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      if (maxComp !== 0) {
        exp = Math.floor(Math.log10(maxComp));
      }
      const scale = Math.pow(10, exp);
      const X = formatJR6Component(x / scale);
      const Y = formatJR6Component(y / scale);
      const Z = formatJR6Component(z / scale);

      const stepStr = step.step.toString().padEnd(8, ' ');
      const sampleStr = sample.padEnd(10, ' ');
      const coreAzStr = coreAzimuth.toString().padStart(4, ' ');
      // When P2=0, importer does: coreDip = 90 - coreDip. So we export the inverse.
      const exportCoreDip = 90 - coreDip;
      const coreDipStr = exportCoreDip.toString().padStart(4, ' ');
      // When P4=0, importer does: beddingStrike = beddingStrike - 90. So we export the inverse.
      const exportBeddingStrike = (beddingStrike + 90) % 360;
      const beddingStrikeStr = exportBeddingStrike.toString().padStart(4, ' ');
      const beddingDipStr = beddingDip.toString().padStart(4, ' ');
      const a95Str = step.error ? step.error.toFixed(0).padStart(4, ' ') : '   0';
      
      // Supported AGICO parameter set
      const P1 = String(12).padStart(3, ' ');
      const P2 = String(0).padStart(3, ' ');
      const P3 = String(12).padStart(3, ' ');
      const P4 = String(0).padStart(3, ' ');

      // Fixed-width layout (must match importer slices):
      // 0-9: sampleStr (10), 10-17: stepStr (8), 18-23: X (6), 24-29: Y (6), 30-35: Z (6),
      // 36-39: exp (4), 40-43: coreAz (4), 44-47: coreDip (4), 48-51: beddingStrike (4),
      // 52-55: (4 spaces), 56-59: beddingDip (4), 60-63: (4 spaces), 64-66: P1, 67: space,
      // 68-70: P2, 71-73: P3, 74-76: P4, 77-80: a95
      content += `${sampleStr}${stepStr}${X}${Y}${Z}${exp.toString().padStart(4, ' ')}${coreAzStr}${coreDipStr}${beddingStrikeStr}    ${beddingDipStr}    ${P1} ${P2}${P3}${P4}${a95Str}\n`;
    });
  });

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  let exportName = specimens[0].originalFile || "converted_specimens.jr6";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_jr6.jr6";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convert_JR5() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".jra", "_converted_to_jr5", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    function formatJR5Component(value) {
      return value.toFixed(2).replace(/\.?0+$/, '').padStart(6, ' ');
    }

    steps.forEach(function(step) {
      const maxComp = Math.max(Math.abs(step.x), Math.abs(step.y), Math.abs(step.z), 1e-12);
      const exp = Math.floor(Math.log10(maxComp)) - 6;
      const factor = 1E6 * Math.pow(10, exp);

      const x = step.x / factor;
      const y = step.y / factor;
      const z = step.z / factor;

      // JR5 uses fixed-width columns:
      // 0-9: sample name
      // 10-17: step
      // 18-23: x
      // 24-29: y
      // 30-35: z
      // 36-39: exponent (power of 10)
      // 40-43: coreAzimuth
      // 44-47: coreDip
      // 48-51: beddingStrike
      // 56-59: beddingDip
      content +=
        sample.padEnd(10) +
        String(step.step).padEnd(8) +
        formatJR5Component(x) +
        formatJR5Component(y) +
        formatJR5Component(z) +
        String(exp).padStart(4) +
        String(coreAzimuth).padStart(4) +
        String(coreDip).padStart(4) +
        String(beddingStrike).padStart(4) +
        "    " + // blank space for 52-55
        String(beddingDip).padStart(4) +
        "\n";
    });

    return content;
  });
}

function convert_BLACKMOUNTAIN() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".xpca", "_converted_to_blackmountain", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    function formatBlackMountainStep(stepValue) {
      const n = Number(stepValue);
      return Number.isInteger(n) ? n.toFixed(0) : n.toString();
    }

    // Header line is required by the Black Mountain importer; it skips the first line.
    content += "Dmgstep X_raw Y_raw Z_raw D_raw I_raw M_raw X_sample Y_sample Z_sample D_sample I_sample M_sample X_formation Y_formation Z_formation D_formation I_formation M_formation Sample Dip Azimuth Formation Dip\n";

    // For Black Mountain, volume is not used; intensities are in A/m already
    steps.forEach(function(step) {
      const x = step.x / 1E6;
      const y = step.y / 1E6;
      const z = step.z / 1E6;
      const c = new Coordinates(step.x, step.y, step.z);
      const g = c.rotateTo(coreAzimuth, coreDip).toVector(Direction);
      const t = c.rotateTo(coreAzimuth, coreDip).correctBedding(beddingStrike, beddingDip).toVector(Direction);

      // Using placeholder values for unused columns (like geographic/tectonic vectors)
      // Column order roughly: step, X, Y, Z, ..., GDec, GInc, ..., TDec, TInc, ..., coreAz, coreDip, beddingStrike, beddingDip
      const placeholder = 0;

      const exportCoreDip = coreDip - 90;
      content += [
        formatBlackMountainStep(step.step),     // step number
        x, y, z,       // X, Y, Z components in A/m
        placeholder,   // column 4
        placeholder,   // column 5
        placeholder,   // column 6
        placeholder,   // column 7
        placeholder,   // column 8
        placeholder,   // column 9
        g.dec.toFixed(2), g.inc.toFixed(2),
        placeholder,   // column 12
        placeholder,   // column 13
        placeholder,   // column 14
        placeholder,   // column 15
        t.dec.toFixed(2), t.inc.toFixed(2),
        placeholder,   // column 18
        coreAzimuth,   // coreAzimuth
        exportCoreDip, // coreDip
        beddingStrike, // beddingStrike
        beddingDip     // beddingDip
      ].join(" ") + "\n";
    });
    return content;
  });
}

function convert_UNKNOWN() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dms", "_converted_to_unknown", function(specimen) {
    let content = "";
    const { sample, volume, beddingStrike, beddingDip, coreAzimuth, coreDip, steps } = specimen;

    // Placeholder header for UNKNOWN importer; it skips the first row.
    content += "Sample Step Header Placeholder\n";

    steps.forEach(function(step) {
      const x = step.x / 1E9; // convert back from Am^2 to original units
      const y = step.y / 1E9;
      const z = step.z / 1E9;

      // Step value
      const rawStepValue = Number(step.step);
      const stepValue = Number.isFinite(rawStepValue)
        ? (Number.isInteger(rawStepValue) ? rawStepValue.toFixed(0) : rawStepValue.toString())
        : step.step;

      // Unknown parser splits on whitespace, so emit numeric placeholders to preserve indexes.
      let line = new Array(45).fill("0");

      // Column assignments (based on importUnknown)
      line[0] = sample;                              // sample name
      line[1] = stepValue;                           // step in degmagnetization column
      line[5] = volume;                              // sample volume
      line[7] = coreAzimuth;                         // coreAzimuth
      line[8] = - (90 - coreDip);                // coreDip in original orientation
      line[9] = beddingStrike;                       // beddingStrike
      line[10] = beddingDip;                         // beddingDip
      line[21] = x.toExponential(15);               // X component
      line[22] = y.toExponential(15);               // Y component
      line[23] = z.toExponential(15);               // Z component

      content += line.join(" ") + "\n";
    });

    return content;
  });
}

function convert_PALEOMAG() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(
    specimens,
    ".pmag",
    "_converted_to_paleomag",
    function(specimen) {

      let content = "";

      const {
        sample,
        volume,
        beddingStrike,
        beddingDip,
        coreAzimuth,
        coreDip,
        level,
        steps
      } = specimen;

      const exportedLevel = (level == null ? 0 : level);

      // PaleoMag header line
      content += `${sample}\n`;

      // Reverse CIT convention
      const coreAz =
        ((Number(coreAzimuth) + 90) % 360).toFixed(0);

      const coreDp =
        (90 - Number(coreDip)).toFixed(0);

      content +=
        ` ${exportedLevel} ${coreAz} ${coreDp} ${beddingStrike} ${beddingDip} ${volume}\n`;

      // Measurement steps
      (steps || []).forEach(function(step) {

        const dir = stepToDirection(step);

        const stepNum =
          String(step.step || "0").padStart(4, " ");

        // Importer expects:
        // intensity -> cols 31-39
        // a95      -> cols 40-45
        // dec      -> cols 46-51
        // inc      -> cols 52-57

        const intensity =
          (dir.length / 1E9)
            .toExponential(2)
            .padStart(8, " ");

        const a95 =
          (step.error || 0)
            .toFixed(1)
            .padStart(5, " ");

        const dec =
          dir.dec
            .toFixed(1)
            .padStart(5, " ");

        const inc =
          dir.inc
            .toFixed(1)
            .padStart(5, " ");

        let line = "";

        // cols 0-1
        line += "  ";

        // cols 2-5
        line += stepNum;

        // pad until intensity column
        line = line.padEnd(31, " ");

        // cols 31-38
        line += intensity;

        // col 39
        line += " ";

        // cols 40-44
        line += a95;

        // col 45
        line += " ";

        // cols 46-50
        line += dec;

        // col 51
        line += " ";

        // cols 52-56
        line += inc;

        content += line + "\n";
      });

      return content;
    }
  );
}
function convert_MAGIC() {

  if(specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  const DELIM = ">>>>>>>>>>";

  let contributionLines = [
    "tab delimited\tcontribution",
    "version\ttimestamp\tcontributor\tdata_model_version",
    "1\t" +
    new Date().toISOString() +
    "\tAnonymous\t3.0"
  ];

  let sitesMap = {};
  let samplesMap = {};

  specimens.forEach(function(specimen) {

    let sampleName =
      specimen.sample || specimen.name;

    let siteName =
      specimen.site || "unknown_site";

    if(!sitesMap[siteName]) {

      sitesMap[siteName] = {

        lat:
          specimen.latitude != null
            ? specimen.latitude
            : "",

        lon:
          specimen.longitude != null
            ? (
                specimen.longitude < 0
                  ? specimen.longitude + 360
                  : specimen.longitude
              )
            : "",

        age:
          specimen.age != null
            ? specimen.age
            : "",

        age_low:
          specimen.ageMin != null
            ? specimen.ageMin
            : "",

        age_high:
          specimen.ageMax != null
            ? specimen.ageMax
            : "",

        age_sigma: ""

      };

    }

    if(!samplesMap[sampleName]) {

      samplesMap[sampleName] = {

        site: siteName,

        level:
          specimen.level || "",

        bed_dip_direction:
          specimen.beddingStrike != null
            ? specimen.beddingStrike + 90
            : "",

        bed_dip:
          specimen.beddingDip || "",

        azimuth:
          specimen.coreAzimuth || "",

        dip:
          specimen.coreDip || ""

      };

    }

  });

  let sitesLines = [
    "tab delimited\tsites",
    "site\tlat\tlon\tage\tage_low\tage_high\tage_sigma"
  ];

  Object.entries(sitesMap).forEach(function([siteName, s]) {

    sitesLines.push(
      `${siteName}\t${s.lat}\t${s.lon}\t${s.age}\t${s.age_low}\t${s.age_high}\t${s.age_sigma}`
    );

  });

  let samplesLines = [
    "tab delimited\tsamples",
    "sample\tsite\tlevel\tbed_dip_direction\tbed_dip\tazimuth\tdip"
  ];

  Object.entries(samplesMap).forEach(function([sampleName, s]) {

    samplesLines.push(
      `${sampleName}\t${s.site}\t${s.level}\t${s.bed_dip_direction}\t${s.bed_dip}\t${s.azimuth}\t${s.dip}`
    );

  });

  let specimensLines = [
    "tab delimited\tspecimens",
    "specimen\tsample\tvolume\tmeas_step_min\tmeas_step_max\tmeas_step_unit\tmethod_codes"
  ];

  let measurementsLines = [
    "tab delimited\tmeasurements",
    "measurement\tspecimen\ttreat_temp\ttreat_ac_field\tdir_dec\tdir_inc\tmagn_moment\tmethod_codes"
  ];

  let measurementCounter = 1;

  specimens.forEach(function(specimen) {

    let sampleName =
      specimen.sample || specimen.name;

    let methodCodes = [];

    if(specimen.demagnetizationType === "alternating") {
      methodCodes.push("LP-DIR-AF");
    } else {
      methodCodes.push("LP-DIR-T");
    }

    if(specimen.interpretations &&
       specimen.interpretations.length > 0) {

      let interp = specimen.interpretations[0];

      if(interp.type === "TAU3") {
        methodCodes.push("DE-BFP");
      } else {
        methodCodes.push("DE-BFL");
      }

      if(interp.anchored) {
        methodCodes.push("DE-BFL-A");
      }

    }

    methodCodes = methodCodes.join(":");

    let steps = specimen.steps;

    if(!steps || steps.length === 0) {
      return;
    }

    let stepValues =
      steps.map(s => parseFloat(s.step));

    let minStep = Math.min(...stepValues);
    let maxStep = Math.max(...stepValues);

    let stepUnit =
      specimen.demagnetizationType === "alternating"
        ? "T"
        : "K";

    let volumeM3 =
      (specimen.volume || 10) / 1E6;

    let minStepExport =
      specimen.demagnetizationType === "alternating"
        ? minStep / 1000
        : minStep + 273;

    let maxStepExport =
      specimen.demagnetizationType === "alternating"
        ? maxStep / 1000
        : maxStep + 273;

    specimensLines.push(
      `${specimen.name}\t${sampleName}\t${volumeM3}\t${minStepExport}\t${maxStepExport}\t${stepUnit}\t${methodCodes}`
    );

    steps.forEach(function(step) {

      let dir = stepToDirection(step);

      let treatTemp = "";
      let treatAF = "";

      if(specimen.demagnetizationType === "thermal") {

        treatTemp =
          parseFloat(step.step) + 273;

      } else {

        treatAF =
          parseFloat(step.step) / 1000;

      }

      let magnMoment;

      if(step.moment != null) {

        magnMoment = step.moment;

      } else {

        let intensity = dir.length;

        magnMoment =
          intensity *
          volumeM3 /
          1E5;

      }

      measurementsLines.push(
        `${measurementCounter++}\t${specimen.name}\t${treatTemp}\t${treatAF}\t${dir.dec}\t${dir.inc}\t${magnMoment}\t${methodCodes}`
      );

    });

  });

  let content = [

    contributionLines.join("\n"),

    DELIM,

    sitesLines.join("\n"),

    DELIM,

    samplesLines.join("\n"),

    DELIM,

    specimensLines.join("\n"),

    DELIM,

    measurementsLines.join("\n")

  ].join("\n");

  const blob = new Blob(
    [content],
    { type: "text/plain;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "converted_specimens.txt";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);

}

function convert_RENNES() {

  if (!Array.isArray(specimens) || specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".txt", "_converted_to_rennes", function(specimen, sIndex) {

    const sample = specimen.sample || specimen.name || `S${sIndex}`;
    const name = specimen.name || sample;
    const volume = specimen.volume || 0;
    const latitude = specimen.latitude || 0;
    const longitude = specimen.longitude || 0;

    const beddingStrike = Number(specimen.beddingStrike) || 0;
    const beddingDip = Number(specimen.beddingDip) || 0;
    const coreAzimuth = Number(specimen.coreAzimuth) || 0;
    const coreDip = Number(specimen.coreDip) || 0;

    const steps = Array.isArray(specimen.steps) ? specimen.steps : [];

    let content = "";

    // ---- Header ----
    content += "--------------  Parameters sample & data   ----------------\n\n";
    content += `Site     :  ${sample}\n`;
    content += `Sample   :  ${sample}\n`;
    content += `Specimen :  ${name}\n`;
    content += `Volume   : ${volume}     masse :   n.d\n`;
    content += `Lat :  ${latitude}     Long :    ${longitude}     Elevation :   0.0\n`;
    content += `Sampling date     :  0  0  0\n`;
    content += `Sampling time UTM :   0  0\n`;
    content += `azimuth mag : 0.0  IGRF  Declination :  0.0\n`;
    content += `azimuth sun : 0.0  Local Declination :  0.0\n`;

    // MUST be line index 9
    content += `Orientation :  "use AGICO code A12_0_3_9"\n`;

    // MUST be lines 10..13
    content += `core azimuth   :   ${coreAzimuth + 90}\n`;
    content += `core dip       :   ${90 - coreDip}\n`;
    content += `Strike bedding :   ${beddingStrike}\n`;
    content += `Dip bedding    :   ${beddingDip}\n`;

    // filler geology lines
    content += `Formation   :   ""\n`;
    content += `Age         :   ""\n`;
    content += `Lithology   :   ""\n`;
    content += `Locality    :   ""\n`;
    content += `Observation :   ""\n`;
    content += `dc applied magnetic field :  0.0  ∂T\n`;

    // ---- Table header ----
    content += "  Step code  Mag(Am2)      A/m    Am2/kg    Dsc   Isc     Dis   Iis     Dtc   Itc    q  Mag     K\n";

    // ---- Data ----
    steps.forEach(function(stepObj, idx) {

      const stepNum = stepObj.step !== undefined ? stepObj.step : (idx + 1);

      const v = new Coordinates(stepObj.x, stepObj.y, stepObj.z).toVector(Direction);

	  const dec = v.dec;
	  const inc = v.inc;
	  const intensity = v.length / 1E5;


      content += ` ${stepNum} D  0  ${intensity}   --   ${dec}   ${inc}   0   0   0   0   0  C1   0\n`;
    });

    const baseName = (specimen.name || specimen.sample || `specimen_${sIndex + 1}`);
	const safeBase = baseName.replace(/[^a-z0-9_\-]/gi, "_");
	const exportNameBase = safeBase + "_" + (sIndex + 1);


    return content;
  });
}

function convert_MONTPELLIER() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let content = " Sample Step Intensity Dec Inc Azimuth Plunge Strike Dip\n";

  specimens.forEach(function(specimen) {
    const { sample, coreAzimuth, coreDip, beddingStrike, beddingDip, steps } = specimen;

    steps.forEach(function(step) {
      // Convert Cartesian back to direction + intensity
      const dir = stepToDirection(step);
      const intensity = dir.length / 1e6;  // Montpellier stores scaled down

      content += `${sample} ${step.step} ${intensity} ${dir.dec} ${dir.inc} ${coreAzimuth} ${coreDip} ${beddingStrike} ${beddingDip}\n`;
    });
  });

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted_specimens.montpellier";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function convert_GTK() {
  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  downloadPerSpecimenText(specimens, ".dat", "_converted_to_gtk", function(specimen) {
    let content = "";
    const { sample, lithology, latitude, longitude, coreAzimuth, coreDip,
            beddingStrike, beddingDip, volume, steps } = specimen;

    // === HEADER (must match original GTK format exactly) ===
    // Line 0: instrument/date line
    content += "SQUID      \n";
    // Line 1: Name
    content += `Name      :${sample}\n`;
    // Line 2: Rocktype
    content += `Rocktype  :${lithology || "Unknown"}\n`;
    // Line 3: Site
    content += "Site      :\n";
    // Line 4: Sampletype
    content += "Sampletype:\n";
    // Line 5: Comment
    content += "Comment   :\n";
    // Line 6: Column headers for metadata
    content += "    Lat     Lon     Str     Dip     Bstr    Bdip   Vol     Mass\n";

    // Line 7: Metadata values — reverse the importer transforms:
    //   importer: coreAzimuth = (270 + gtkStr) % 360  => gtkStr = (coreAzimuth - 270 + 360) % 360
    //   importer: coreDip = 90 - gtkDip               => gtkDip = 90 - coreDip
    // Line 7: Metadata values — guard against null
    let lat = latitude ?? 0;
    let lon = longitude ?? 0;
    let strike = beddingStrike ?? 0;
    let dip = beddingDip ?? 0;
    let vol = volume ?? 0;
    let gtkStr = ((coreAzimuth ?? 0) - 270 + 360) % 360;
    let gtkDip = 90 - (coreDip ?? 0);
    let mass = 0;

    content += `${lat.toFixed(2).padStart(7)} ${lon.toFixed(2).padStart(7)} ` +
              `${gtkStr.toFixed(2).padStart(7)} ${gtkDip.toFixed(2).padStart(7)} ` +
              `${strike.toFixed(2).padStart(7)} ${dip.toFixed(2).padStart(7)} ` +
              `${vol.toFixed(3).padStart(6)} ${mass.toFixed(3).padStart(6)}\n`;

    // Line 8: Demagnetization column headers
    let demag = specimen.demagnetizationType === "alternating" ? "AF" : "TH";
    content += `${demag}      Dec    Inc       Int       Sus    T63       Xkomp      Ykomp      Zkomp\n`;

    // === DATA LINES ===
    // Column positions the importer reads (JS slice, same as Python):
    //   step:      [0:4]
    //   dec:       [6:12]
    //   inc:       [13:19]
    //   intensity: [24:30]  (in nA/m, importer multiplies by 1E3 but doesn't use it)
    //   Xkomp:     [50:57]  -> importer: y = 1E3 * Xkomp
    //   Ykomp:     [61:68]  -> importer: x = -1E3 * Ykomp
    //   Zkomp:     [72:79]  -> importer: z = 1E3 * Zkomp
    //
    // Reversal:
    //   Xkomp = y / 1E3
    //   Ykomp = -x / 1E3
    //   Zkomp = z / 1E3

    steps.forEach(step => {
      let specimenCoords = stepToCoordinates(step);

      // Use the canonical COL direction directly
      let geographicDir = stepToDirection(step);

      // GTK specimen-frame components
      let xkomp = specimenCoords.y / 1E3;
      let ykomp = -specimenCoords.x / 1E3;
      let zkomp = specimenCoords.z / 1E3;

      let intensity = specimenCoords.length / 1E3;


      // Placeholder values for Sus and T63 (not stored in specimen)
      let sus = 0;
      let t63 = 0;

      // Fixed-width line matching the importer's slice positions exactly:
      // [0:4]   step, right-justified
      // [4:6]   "  " (2 spaces)
      // [6:12]  dec (6 chars)
      // [12:13] " " (1 space)
      // [13:19] inc (6 chars)
      // [19:24] "     " (5 spaces)
      // [24:30] intensity (6 chars)
      // [30:39] sus (9 chars)
      // [39:46] t63 (7 chars)
      // [46:50] "    " (4 spaces)
      // [50:57] Xkomp (7 chars)
      // [57:61] "    " (4 spaces)
      // [61:68] Ykomp (7 chars)
      // [68:72] "    " (4 spaces)
      // [72:79] Zkomp (7 chars)

      // helper function to format GTK components with 4 decimal places, max 7 chars, right-justified because gtk works with such small values, rounding errors occur very quickly
      function gtkFormat(value) {
        return value.toFixed(4).slice(0, 7).padStart(7);
}

      let line =
        step.step.toString().padStart(4) +              // [0:4]  step
        "  " +                                           // [4:6]
        geographicDir.dec.toFixed(2).padStart(6) +                // [6:12] dec
        " " +                                            // [12]
        geographicDir.inc.toFixed(2).padStart(6) +                // [13:19] inc
        "     " +                                        // [19:24]
        intensity.toFixed(3).padStart(6) +              // [24:30] intensity
        sus.toFixed(0).padStart(9) +                    // [30:39] sus
        t63.toFixed(2).padStart(7) +                    // [39:46] t63
        "    " +                                         // [46:50]
        gtkFormat(xkomp) +                  // [50:57] Xkomp
        "    " +                                         // [57:61]
        gtkFormat(ykomp) +                  // [61:68] Ykomp
        "    " +                                         // [68:72]
        gtkFormat(zkomp);                   // [72:79] Zkomp

      content += line + "\n";
    });

    return content;
  });
}

function convert_UNESP() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let content = "";

  // First line: demagnetization type
  // (Assume all specimens share same type — otherwise pick first)
  const demagType = specimens[0].demagnetizationType === "alternating" ? "AF Z" : "TH";
  content += "Specimen\t" + demagType + "\n";

  specimens.forEach(function(specimen) {
    const { sample, volume, coreAzimuth, coreDip, beddingStrike, beddingDip, steps } = specimen;

    steps.forEach(function(step) {
      // importUNESP scales by 1E6*1E3 = 1E9 and then multiplies file values by that.
      const x = step.x / 1e9;
      const y = step.y / 1e9;
      const z = step.z / 1e9;

      // Declination & inclination (calculate from coords)
      const dir = new Coordinates(x, y, z).toVector(Direction);

      // Geographic direction: rotate cartesian to geographic coords
      const gDir = new Coordinates(x, y, z).rotateTo(coreAzimuth, coreDip).toVector(Direction);

      // Build tab-separated line
      let line = [
        sample,               // [0] sample name
        step.step,            // [1] step
        x, y, z,              // [2-4] cartesian components
        coreAzimuth,          // [5]
        coreDip,              // [6]
        beddingStrike,        // [7]
        beddingDip,           // [8]
        dir.dec,              // [9]
        dir.inc,              // [10]
        "0", "0", "0", "0", "0", "0", "0", "0",  // fill unused [11-18]
        gDir.dec,             // [19]
        gDir.inc,             // [20]
        "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", // [21-32]
        volume                // [33]
      ];

      content += line.join("\t") + "\n";
    });
  });

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  let exportName = specimens[0].originalFile || "converted_specimens.txt";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_USPMag.txt";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convert_SPINNER() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let content = "";

  specimens.forEach(function(specimen) {
    const { sample, steps } = specimen;

    // Specimen header (just the sample name on its own line)
    content += `${sample}\n`;

    steps.forEach(function(step) {
      // Reverse scaling back to original format
      const x = step.x / 1e6;
      const y = step.y / 1e6;
      const z = step.z / 1e6;

      // Rebuild line. Original import read from parameters[2..5],
      // so we’ll put two leading commas before step.
      content += `,,${step.step},${x},${y},${z}\n`;
    });
  });

  // Create and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "converted_specimens.spinner";
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convert_CRYOTHING() {
  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  let sitContent = "";
  let meaContent = "";

  specimens.forEach(function(specimen, i) {
    const {
      sample, volume, coreAzimuth, coreDip,
      beddingStrike, beddingDip, level, steps
    } = specimen;

    const index     = i + 1;
    const hade      = 90 - coreDip;
    const bedTrend  = beddingStrike + 90;  // reverse of import: strike+90 = down-dip trend
    const bedPlunge = beddingDip;
    const lvl       = (level !== null && level !== undefined) ? level : 0.0;

    // .sit line
    sitContent += `${sample.padEnd(20)} ${String(index).padEnd(3)} ` +
      `${coreAzimuth.toFixed(1).padStart(6)}  ${hade.toFixed(1).padStart(4)}  ` +
      `${bedTrend.toFixed(1).padStart(5)}  ${bedPlunge.toFixed(1).padStart(4)}  ` +
      `${volume.toFixed(1).padStart(4)}  0.0  ${lvl.toFixed(2).padStart(4)}  ` +
      `0   0.0000E+00 None                   0 \r\n`;

    // .mea lines — invert the coordinate mapping from importCryoThing:
    //   internal: x = -y_cryo, y = z_cryo, z = -x_cryo
    //   inverse:  x_cryo = -z_int, y_cryo = -x_int, z_cryo = y_int
    const volumeM3 = volume * 1e-6;
    const unit = specimen.demagnetizationType === "thermal" ? "C " : "mT";

    steps.forEach(function(step) {
      const xCryo = -step.z / (1e6 / volumeM3);
      const yCryo = -step.x / (1e6 / volumeM3);
      const zCryo =  step.y / (1e6 / volumeM3);

      const isNRM = (step.step === "0" || step.step === 0);
      const stepLabel = isNRM ? "NRM  " : String(step.step).padEnd(5);
      // Always write the unit token, even for NRM — keeps column positions consistent
      const stepUnit  = unit;

      meaContent += `${String(index).padEnd(3)} ${stepLabel} ${stepUnit} ` +
        `${xCryo.toExponential(3).padStart(13)} ` +
        `${yCryo.toExponential(3).padStart(13)} ` +
        `${zCryo.toExponential(3).padStart(13)} ` +
        `+0.000E+00 +0.000E+00 +0.000E+00 ` +
        `8     exported  ` +
        `${new Date().toLocaleDateString("en-GB", {day:"2-digit", month:"2-digit", year:"2-digit"}).replace(/\//g, "-")} ` +
        `00:00    0\r\n`;
    });
  });

  const baseName = (specimens[0].originalFile || "exported_specimens")
    .replace(/\.[^/.]+$/, "")
    .replace(/_converted_to_\w+$/, "");

  // Download .sit
  const sitBlob = new Blob([sitContent], { type: "text/plain;charset=utf-8" });
  const sitUrl  = URL.createObjectURL(sitBlob);
  const sitA    = document.createElement("a");
  sitA.href     = sitUrl;
  sitA.download = baseName + "_converted_to_cryothing.sit";
  document.body.appendChild(sitA);
  sitA.click();
  document.body.removeChild(sitA);
  URL.revokeObjectURL(sitUrl);

  // Download .mea (slight delay so both downloads trigger)
  setTimeout(function() {
    const meaBlob = new Blob([meaContent], { type: "text/plain;charset=utf-8" });
    const meaUrl  = URL.createObjectURL(meaBlob);
    const meaA    = document.createElement("a");
    meaA.href     = meaUrl;
    meaA.download = baseName + "_converted_to_cryothing.mea";
    document.body.appendChild(meaA);
    meaA.click();
    document.body.removeChild(meaA);
    URL.revokeObjectURL(meaUrl);
  }, 100);
}

function convert_APPLICATIONSAVEOLD() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  const exportArray = specimens.map(function(specimen) {
    // Convert steps back to old format
    const data = specimen.steps.map(function(step) {
      return {
        step: step.step,
        x: step.x,
        y: step.y,
        z: step.z,
        a95: step.error || 0
      };
    });

    // Convert interpretations
    const GEO = specimen.interpretations.map(function(interp) {
      let type;
      if (interp.type === "TAU1") {
        type = "dir";
      } else if (interp.type === "TAU3") {
        type = "gc";
      } else {
        type = interp.type.toLowerCase();
      }

      return {
        steps: interp.steps.map(s => s.step),
        type: type,
        forced: interp.anchored || false
      };
    });

    return {
      patch: 1.1,
      name: specimen.sample,
      volume: specimen.volume,
      bedStrike: specimen.beddingStrike,
      bedDip: specimen.beddingDip,
      coreAzi: specimen.coreAzimuth,
      coreDip: specimen.coreDip,
      declinationCorrection: 0, // can’t reconstruct reliably
      data: data,
      GEO: GEO,
      exported: specimen.created
    };
  });

  // Stringify nicely
  const content = JSON.stringify(exportArray, null, 2);

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  let exportName = specimens[0].originalFile || "converted_specimens.json";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_PMAGORG.pmag";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function convert_APPLICATIONSAVE() {

  if (specimens.length === 0) {
    alert("No specimens to export.");
    return;
  }

  // JSON string we'll hash
  const specimensJson = JSON.stringify(specimens);
  // compute hash (sha256Hex returns a Promise)
  const hash = await sha256Hex(specimensJson);
  const version = __VERSION__;
  const created = new Date().toISOString();

  // Construct save object
  const saveObject = {
    hash: hash,
    specimens: specimens,
	version,
	created
  };

  // Serialize to JSON (pretty-printed)
  const content = JSON.stringify(saveObject, null, 2);

  // Create a blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  let exportName = specimens[0].originalFile || "converted_specimens.json";
  a.download = exportName.replace(/\.[^/.]+$/, "") + "_converted_to_col.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

