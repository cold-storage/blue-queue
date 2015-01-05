var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('chai').assert;
var QQ = require('../lib/queue');
var qq = null;

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
});

lab.experiment('qq db tests', function() {

  lab.test('_insertJobs', function(done) {
    var jobs = {
      uuid: '007-pizza',
      type: 'pizza',
      data: {
        some: 'data'
      },
      desired_run_time: new Date()
    };
    qq._insertJobs(jobs)
      .then(function(result) {
        console.log(result);
        done();
      })
      .error(done);
  });

  lab.test('_updateJobs', function(done) {
    var jobs = {
      uuid: '007-pizza',
      type: 'pizza',
      data: {
        some: 'data'
      },
      desired_run_time: new Date(),
      actual_run_time: new Date(),
      end_time: new Date(),
      run_count: 0,
      error: true,
      result: {
        bad: 'stuff'
      }
    };
    qq._updateJobs(jobs)
      .then(function(result) {
        console.log(result);
        done();
      })
      .error(done);
  });

  lab.test('_listJobs', function(done) {
    qq._listJobs('pizza')
      .then(function(jobs) {
        console.log(JSON.stringify(jobs.rows));
        done();
      })
      .catch(done);
  });

});