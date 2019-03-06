/*
 *
 * Script to create a list of publications
 * Author: Mathijs Koymans
 *
 */

const fs = require("fs");

const BASE = "../resources/publications/";

function createEntry(filename) {

  /*
   * Function createEntry
   * Creates a single entry with a reference to the real file
   */

  var publication = read(filename);
  
  // Delete collection information we will reference this instead through the PID
  delete publication.collections;

  // Well return then!
  return publication;

}

function read(filename) {

  /*
   * Function read
   * Reads a JSON file to memory
   */

  const { join } = require("path");

  return JSON.parse(fs.readFileSync(join(BASE, filename)).toString());

}

if(require.main === module) {

  // Read all publication entries and add them to a single summary file
  fs.writeFileSync("publications.json", JSON.stringify(fs.readdirSync(BASE).map(createEntry), null, 4));

}