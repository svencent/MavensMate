// 'use strict';

// var helper      = require('../test-helper');
// var chai        = require('chai');
// var should      = chai.should();
// var path        = require('path');
// var fs          = require('fs-extra');
// var assert      = chai.assert;

// chai.use(require('chai-fs'));

// describe('mavensmate resource-bundle', function(){

//   var project;
//   var testClient;

//   before(function(done) {
//     this.timeout(4000);
//     testClient = helper.createClient('atom');
//     helper.unlinkEditor();
//     helper.putTestProjectInTestWorkspace(testClient, 'resource-bundle');
//     helper.setProject(testClient, 'resource-bundle', function(err, proj) {
//       project = proj;
//       done();
//     });
//   });

//   after(function(done) {
//     helper.cleanUpTestProject('resource-bundle')
//       .then(function() {
//         done();
//       });
//   });

//   it('should create a resource bundle', function(done) {
    
//     this.timeout(50000);
  
//     fs.copySync(
//       path.join(helper.baseTestDirectory(), 'fixtures', 'test-resource-bundle.zip'), 
//       path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource')
//     );

//     fs.copySync(
//       path.join(helper.baseTestDirectory(), 'fixtures', 'test-resource-bundle.resource-meta.xml'), 
//       path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource-meta.xml')
//     );

//     var payload = {
//       paths : [path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource')]
//     };

//     testClient.executeCommand('new-resource-bundle', payload, function(err, response) {
//       console.log(err);
//       console.log(response);
//       should.equal(err, null);
//       response.should.have.property('result');
//       response.result.should.equal('Resource bundle(s) successfully created');
//       assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test-resource-bundle.resource'),  'Resource bundle directory not created');
//       done();
//     });
//   });

//   it('should deploy a resource bundle', function(done) {    
//     this.timeout(50000);

//     var payload = {
//       path : path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'resource-bundles', 'test-resource-bundle.resource')
//     };

//     testClient.executeCommand('deploy-resource-bundle', payload, function(err, response) {
//       console.log(err);
//       console.log(response);
//       should.equal(err, null);
//       response.should.have.property('result');
//       response.result.should.equal('Resource bundle successfully deployed');
//       assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource'),  'Resource bundle statisresource does not exist');
//       done();
//     });    
//   });

// });

