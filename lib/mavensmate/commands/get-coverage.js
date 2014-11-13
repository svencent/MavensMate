/* compile-metadata commander component
 * To use add require('../cmds/compile-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 									= require('../util').instance;
var inherits 							= require('inherits');
var BaseCommand 					= require('../command');
// var Renderer 							= require('../ui/renderer');

function Command() {
	Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
	var self = this;
	if (self.payload.ui) {
		var renderer = new Renderer({
			project: self.getProject(),
			locals: {
				apexClassOrTriggerName: self.payload.apexClassOrTriggerName,
				type: self.payload.type,
				uncoveredLines: self.payload.uncoveredLines
			}
		});
		renderer.render('test-coverage')
			.then(function(htmlResult){
				return self.respond(htmlResult);
			})
			['catch'](function(err) {
				// todo
			})
			.done();
	}
};

exports.command = Command;
exports.addSubCommand = function(client) {
	client.program
		.command('get-coverage')
		.option('--ui', 'Returns the coverage indication via html')
		.version('0.0.1')
		.description('Gets coverage for a specified class')
		.action(function(){
			util.getPayload()
				.then(function(payload) {
					client.executeCommand(this._name, payload);	
				});	
		});
};