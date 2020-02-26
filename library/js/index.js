var map;

function loadDigitalObjects() {

  /*
   * Function loadDigitalObjects
   * Loads all digital objects from disk
   */

  // Load the information from a JSON
  HTTPRequest("https://api.paleomagnetism.org/", "GET", function(publications) {

    // Problem getting the publications
    if(publications === null) {
      return notify("danger", "Could not load the list of publications.");
    }

    var nPublications = publications.length;
    var nCollections = publications.map(x => x.nCollections).reduce((a, b) => a + b, 0);
    var nSpecimens = publications.map(x => x.nSpecimens).reduce((a, b) => a + b, 0);

    document.getElementById("counter").innerHTML = "<b>" + nPublications + "</b> publications containing <b>" + nCollections + "</b> collections and <b>" + nSpecimens + "</b> specimens"; 

    // Update the map and table with the returned collections
    addCollectionsToMap(publications);
    addCollectionsToTable(publications);

  });

}

function addCollectionsToTable(publications) {

  /*
   * Function addCollectionsToTable
   * Adds the returned publications to a table
   */

  var TABLE_HEADER = new Array("Name", "Author", "Institution", "Description", "Country", "Age", "Created", "DOI");

  var rows = publications.map(function(x) {

    if(x.doiInfo) {
      var author = x.doiInfo.entryTags.author.split(" and ")[0] + " et al., (" + mapJournal(x.doiInfo.entryTags.journal) + ", " +  x.doiInfo.entryTags.year + ")";
    } else {
      var author = x.author;
    }

    return new Array(
      "<a href='../publication/index.html?" + x.pid + "'>"  + x.name + "</a>",
      author,
      x.institution,
      x.description, 
      x.country || "Unconstrained",
      x.age,
      //"<code><a href='../publication/index.html?" + x.pid + "'>" + x.pid.slice(0, 8) + "</a></code>", 
      new Date(x.created).toISOString().slice(0, 10),
      "<a href='https://doi.org/" + x.doi + "'><span class='badge badge-primary'>" + "DOI" + "</span></a>" || "N/A"
    );
  });

  new Table({
      "id": "publication-table",
      "search": true,
      "header": TABLE_HEADER,
      "body": rows
  });

}

function addMap() {

  /*
   * Function addMap
   * Adds map to the application
   */

  const MAP_CONTAINER = "map";
  const TILE_LAYER = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const VIEWPORT = new L.latLng(35, 0);

  // Set map options (bounds)
  var mapOptions = {
    "minZoom": 1,
    "attributionControl": true
  }

  // Create the map and tile layer
  map = L.map(MAP_CONTAINER, mapOptions).setView(VIEWPORT, 1);
  L.tileLayer(TILE_LAYER).addTo(map);

}

function addCollectionsToMap(publications) {

  /*
   * Function addCollectionsToMap
   * Adds collections from the library to the map
   */

  function addPublication(publication, index) {

    /*
     * Function addCollectionsToMap::addPublication
     * Adds a single publication marker to the map
     */

    function createTooltip(publication) {
  
      /*
       * Function addCollectionsToMap::addPublication::createTooltip
       * Creates a tooltip for the marker
       */
  
      return new Array(
        "<b>" + publication.name + "</b>",
        "<i>" + publication.description + "</i>",
        "",
        "Publication contains " + publication.nSpecimens + " specimens from " + publication.nCollections + " collections.",
        "",
        "<b>Author</b>: " + publication.author,
        "<b>Published</b>: " + publication.created,
        "",
        "<a href='../publication/index.html?" + publication.pid +"'><b>View Publication</b></a>"
      ).join("<br>");

    }

    // Add the publication index so we can track it
    const marker = new L.Marker(L.latLng(publication.location), {"index": index});

    // Show and hide the publication convex hull
    marker.on("mouseover", showConvexHull);
    marker.on("mouseout", hideConvexHull)
    marker.bindPopup(createTooltip(publication));
    marker.addTo(map);

  }

  function hideConvexHull() {

    /*
     * Function addCollectionsToMap::hideConvexHull
     * Hides the convex hull of a publication
     */

    map.removeLayer(convexHullRef);

  }

  function showConvexHull() {

    /*
     * Function addCollectionsToMap::hideConvexHull
     * Hides the convex hull of a publication
     */

    // Save reference
    convexHullRef = new L.polygon(publications[this.options.index].convexHull.map(x => new L.LatLng(x.lat, x.lng)), {"color": HIGHCHARTS_BLUE}).addTo(map);

  }

  // Save references to the open hull
  let convexHullRef;

  // Add all the publications
  publications.forEach(addPublication);

}

function quickPID() {

  /*
   * Function quickPID
   * Quickly looks up a Paleomagnetism.org 2 persistent identifier
   */

  let PIDValue = document.getElementById("pid-lookup").value;

  // Extract the publication, coordinate, and specimen identifier
  var [publication, collection, specimen] = PIDValue.split(".");

  // Confirm identifier before resolution and resolve to correct page
  if(publication !== "" && publication.length === 64) {
    if(collection !== undefined) {
      if(specimen !== undefined) {
        return window.location = "../specimen/index.html?" + PIDValue;
      }
      return window.location = "../collection/index.html?" + PIDValue;
    }
    return window.location = "../publication/index.html?" + PIDValue;
  }

  // Not a correct PID?
  return notify("danger", "The submitted identifier is not valid and could not be resolved.");

}

function mapJournal(journal) {

  switch(journal) {
    case "Geochemistry, Geophysics, Geosystems":
      return "G-Cubed";
    case "Earth and Planetary Science Letters":
      return "EPSL";
    case "Geophysical Journal International":
      return "Geophys. J. Int.";
    case "Journal of Geophysical Research: Solid Earth":
      return "JGR: Solid Earth";
  }

  return journal;

}

function __init__() {

  // Add Leaflet
  addMap();

  // Load all publications from JSON
  loadDigitalObjects();

  // Listener for search
  document.getElementById("pid-lookup-button").addEventListener("click", quickPID);

}

__init__();
