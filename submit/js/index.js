if(window.location.search) {
  notify("success", "Your publication was succesfully received and was assigned identifier: <b><a href='" +  window.location.search.slice(1)  + "'>" + window.location.search.slice(1) + "</a></b>. <p> It will be reviewed and added to the data library soon.");
}
