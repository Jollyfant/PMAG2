/*
 *
 * Script to create a publication from a bundle of collections
 * Author: Mathijs Koymans
 *
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUNDLE_DIRECTORY = "bundle";
const DONE_DIRECTORY = "done";

function isDir(name) {

  /*
   * Function isDir
   * Returns true when the extension of a file is .dir
   */

  return path.extname(name) === ".dir";

}

function getName(name) {

  /*
   * Function getName
   * Returns the name of a file without the extension
   */

  return path.basename(name, ".dir");

}

function createCollection(filename) {

  /*
   * Function createCollection
   * Reads a single collection from the bundle and parses it
   */

  var filepath = path.join(BUNDLE_DIRECTORY, filename);

  // Read the content of the file
  var content = read(filepath);

  // Give a random location for now
  return {
    "data": content,
    "name": getName(filename)
  }

}

function read(filename) {

  /*
   * Function read
   * Synchronously reads a file contents from disk
   */

  return JSON.parse(fs.readFileSync(filename).toString());

}

function generatePID(object) {

  /*
   * Function generatePID
   * Generates a PID based on the serialized object contents
   */

  return crypto.createHash("sha256").update(JSON.stringify(object)).digest("hex");

}

function convexHull(points) {

  /*
   * Function convexHull
   * Returns the convex hull of a set of Leaflet markers
   * https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain#JavaScript
   */

  function cross(a, b, o) {

    /*
     * Function convexHull:cross
     * Cross product
     */

    return (a.lat - o.lat) * (b.lng - o.lng) - (a.lng - o.lng) * (b.lat - o.lat)

  }

  // Sort by latitude, longitude
  points.sort(function(a, b) {
    return a.lat - b.lat || a.lng - b.lng;
  });

  // Calculate the lower bounds
  var lower = new Array();
  for(var i = 0; i < points.length; i++) {
    while(lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
       lower.pop();
    }
    lower.push(points[i]);
  }

  // Calculate the upper bounds
  var upper = new Array();
  for(var i = points.length - 1; i >= 0; i--) {
    while(upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
       upper.pop();
    }
    upper.push(points[i]);
  }

  upper.pop();
  lower.pop();

  return lower.concat(upper);

}

function locations(collections) {

  var locationsA = new Array();
  for(var i = 0; i < collections.length; i++) {
    for(var j = 0; j < collections[i].data.specimens.length; j++) {
      locationsA.push(collections[i].data.specimens[j].location);
    }
  }

  return locationsA;

}

function sumSpecimens(collections) {

  var sum = 0;
  for(var i = 0; i < collections.length; i++) {
    sum += collections[i].data.specimens.length;
  }

  return sum;

}

function averageGeolocation(coords) {

  if(coords.length === 1) {
    return coords[0];
  }

  let x = 0.0;
  let y = 0.0;
  let z = 0.0;

  for (let coord of coords) {
    let latitude = coord.lat * Math.PI / 180;
    let longitude = coord.lng * Math.PI / 180;

    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  }

  let total = coords.length;

  x = x / total;
  y = y / total;
  z = z / total;

  let centralLongitude = Math.atan2(y, x);
  let centralSquareRoot = Math.sqrt(x * x + y * y);
  let centralLatitude = Math.atan2(z, centralSquareRoot);

  return {
    lat: centralLatitude * 180 / Math.PI,
    lng: centralLongitude * 180 / Math.PI
  };

}


if(require.main === module) {

  // Read collections from the bundle directory
  const collections = fs.readdirSync(BUNDLE_DIRECTORY).filter(isDir);
  
  const metadata = {
    "author": "Mathijs Koymans",
    "institution": "KNMI",
    "description": "Some description",
    "collections": collections.map(createCollection)
  }
  
  // Assign a persitent identifier!
  metadata.pid = generatePID(metadata);
  metadata.created = new Date().toISOString();
  metadata.specimens = sumSpecimens(metadata.collections);
  metadata.location = averageGeolocation(locations(metadata.collections)),
  metadata.convexHull = convexHull(locations(metadata.collections)),

  fs.writeFileSync(metadata.pid + ".pid", JSON.stringify(metadata));

  console.log("Done writing to " + metadata.pid + ".pid! Remember to include the publication.");

}
