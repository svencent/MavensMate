'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');

chai.use(require('chai-fs'));

describe('mavensmate logging', function() {

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('logging');
    helper.addProject('logging')
      .then(function(proj) {
        project = proj;
        var loggingConfig = {
          'levels': {
            'Workflow': 'INFO',
            'Callout': 'INFO',
            'System': 'DEBUG',
            'Database': 'INFO',
            'ApexCode': 'DEBUG',
            'Validation': 'INFO',
            'Visualforce': 'DEBUG'
          },
          /*jshint camelcase: false */
          'users': [
            project.sfdcClient.conn.userInfo.user_id
          ],
          /*jshint camelcase: true */
          'expiration': 480
        };
        fs.writeJsonSync(path.join(helper.baseTestDirectory(), 'workspace', 'logging', 'config', '.debug'), loggingConfig);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('logging');
    done();
  });

  it('should start logging for all user ids listed in config/.debug', function(done) {
    this.timeout(120000);

    commandExecutor.execute({ name: 'start-logging', project: project })
      .then(function(response) {

        response.message.should.equal('Started logging for debug users');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should stop logging for all user ids listed in config/.debug', function(done) {
    this.timeout(120000);

    commandExecutor.execute({ name: 'stop-logging', project: project })
      .then(function(response) {

        response.message.should.equal('Stopped logging for debug users');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});

