/* 
 * @file global MavensMate process
 * @author Joe Ferraro <@joeferraro>
 */

var mavensmate = exports;
mavensmate.createClient = require('./mavensmate/client').createClient;

var Promise = require('bluebird');
mavensmate.startServer = function(args) {
  return new Promise(function(resolve, reject) {
    var util = require('./mavensmate/util').instance;
    var UIServer = require('./mavensmate/ui/server');

    var editor = args.editor || 'sublime';
    var port = args.port || '56248';

    var client = mavensmate.createClient({
      editor: editor,
      serverPort: port,
      isServer: true,
      windowOpener: args.windowOpener
    });

    var server = new UIServer(client);
    server.start()
      .then(function(port) {
        console.log('MavensMate server running on port: '+port);
        resolve();
      })
      .catch(function(err) {
        console.error(err.message);
        reject(err);
      });
  });
};