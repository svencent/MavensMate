'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate lightning', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('lightning');
    helper.addProject('lightning')
      .then(function(proj) {
        project = proj;
        return project.indexLightning()
      })
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(120000);
    var lightningBundlesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester'),
      path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo'),
      path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestevent'),
      path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestinterface')
    ];

    helper.cleanUpTestData(project, lightningBundlesToDelete)
      .then(function() {
        helper.cleanUpProject('lightning');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('lightning');
        done(err);
      });
  });

  it('should create a new lightning app', function(done) {
    this.timeout(120000);

    var payload = {
      apiName : 'mmunittester',
      description : 'something_fun',
      createController: true,
      createHelper: true,
      createStyle: true,
      createDocumentation: true,
      createRenderer: true
    };
    commandExecutor.execute({
        name: 'new-lightning-app',
        body: payload,
        project: project
      })
      .then(function(response) {
        response.message.should.equal('Lightning app created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester'),  'Lightning bundle not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittester.app'),  'Lightning app not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittester.auradoc'),  'Lightning doc not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittester.css'),  'Lightning css not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittesterController.js'),  'Lightning controller not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittesterHelper.js'),  'Lightning helper not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittester', 'mmunittesterRenderer.js'),  'Lightning renderer not created');
        project.packageXml.subscription.should.have.property('AuraDefinitionBundle');
        project.packageXml.subscription.AuraDefinitionBundle.length.should.equal(1);
        project.packageXml.subscription.AuraDefinitionBundle[0].should.equal('mmunittester');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create a new lightning component', function(done) {
    this.timeout(120000);

    var payload = {
      apiName : 'mmcompunittestfoo',
      description : 'something_fun',
      createController: true,
      createHelper: true,
      createStyle: true,
      createDocumentation: true,
      createRenderer: true
    };
    commandExecutor.execute({
        name: 'new-lightning-component',
        body: payload,
        project: project
      })
      .then(function(response) {
        response.message.should.equal('Lightning component created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo'),  'Lightning bundle not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfoo.cmp'),  'Lightning component not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfoo.auradoc'),  'Lightning doc not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfoo.css'),  'Lightning css not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfooController.js'),  'Lightning controller not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfooHelper.js'),  'Lightning helper not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmcompunittestfoo', 'mmcompunittestfooRenderer.js'),  'Lightning renderer not created');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create a new lightning interface', function(done) {
    this.timeout(120000);

    var payload = {
      apiName : 'mmunittestinterface',
      description : 'something_fun'
    };
    commandExecutor.execute({
        name: 'new-lightning-interface',
        body: payload,
        project: project
      })
      .then(function(response) {

        response.message.should.equal('Lightning interface created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestinterface'),  'Lightning bundle not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestinterface', 'mmunittestinterface.intf'),  'Lightning interface not created');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create a lightning event', function(done) {
    this.timeout(120000);

    var payload = {
      apiName : 'mmunittestevent',
      description : 'something_fun'
    };
    commandExecutor.execute({
        name: 'new-lightning-event',
        body: payload,
        project: project
      })
      .then(function(response) {
        response.message.should.equal('Lightning event created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestevent'),  'Lightning bundle not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'lightning', 'src', 'aura', 'mmunittestevent', 'mmunittestevent.evt'),  'Lightning event not created');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});

