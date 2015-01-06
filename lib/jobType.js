var util = require('util');
var EventEmitter = require('events').EventEmitter;
var uuid = require('node-uuid');

function JobType(config) {
  if (!config.name) {
    throw new Error('job type must have a name');
  }
  this.name = config.name;
  if (typeof(config.handler) !== 'function') {
    throw new Error('job type must have a handler function');
  }
  var me = this;
  this.handler = function(job) {
    config.handler(job)
      .then(function(result) {
        me._removeFromRunningJobs(job);
        job.result = result;
        job.error = false;
        job.end_time = new Date();
        me._qq._updateJobs(job);
        return result;
      })
      .catch(function(err) {
        me._removeFromRunningJobs(job);
        job.result = err;
        job.error = true;
        job.end_time = new Date();
        // TODO better retry strategy.
        job.desired_run_time = new Date(Date.now() + (1000 * 1));
        // Can't just check if run count > failureAttempts because if we
        // up our failure attempts on restart, then all the jobs that we only
        // tried 3 times before will now get re-run. I don't thik we want
        // increase in failure attempts to be retro-active.
        if (job.run_count > me.failureAttempts) {
          job.too_many_failures = true;
        } else {
          me._addJobsToBacklog(job);
        }
        me._qq._updateJobs(job)
          .then(me._handleMoreJobs.bind(me));
      });
  };
  this.failureAttempts = config.failureAttempts || 0;
  // TODO backoff strategy
  this.concurrency = config.concurrency || 1;
  this._runningJobs = [];
  this._running = true;
  this._jobBacklog = [];
}

util.inherits(JobType, EventEmitter);

var p = JobType.prototype;

p.shutdown = function shutdown() {
  this._running = false;
};

p._removeFromRunningJobs = function _removeFromRunningJobs(job) {
  for (var i = this._runningJobs.length - 1; i >= 0; i--) {
    var rj = this._runningJobs[i];
    console.log('_removeFromRunningJobs', rj.uuid, job.uuid);
    if (rj.uuid === job.uuid) {
      this._runningJobs.splice(i, 1);
    }
  }
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
  if (!this._running) {
    throw new Error('Forbidden to queueJobs. We are already shut down.');
  }
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
    job.too_many_failures = false;
  });
};

JobType._validateJobs = function _validateJobs(jobs) {
  // TODO
  return jobs;
};

// actually run the job and then save the state to db.
p._runJob = function _runJob(job) {
  job.actual_run_time = new Date();
  job.run_count++;
  this.handler(job);
  this._qq._updateJobs(job);
};

JobType._isTimeToRun = function _isTimeToRun(job) {
  var v = job.desired_run_time.getTime() <= Date.now();
  //console.log('_isTimeToRun', v);
  return v;
};

p._isJobRunning = function _isJobRunning(job) {
  for (var i = this._runningJobs.length - 1; i >= 0; i--) {
    var rj = this._runningJobs[i];
    if (rj.uuid === job.uuid) {
      return true;
    }
  }
  return false;
};

p._getMillisTillNextRunTime = function _getMillisTillNextRunTime() {
  var nextJob = this._jobBacklog[this._jobBacklog.length - 1];
  var millis = nextJob.desired_run_time.getTime() - Date.now();
  console.log('_getMillisTillNextRunTime', millis);
  return millis;
};

p._fillQueueFromBacklog = function _fillQueueFromBacklog() {
  // if job queue full return
  var diff = this.concurrency - this._runningJobs.length;
  if (diff < 1 || this._jobBacklog.length === 0) {
    return;
  }
  var me = this;
  // Loop over backwards so we can remove elements safely.
  for (var i = this._jobBacklog.length - 1; i >= 0; i--) {
    var job = this._jobBacklog[i];
    if (!me._isJobRunning(job) && JobType._isTimeToRun(job)) {
      this._runningJobs.push(job);
      this._jobBacklog.splice(i, 1);
      this._runJob(job);
      diff--;
      if (diff === 0) {
        break;
      }
    }
  }
  // If there's still stuff in the backlog and the running queue
  // isn't full that means the stuff in backlog wasn't ready to run yet.
  // so set a timer for the next job to run.
  diff = this.concurrency - this._runningJobs.length;
  if (this._jobBacklog.length > 0 && diff > 0) {
    var millis = me._getMillisTillNextRunTime();
    setTimeout(me._fillQueueFromBacklog.bind(me), millis);
  }
};

p._fillBacklogFromDb = function _fillBacklogFromDb() {
  console.log('_fillBacklogFromDb');
  if (this._fillingBacklogFromDb) {
    console.log('_fillBacklogFromDb already filling');
    return Promise.resolve(true);
  }
  var me = this;
  me._fillingBacklogFromDb = true;
  console.log('_fillBacklogFromDb set filling true');
  return me._qq._listJobs(me.name, me.concurrency * 3, me.failureAttempts)
    .then(function(resp) {
      console.log('_fillBacklogFromDb listed jobs');
      me._jobBacklog = JobType._sortByDesiredRunTimeDescending(resp.rows);
    })
    .finally(function() {
      console.log('_fillBacklogFromDb set filling false');
      me._fillingBacklogFromDb = false;
    });
};

// _handleMoreJobs is called when a job from the queue is finished and when
// _queueJobs is called. It's basically the trigger that says, "hey, we may
// have more stuff to do."
p._handleMoreJobs = function _handleMoreJobs() {
  console.log('_handleMoreJobs');
  // if job queue full return
  var diff = this.concurrency - this._runningJobs.length;
  if (diff < 1) {
    //console.log('_handleMoreJobs diff < 1');
    return;
  }
  // else do we have enough jobs in backlog to fill queue
  if (this._jobBacklog.length < diff) {
    //console.log('_handleMoreJobs _jobBacklog.length < diff');
    // no fill backlog from db
    // then fill queue from backlog
    this._fillBacklogFromDb()
      .then(this._fillQueueFromBacklog.bind(this));
  } else {
    //console.log('_handleMoreJobs else');
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
//
// We assume jobs are NOT past their retry limit.
p._addJobsToBacklog = function _addJobsToBacklog(jobs) {
  if (!jobs) {
    //console.log('p._addJobsToBacklog no jobs');
    return;
  }
  if (!Array.isArray(jobs)) {
    //console.log('p._addJobsToBacklog create array');
    jobs = [jobs];
  }
  if (this._jobBacklog.length === 0) {
    //console.log('p._addJobsToBacklog nothing in backlog');
    this._jobBacklog = JobType._sortByDesiredRunTimeDescending(jobs);
    return;
  }
  //console.log('p._addJobsToBacklog looping');
  var me = this;
  var highestBacklogDesiredRunTime =
    me._jobBacklog[this._jobBacklog.length - 1].desired_run_time.getTime();
  jobs.forEach(function(job) {
    if (job.desired_run_time.getTime() <= highestBacklogDesiredRunTime) {
      console.log('p._addJobsToBacklog pushing', job);
      me._jobBacklog.push(job);
    }
  });
  JobType._sortByDesiredRunTimeDescending(me._jobBacklog);
};

exports = module.exports = JobType;