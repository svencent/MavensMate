'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate run-tests', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'run-tests');

  it('should run tests', function(done) {
    
    this.timeout(40000);

    helper.setProject(testClient, 'run-tests', function() {
      
      // create test class
      // run tests
      // delete test class

      helper.getNewMetadataPayload('ApexClass', 'RunTestsApexClass', 'UnitTestApexClass.cls')
        .then(function(payload) {
          testClient.executeCommand('new-metadata', payload, function() {
            var testPayload = {
              classes: [ 'RunTestsApexClass.cls' ]
            };
            testClient.executeCommand('run-tests', testPayload, function(err, response) {
              should.equal(err, null);
              response.should.have.property('result');
              response.result.should.have.property('testResults');
              response.result.should.have.property('coverageResults');
              response.result.testResults.should.have.property('MyTestClass');
              response.result.coverageResults.should.have.property('classes');
              response.result.coverageResults.should.have.property('triggers');
              done();
            }); 
            done();
          });
        })
        .done();
    });

    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'RunTestsApexClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete);
    helper.cleanUpTestProject('run-tests');
  });

});



// 'use strict';

// var helper      = require('../test-helper');
// var chai        = require('chai');
// var should      = chai.should();

// describe('mavensmate run-tests', function(){

//   it('should compile a list of files', function(done) {
    
//     this.timeout(20000);

//     var testClient = helper.createClient('atom');

//     helper.setProject(testClient, 'existing-project', function() {
      
//       var payload = {
//         classes : [ 'MyTest.cls' ]
//       };

//       testClient.executeCommand('run-tests', payload, function(err, response) {
//         should.equal(err, null);
//         response.should.have.property('result');
//         response.result.should.have.property('testResults');
//         response.result.should.have.property('coverageResults');
//         response.result.testResults.should.have.property('MyTestClass');
//         response.result.coverageResults.should.have.property('classes');
//         response.result.coverageResults.should.have.property('triggers');
//         done();
//       });
//     });

//   });

// });


