'use strict';

var assert 	= require('assert');
var exec 		= require('child_process').exec;
var path 		= require('path');
var sinon 	= require('sinon');
var sinon 	= require('sinon');
var program = require('commander');

describe('mavensmate new-project', function(){
	var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	
	it('--ui should return new-project html path', function(done) {
		exec(cmd+'new-project --ui', function (error, stdout, stderr) {
			assert(stdout.indexOf('.html') >= 0);
			done();
		});
	});

	it('--ui should create new project', function(done) {
		
		this.timeout(8000);
		
		exec(cmd+'--headless new-project <<< ""', function (error, stdout, stderr) {
			assert(stdout.indexOf('.html') >= 0);
			done();
		});
	});

});
