# Paleomagnetism.org 2.0.0 - Data Library Tools

## createPublication.js

Creates a publication entry using the CMD line. Pass it the name of a directory containing .dir files using the --bundle flag. Other metadata can be added with --name, --author, --description, --institution, --doi flags. Afterwards manually include all created .pid files to the publications directory and run the next script.

## createPublicationJSON.js

Loops over all publications in the resources directory and creates a summary document that is loaded initially.
