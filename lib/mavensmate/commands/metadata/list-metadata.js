/* list-metadata commander component
 * To use add require('../cmds/list-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

  program
    .command('list-metadata')
    .version('0.0.0')
    .description('Lists metadata of a certain type')
    .action(function(/* Args here */){
      // Your code goes here
    });
  
};