'use strict';

var fs                = require('fs-extra');
var path              = require('path');
var helper 						= require('../test-helper');
var Metadata 					= require('../../lib/mavensmate/metadata').Metadata;
var MetadataService   = require('../../lib/mavensmate/metadata').MetadataService;

describe('mavensmate metadata-service', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    testClient = helper.createClient('atom');
    helper.putTestProjectInTestWorkspace(testClient, 'metadata-service-test');
    helper.setProject(testClient, 'metadata-service-test', function(err, proj) {
      project = proj;
      done();
    });
  });

  after(function(done) {
    helper.cleanUpTestProject('metadata-service-test')
      .then(function() {
        done();
      });
  });

	it('should create new Metadata instance of type ApexClass', function(done) {
    var apexClassPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'classes', 'foo.cls');
    fs.outputFileSync(apexClassPath, '');
    var metadata = new Metadata({ project: project, path: apexClassPath });
    metadata.type.xmlName.should.equal('ApexClass');
    done();
	});

  it('should create new Metadata instance of type ApexPage', function(done) {
    var apexPagePath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'pages', 'foo.page');
    fs.outputFileSync(apexPagePath, '');

    var metadata = new Metadata({ project: project, path: apexPagePath });
    metadata.type.xmlName.should.equal('ApexPage');
    done();
  });

  it('should create new Metadata instance of type CustomObject', function(done) {  
    var customObjectPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'objects', 'Account.object');
    fs.outputFileSync(customObjectPath, '');

    var metadata = new Metadata({ project: project, path: customObjectPath });
    metadata.type.xmlName.should.equal('CustomObject');
    done();
  });

  it('should create new Metadata instance of type EmailTemplate', function(done) {  
    var emailTemplatePath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'email', 'myFolder', 'myEmail.email');
    fs.outputFileSync(emailTemplatePath, '');

    var metadata = new Metadata({ project: project, path: emailTemplatePath });
    metadata.type.xmlName.should.equal('EmailTemplate');
    done();
  });

  it('should create new Metadata instance of type Document', function(done) {  
    var documentPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'documents', 'myFolder', 'foo.jpg');
    fs.outputFileSync(documentPath, '');

    var metadata = new Metadata({ project: project, path: documentPath });
    metadata.type.xmlName.should.equal('Document');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > STYLE', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.css');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('STYLE');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > APPLICATION', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.app');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('APPLICATION');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > DOCUMENTATION', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.auradoc');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('DOCUMENTATION');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > COMPONENT', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.cmp');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('COMPONENT');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > EVENT', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.evt');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('EVENT');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > INTERFACE', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'foo.intf');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('INTERFACE');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > CONTROLLER', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'fooController.js');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('CONTROLLER');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > HELPER', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'fooHelper.js');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('HELPER');
    done();
  });

  it('should create new Metadata instance of type AuraDefinitionBundle > RENDERER', function(done) {  
    var itemPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo', 'fooRenderer.js');
    fs.ensureFileSync(itemPath, '');

    var metadata = new Metadata({ project: project, path: itemPath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('RENDERER');
    done();
  });

  it('should create new Metadata instances from directory of type ApexClass', function(done) {
    var members = '<types><members>foo</members><members>foo2</members><name>ApexClass</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>32.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'package.xml'), packageXml);

    var apexClassPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'classes', 'foo.cls');
    var apexClassPath2 = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'classes', 'foo2.cls');
    fs.outputFileSync(apexClassPath, '');
    fs.outputFileSync(apexClassPath2, '');

    var apexClassesPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'classes');
    var metadataService = new MetadataService();
    metadataService.getMetadataFromPaths([apexClassesPath], project)
      .then(function(metadata) {
        console.log(metadata);
        metadata.length.should.equal(2);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create new Metadata instances from directory of type Document', function(done) {
    var members = '<types><members>myfolder</members><members>myfolder/foo.html</members><members>myfolder/foo.txt</members><name>Document</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>32.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'package.xml'), packageXml);

    var docPath1 = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'documents', 'myfolder', 'foo.html');
    var docPath2 = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'documents', 'myfolder', 'foo.txt');
    fs.outputFileSync(docPath1, '');
    fs.outputFileSync(docPath2, '');

    var documentPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'documents');
    fs.ensureDirSync(documentPath);

    var metadataService = new MetadataService();
    metadataService.getMetadataFromPaths([documentPath], project)
      .then(function(metadata) {
        console.log(metadata);
        metadata.length.should.equal(2);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create new Metadata instances from directory of type EmailTemplate', function(done) {
    var members = '<types><members>myfolder</members><members>myfolder/foo.email</members><members>myfolder/foo2.email</members><name>EmailTemplate</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>32.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'package.xml'), packageXml);

    var email1 = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'email', 'myfolder', 'foo.email');
    var email2 = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'email', 'myfolder', 'foo2.email');
    fs.outputFileSync(email1, '');
    fs.outputFileSync(email2, '');

    var emailPath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'email');
    fs.ensureDirSync(emailPath);

    var metadataService = new MetadataService();
    metadataService.getMetadataFromPaths([emailPath], project)
      .then(function(metadata) {
        metadata.length.should.equal(3);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create new Metadata instances from directory of type AuraDefinitionBundle', function(done) {
    var bundlePath = path.join(helper.baseTestDirectory(), 'workspace', 'metadata-service-test', 'src', 'aura', 'foo');
    fs.ensureDirSync(bundlePath);

    var metadata = new Metadata({ project: project, path: bundlePath });
    metadata.type.xmlName.should.equal('AuraDefinitionBundle');
    metadata.getLightningDefinitionType().should.equal('BUNDLE');
    done();
  });

});
