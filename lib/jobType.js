var util = require('util');
var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');

function JobType(config) {
  if (!config.name) {
    throw new Error('job type must have a name');
  }
  this.name = config.name;
  if (!config.handler) {
    throw new Error('job type must have a handler function');
  }
  var me = this;
  this.handler = function(job) {
    config.handler(job)
      .then(function(result) {
        job.result = result;
        job.error = false;
        return result;
      })
      .catch(function(err) {
        job.result = err;
        job.error = true;
        // retry logic set desired_run_time
        // add job to backlog.
        // handle more jobs.
      })
      .finally(function() {
        job.end_time = new Date();
        me._removeFromRunningJobs(job);
        me._qq._updateJobs(job);
      });
  };
  this.failureAttempts = config.failureAttempts || 0;
  // TODO backoff strategy
  this.concurrency = config.concurrency || 1;
  this._runningJobs = [];
  this._jobBacklog = [];
}

util.inherits(JobType, EventEmitter);

var p = JobType.prototype;

p._removeFromRunningJobs = function _removeFromRunningJobs(job) {
  // XXX TODO !!!
};

// _queueJobs synchronously queues up one or more jobs.
// You can pass an array of jobs or a single job. If any
// one of the jobs aren't valid we throw an error and none of the jobs are
// queued. If all jobs are valid they will be queued.
//
// At some time in the future, the jobs will be persisted. If there is a error
// saving the jobs, oops. I guess we will keep trying to save the jobs. I think
// if we can't persist the job to the db, that's a catastrophic error. Client's
// can't really handle it because there's nothing they can do about it.
p._queueJobs = function _queueJobs(jobs) {
  JobType._validateJobs(jobs);
  JobType._addDefaultValues(jobs);
  this._addJobsToBacklog(jobs);
  this._qq._insertJobs(jobs)
    .finally(this._handleMoreJobs.bind(this));
};

// We add UUID right at the beginning
JobType._addDefaultValues = function _addDefaultValues(jobs) {
  jobs.forEach(function(job) {
    job.uuid = uuid.v1();
    job.desired_run_time = job.desired_run_time || new Date();
    job.run_count = 0;
    job.error = false;
  });
};

JobType._validateJobs = function _validateJobs(jobs) {
  // TODO
  return jobs;
};

// actually run the job and then save the state to db.
p._runJob = function _runJob(job) {
  this.handler(job);
  job.actual_run_time = new Date();
  job.run_count++;
  this._qq._updateJobs(job);
};

JobType._isTimeToRun = function _isTimeToRun(job) {
  // XXX TODO !!!
  return true;
};

p._isRunning = function _isRunning(job) {
  // XXX TODO !!!
  return false;
};

p._fillQueueFromBacklog = function _fillQueueFromBacklog() {
  // if job queue full return
  var diff = this.concurrency - this._runningJobs.length;
  if (diff < 1 || this._jobBacklog.length === 0) {
    return;
  }
  var me = this;
  for (var i = this._jobBacklog.length - 1; i >= 0; i--) {
    var job = this._jobBacklog[i];
    if (!me._isRunning(job) && JobType._isTimeToRun(job)) {
      this._runningJobs.push(job);
      this._jobBacklog.splice(i, 1);
      this._runJob(job);
      diff--;
      if (diff === 0) {
        break;
      }
    }
  }

  // if it's time to run the job on top of queue and the job isn't already
  // running, run it (the way we add jobs to backlog, may end up with ones
  // that are already running).
  // else we're done.
};

p._fillBacklogFromDb = function _fillBacklogFromDb() {
  if (this._fillingBacklogFromDb) {
    return;
  }
  var me = this;
  me._fillingBacklogFromDb = true;
  me._qq._listJobs(me.name, me.concurrency * 3, me.failureAttempts)
    .then(function(jobs) {
      me._jobBacklog = jobs;
    })
    .finally(function() {
      me._fillingBacklogFromDb = false;
    });
};

// _handleMoreJobs is called when a job from the queue is finished and when
// _queueJobs is called. It's basically the trigger that says, "hey, we may
// have more stuff to do."
p._handleMoreJobs = function _handleMoreJobs() {
  // if job queue full return
  var diff = this.concurrency - this._runningJobs.length;
  if (diff < 1) {
    return;
  }
  // else do we have enough jobs in backlog to fill queue
  if (this._jobBacklog.length < diff) {
    // no fill backlog from db
    // then fill queue from backlog
    this._fillBacklogFromDb()
      .then(this._fillQueueFromBacklog.bind(this));
  } else {
    // yes, fill queue from backlog
    this._fillQueueFromBacklog();
  }
};

JobType._sortByDesiredRunTimeDescending = function _sortByDesiredRunTimeDescending(jobs) {
  jobs.sort(function(a, b) {
    return b.desired_run_time.getTime() - a.desired_run_time.getTime();
  });
  return jobs;
};

// If no jobs in the backlog, we sort new jobs and set backlog to these jobs.
// If there are jobs in the backlog, we add any of ours that are to be run
// sooner than the last job in the backlog. Otherwise these higher priority
// jobs won't get run till next time we read from the db.
p._addJobsToBacklog = function _addJobsToBacklog(jobs) {
  if (this._jobBacklog.length === 0) {
    this._jobBacklog = JobType._sortByDesiredRunTimeDescending(jobs);
    return;
  }
  var me = this;
  var highestBacklogDesiredRunTime =
    me._jobBacklog[this._jobBacklog.length - 1].desired_run_time.getTime();
  jobs.forEach(function(job) {
    if (job.desired_run_time.getTime() <= highestBacklogDesiredRunTime) {
      me._jobBacklog.push(job);
    }
  });
  JobType._sortByDesiredRunTimeDescending(me._jobBacklog);
};

exports = module.exports = JobType;