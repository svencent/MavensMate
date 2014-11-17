/* index-apex commander component
 * To use add require('../cmds/index-apex.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

  program
    .command('index-apex')
    .version('0.0.0')
    .description('Indexes Apex symbols for code assist purposes')
    .action(function(/* Args here */){
      // Your code goes here
    });
  
};