# MavensMate Server

**GitHub Project**: https://github.com/joeferraro/MavensMate

## Installation

`npm install mavensmate`

## Running the Server

`npm start`

This will start the local server at `http://localhost:56248/`. Please note that the port number `56428` is important because it is the port number referenced in the callback URL in the MavensMate Connected App configuration. If you'd like to set up a separate Connected App, you can configure MavensMate to run on a different port by running: `bin/server --port=<your-port-number>`.

## Running Tests

To run unit, integration, and command line interface tests for MavensMate server, `cd` to the `mavensmate` directory and run `npm test`.