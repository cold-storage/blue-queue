var Lab = require('lab');
var lab = exports.lab = Lab.script();
var assert = require('chai').assert;

var jobType = require('../lib/job_type');

lab.experiment('job_type tests', function() {

  lab.test('will sort by date descending', function(done) {
    var jobs = [{
      desired_run_time: new Date(2000, 1, 1)
    }, {
      desired_run_time: new Date(2020, 1, 1)
    }];
    jobType._sortByDesiredRunTimeDescending(jobs);
    //console.log(jobs);
    assert(jobs[0].desired_run_time.getTime() === new Date(2020, 1, 1).getTime());
    done();
  });

});