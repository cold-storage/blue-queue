// TODO initial load of running jobs from db if any.
// would only be shutdown left some jobs running.

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Db = require('./db');
var Promise = require('bluebird');

function QQ(config) {
  this._types = {};
  this._running = true;
  this._db = new Db(config.dbUrl);
}

util.inherits(QQ, EventEmitter);

var p = QQ.prototype;

// Tests the db connection, returns promise.
// Always call this before using the queue.
p.testConnection = function testConnection() {
  return this._db.testConnection();
};

QQ._jobUpdates = function _jobUpdates(job) {
  return {
    text: 'update job set desired_run_time = $1, ' +
      ' actual_run_time = $2, ' +
      ' end_time = $3, ' +
      ' run_count = $4, ' +
      ' too_many_failures = $5, ' +
      ' error = $6, ' +
      ' result = $7 ' +
      ' where uuid = $8',
    values: [
      job.desired_run_time,
      job.actual_run_time,
      job.end_time,
      job.run_count,
      job.too_many_failures,
      job.error,
      job.result,
      job.uuid
    ]
  };
};

QQ._jobInserts = function _jobInserts(job) {
  return {
    text: 'insert into job ' +
      ' (uuid, type, data, desired_run_time, too_many_failures) ' +
      ' values ' +
      ' ($1, $2, $3, $4, false) ',
    values: [
      job.uuid,
      job.type,
      job.data,
      job.desired_run_time
    ]
  };
};

p._listJobs = function _listJobs(type, limit) {
  limit = limit || 100;
  return this._db.query('select * from job ' +
    ' where type = $1 ' +
    ' and too_many_failures = false ' +
    ' order by desired_run_time ' +
    ' limit $2 ', [type, limit]);
};

p._updateJobs = function _updateJobs(jobs) {
  if (!jobs) {
    return Promise.resolve();
  }
  if (!Array.isArray(jobs)) {
    jobs = [jobs];
  }
  var updates = [];
  jobs.forEach(function(job) {
    updates.push(QQ._jobUpdates(job));
  });
  return this._db.query(updates);
};

p._insertJobs = function _insertJobs(jobs) {
  if (!jobs) {
    return Promise.resolve();
  }
  if (!Array.isArray(jobs)) {
    jobs = [jobs];
  }
  var inserts = [];
  jobs.forEach(function(job) {
    inserts.push(QQ._jobInserts(job));
  });
  return this._db.query(inserts);
};

p.shutdown = function shutdown() {
  this.emit('shutdown');
  this._running = false;
};

// Synchronous function allows you to register a job type. We make sure the
// jobType is valid and then add it to our list of registered types.
//
// TODO some day we may need to modify or re-register job types.
p.registerJobType = function registerJobType(jobType) {
  this.emit('registerJobType', jobType);
  if (!jobType) {
    return;
  }
  // TODO some basic validation that you actually passed a jobType and not
  // something else.
  jobType._qq = this;
  this._types[jobType.name] = jobType;
};


// queueJobs synchronously queues up one or more jobs (of the same type).
// You can pass an array of jobs or a single job. If any
// one of the jobs aren't valid we throw an error and none of the jobs are
// queued. If all jobs are valid they will be queued.
//
// Job has one required field, ```type```, which must be a string that matches
// a registered ```jobType.name```.
//
// ```desired_run_time``` is when you want the job to run. It defaults to the time
// the job is queued. Jobs will be run as soon as possible after
// ```desired_run_time```.
//
// ```data``` is any valid JSON data.
//
// At some time in the future, the jobs will be persisted. If there is a error
// saving the jobs, oops. I guess we will keep trying to save the jobs. I think
// if we can't persist the job to the db, that's a catastrophic error. Client's
// can't really handle it because there's nothing they can do about it.
p.queueJobs = function queueJobs(jobs) {
  this.emit('queueJobs', jobs);
  if (!jobs) {
    return;
  }
  if (!Array.isArray(jobs)) {
    jobs = [jobs];
  }
  var jobType = this._types[jobs[0].type];
  if (!jobType) {
    throw new Error('Job type not registered, ' + jobs[0].type);
  }
  return jobType._queueJobs(jobs);
};

exports = module.exports = QQ;


// // _queueJobsByType sorts the jobs out into their respective types and
// // queues them.
// p._queueJobsByType = function _queueJobsByType(jobs) {
//   var types = {};
//   jobs.forEach(function(job) {
//     if (!types[job.type]) {
//       types[job.type] = {
//         jobType: job.jobType,
//         jobs: []
//       };
//     }
//     types[job.type].jobs.push(job);
//   });
//   for (var typeName in types) {
//     types[typeName].jobType.queueJobs(types[typeName].jobs);
//   }
// };

// p._buildJob = function _buildJob(job) {
//   if (!job) {
//     throw new Error('please give us a job.');
//   }
//   if (!job.type) {
//     throw new Error('job must have a type.');
//   }
//   job.jobType = this._types[job.type];
//   if (!job.jobType) {
//     throw new Error('job type, ' + job.type + ', is not registered.');
//   }
//   job.title = job.title || (job.type + ' untitled');
//   job.priority = job.priority || 0;
//   job.queueTime = new Date();
// };
