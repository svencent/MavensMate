'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var assert      = chai.assert;
var path        = require('path');

chai.use(require('chai-fs'));

describe('mavensmate index-apex', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('index-apex');
    helper.addProject('index-apex')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(120000);
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'index-apex', 'src', 'classes', 'IndexMySymbolsClass.cls')];
    helper.cleanUpTestData(project, filesToDelete)
      .then(function() {
        helper.cleanUpProject('index-apex');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('index-apex');
        done(err);
      });
  });

  it('should index project apex symbols', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'index-apex',
        project: project
      })
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
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'IndexMySymbolsClass')
      .then(function() {
        return commandExecutor.execute({
          name: 'index-apex-class',
          body: { 'className' : 'IndexMySymbolsClass' },
          project: project
        });
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
