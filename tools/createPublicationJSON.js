const fs = require("fs");
const { join } = require("path");

const BASE = "../resources/publications/";

function createEntry(filename) {

  var publication = read(filename);

  console.log(publication);
  return {
    "author": publication.author,
    "created": publication.created,
    "institution": publication.institution,
    "description": publication.description,
    "collections": publication.collections.length,
    "specimens": publication.specimens,
    "pid": publication.pid,
    "location": publication.location,
    "convexHull": publication.convexHull
  }

}

function read(filename) {

  return JSON.parse(fs.readFileSync(join(BASE, filename)).toString());

}

var json = fs.readdirSync(BASE).map(createEntry);

fs.writeFileSync("publications.json", JSON.stringify(json, null, 4));
