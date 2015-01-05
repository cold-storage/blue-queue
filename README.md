# qq

messing with queues

Goal here is to create a persistent job queue that can be backed by any
sql database. Redis or something similar is probably a better fit but since
we are using sql already . . .

Desired functionality.

Easily queue up a single job or a bunch of jobs.

Support scheduled/delayed jobs.

Support intelligent retry logic.

Automatic persistence and running of jobs as close to desired run time as
possible.

Job

A Job is any JSON with the following fields.


Support for scheduled and delayed jobs and for retry time is implemented
using desiredRunTime. desiredRunTime defaults to now if not explicitly set
on first run and on retry.

If you want to delay a job, set desiredRunTime to the desired delay. If you
want a job run at a specific time set desiredRunTime to that time. On failure,
make sure your retry logic sets desiredRunTime to your liking.

We'll probably provide functions to make all of the above easy.

