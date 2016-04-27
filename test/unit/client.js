'use strict';

var fs                = require('fs-extra');
var client            = require('../../lib/mavensmate/client');
var chai              = require('chai');
var should            = chai.should();
var sinon             = require('sinon');

describe('mavensmate client-unit', function(){

  it('should create sublime text client', function(done) {
    var myClient = client.createClient({
      editor: 'sublime',
      isNodeApp: true
    });
    should.equal(myClient.getServer(), undefined);
    done();
  });

  it('should fail to set project', function(done) {
    var myClient = client.createClient({
      editor: 'sublime',
      isNodeApp: true
    });
    myclient.addProjectByPath('/foo/bar')
      .catch(function(err) {
        should.equal(err.message, 'This does not seem to be a valid MavensMate project directory.');
        done();
      });
  });

});
