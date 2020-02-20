var Table = function(options) {

  /* Class Table
   * Returns table with content including
   * search & pagination functionality
   */

  // Some configuration
  this.MINIMUM_ITEMS_PER_PAGE = 5;
  this.MAXIMUM_NUMBER_PAGES = 10;

  this.header = options.header;
  this.body = options.body;
  this.search = options.search && this.body.length !== 0;

  // Generate the HTML for this table
  var content = new Array();

  // Add search box element
  if(this.search) {
    content = content.concat([ 
      "<div class='input-group'>",
      "  <span class='input-group-prepend'>",
      "    <div class='input-group-text'>",
      "      <span class='fa fa-search' style='float: left;'></span>",
      "    </div>",
      "  </span>",
      "  <input placeholder='Search Publications' class='form-control' id='" + options.id + "-search" + "'/>",
      "</div>",
    ])
  }

  content.push("<div id='" + options.id + "-content" + "'></div>")

  document.getElementById(options.id).innerHTML = content.join("\n");

  // Get the search & content elements for this table
  if(this.search) {
    this.search = document.getElementById(options.id + "-search");
    this.search.addEventListener("input", this.draw.bind(this));
  }

  this.id = document.getElementById(options.id + "-content");

  // Dynamically set the number of items per page
  this.itemsPerPage = Math.max(
    this.MINIMUM_ITEMS_PER_PAGE,
    Math.ceil(this.body.length / this.MAXIMUM_NUMBER_PAGES)
  );

  // Keep track of the active page through pagination
  this.activeIndex = 0;

  // Draw the initial table
  this.draw();

}

Table.prototype.draw = function() {

  /* Function Table.draw
   * Redraws the table by creating the HTML
   */

  var filteredRows = this.body;

  if(this.search) {

    var searchTerm = this.search.value;
    var regex = new RegExp("^.*" + searchTerm + ".*$", "i");
    var filteredRows = this.body.filter(function(x) {
      for(var i = 0; i < x.length; i++) {
        if(String(x[i]).match(regex)) {
          return true;
        }
      }
    });

  }

  var pagination = this.generatePagination(filteredRows);

  this.id.innerHTML = [
    "<table class='table table-sm table-striped'>",
    this.generateTableHead(this.header),
    this.generateTableBody(filteredRows),
    "</table>",
    pagination
  ].join("\n");

  // Add listeners to all the page buttons
  Array.from(this.id.getElementsByClassName("page-item")).forEach(function(x) {
    x.addEventListener("click", this.setActiveIndex.bind(this, x));
  }.bind(this));

  // Enable tooltips
  $('[data-toggle="tooltip"]').tooltip()

}

Table.prototype.generatePaginationList = function(list) {

  /* Function Table.generatePaginationList
   * Generates all pagination buttons
   */

  // No results (1 page)
  if(list.length === 0) {
    return this.paginationItem(0)
  }

  if(this.activeIndex * this.itemsPerPage > list.length) {
    this.activeIndex = Math.floor(list.length / this.itemsPerPage);
  }

  // Create the number of pages
  return list.filter(function(_, i) {
    return (i % this.itemsPerPage) === 0
  }.bind(this)).map(function(_, i) {
    return this.paginationItem(i);
  }.bind(this)).join("\n");

}

Table.prototype.paginationItem = function(index) {

  /* Function Table.paginationItem
   * Returns HTML representation of a pagination button
   */

  return "<li class='page-item " + (index === this.activeIndex ? "active" : "") + "'><span class='page-link'>" + (index + 1) + "</span></li>";

}

Table.prototype.getMaxIndex = function() {

  if(this.body.length === this.itemsPerPage) {
    return 0;
  } else {
    return Math.floor(this.body.length / this.itemsPerPage);
  }

}

Table.prototype.setActiveIndex = function(context) {

  /* Function Table.setActiveIndex
   * Updates the table on click
   */

  var children = context.children[0];

  var maxIndex = this.getMaxIndex();

  switch(children.innerHTML) {
    case "Next":
      if(this.activeIndex === maxIndex) return;
      this.activeIndex++;
      break;
    case "Previous":
      if(this.activeIndex === 0) return;
      this.activeIndex--;
      break;
    default:
      this.activeIndex = Number(children.innerHTML) - 1;
      break;
  }

  // Clamp the active index between 0 and max pages
  this.activeIndex = Math.max(Math.min(maxIndex, this.activeIndex), 0);

  // Redraw
  this.draw();

}

Table.prototype.generatePagination = function(list) {

  /* function generatePagination
   * Generates the pagination for the active table
   */

  if(list.length < this.MINIMUM_ITEMS_PER_PAGE) {
    return "";
  }

  if(this.activeIndex * this.itemsPerPage > list.length) {
    this.activeIndex = Math.floor(list.length / this.itemsPerPage);
  }

  var endDisabled = this.getMaxIndex() === this.activeIndex;
  var startDisabled = this.activeIndex === 0;

  return [
   "<nav aria-label='Page navigation example'>",
     "<ul class='pagination' style='cursor: pointer'>",
       "<li class='page-item " + (startDisabled ? "disabled" : "") + "'><span class='page-link'>Previous</span></li>",
       this.generatePaginationList(list),
       "<li class='page-item " + (endDisabled ? "disabled" : "") + "'><span class='page-link'>Next</span></li>",
     "</ul>",
   "</nav>"
  ].join("\n");

}

Table.prototype.generateTableHead = function(header) {

  /* Function generateTableHead
   * Generates the head row of the table
   */

  return [
    "  <thead>",
    "    <tr>",
    this.generateTableHeadContent(header),
    "    </tr>",
    "  </thead>"
  ].join("\n");

}

Table.prototype.generateTableBodyContent = function(body) {

  /* Function generateTableBodyContent
   * Generates the body of the table
   */

  const startSlice = this.itemsPerPage * this.activeIndex;
  const endSlice = startSlice + this.itemsPerPage;

  // Slice the data from memory to what is visible & unfiltered
  return body.slice(startSlice, endSlice).map(function(x) {
    return "<tr>" + this.generateTableRowContent(x) + "</tr>"
  }.bind(this)).join("\n");

}

Table.prototype.generateTableHeadContent = function(header) {

  /* Function generateTableHeadContent 
   * Generates the actual content of the table header
   */

  function addTagTH(x) {
  
    /* Function addTagTH
     * Generates a TH HTML element
     */
  
    return addTag("th", x);
  
  }

  return header.map(addTagTH).join("\n");

}


Table.prototype.generateTableBody = function(body) {

  /* Function generateTableBody
   * Generates the actual content of the table body
   */

  return [
    "  <tbody>",
    this.generateTableBodyContent(body),
    "  </tbody>"
  ].join("\n");

}

function addTag(tag, x) {

  /* Function addTag
   * Generate a HTML element
   */

  return "<" + tag + ">" + x + "</" + tag + ">";

}

Table.prototype.generateTableRowContent = function(row) {

  /* function generateTableRowContent
   * Generates single row content for a table
   */

  function addTagTD(x) {
  
    /* Function addTagTD
     * Generates a TD HTML element 
     */
  
    return addTag("td", x);
  
  }

  return row.map(addTagTD).join("\n");

}