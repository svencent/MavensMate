'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var assert      = chai.assert;
var path        = require('path');

chai.use(require('chai-fs'));

describe('mavensmate index-apex', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'index-apex');
    helper.addProject(testClient, 'index-apex')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(10000);
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'index-apex', 'src', 'classes', 'IndexMySymbolsClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete)
      .finally(function() {
        helper.cleanUpTestProject('index-apex');
        done();
      });
  });

  it('should index project apex symbols', function(done) {    
    this.timeout(40000);

    testClient.executeCommand('index-apex')
      .then(function(response) {
        
        response.message.should.equal('Symbols successfully indexed');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'index-apex', 'config', '.symbols'),  'Symbols directory does not exist');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should index apex symbols for a specific apex class', function(done) {
    this.timeout(20000);

    helper.createNewMetadata(testClient, 'ApexClass', 'IndexMySymbolsClass')
      .then(function() {
        return testClient.executeCommand('index-apex-class', { 'className' : 'IndexMySymbolsClass' });
      })
      .then(function(response) {
        
        response.message.should.equal('Symbols successfully indexed for IndexMySymbolsClass');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'index-apex', 'config', '.symbols'),  'Symbols directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'index-apex', 'config', '.symbols', 'IndexMySymbolsClass.json'),  'Symbols file does not exist');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});
