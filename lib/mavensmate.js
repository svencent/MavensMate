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

    var port = args.port || '56248';

    var client = mavensmate.createClient({
      serverPort: port,
      isServer: true,
      windowOpener: args.windowOpener,
      name: args.name
    });

    var server = new UIServer(client);
    server.start()
      .then(function(port) {
        console.log('MavensMate server running on port: '+port);
        resolve({
          server: server,
          config: require('./mavensmate/config')
        });
      })
      .catch(function(err) {
        console.error(err.message);
        reject(err);
      });
  });
};