'use strict';

var _ = require('lodash');

var testClient;

afterEach(function(done) {
	if (testClient && _.isFunction(testClient.destroy)) {
		testClient.destroy();		
	}
	done();
});