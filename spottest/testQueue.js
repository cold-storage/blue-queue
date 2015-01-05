var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('chai').assert;
var QQ = require('../lib/queue');
var JobType = require('../lib/jobType');
var qq = null;
var Promise = require('bluebird');

lab.before(function(done) {
  qq = new QQ({
    dbUrl: 'postgres://qq:qq@localhost:5432/qq'
  });
  qq.on('ready', function() {
    done();
  });
  qq.on('error', function(err) {
    done(err);
  });
  qq.on('queueJobs', function(jobs) {
    console.log('jobs queued', jobs);
  });
});

lab.experiment('qq tests', function() {

  lab.test('boooo', function(done) {

    var jobType = new JobType({
      name: 'do dishes',
      handler: function(job) {
        console.log('LOGGING YOUR JOB', job);
        var num = Math.floor(Math.random() * 3) + 1;
        if (num === 3) {
          return Promise.reject(num);
        } else {
          return Promise.resolve(num);
        }
      }
    });

    var jobs = {
      type: 'do dishes',
      data: {
        some: 'dishes'
      }
    };

    qq.registerJobType(jobType);

    qq.queueJobs(jobs);

    setTimeout(function() {
      done();
    }, 1000);

  });

});