-- SELECT EXISTS (
--     SELECT 1
--     FROM   pg_catalog.pg_class c
--     JOIN   pg_catalog.pg_namespace n ON n.oid = c.relnamespace
--     WHERE  n.nspname = 'public'
--     AND    c.relname = 'qq_job'
-- );

-- DROP TABLE IF EXISTS qq_job;

-- Tip: There is no performance difference among these three types
-- varchar, char and text, apart from
-- increased storage space when using the blank-padded type, and a few extra
-- CPU cycles to check the length when storing into a length-constrained
-- column. While character(n) has performance advantages in some other
-- database systems, there is no such advantage in PostgreSQL; in fact
-- character(n) is usually the slowest of the three because of its additional
-- storage costs. In most situations text or character varying should be used
-- instead.
--
-- http://www.postgresql.org/docs/9.1/static/datatype-character.html

CREATE TABLE qq_job (
  uuid text not null,
  type text not null,
  data json,
  desired_run_time timestamp with time zone not null,
  actual_run_time timestamp with time zone,
  end_time timestamp with time zone,
  run_count int not null default 0,
  too_many_failures boolean not null default false,
  error boolean not null default false,
  result json,
  CONSTRAINT job_pkey PRIMARY KEY (uuid)
);

COMMENT ON COLUMN qq_job.uuid IS 'Any unique string will do.';
COMMENT ON COLUMN qq_job.type IS 'Name of job type.';
COMMENT ON COLUMN qq_job.data IS 'Any arbitrary job data.';
COMMENT ON COLUMN qq_job.desired_run_time IS 'When you would like the job to run.';
COMMENT ON COLUMN qq_job.actual_run_time IS 'Last time we tried to run the qq_job.';
COMMENT ON COLUMN qq_job.end_time IS 'Last time the job either succeeded or failed.';
COMMENT ON COLUMN qq_job.run_count IS 'How many times we have tried to run the qq_job.';
COMMENT ON COLUMN qq_job.too_many_failures IS 'True if we have failed too many times and should not retry.';
COMMENT ON COLUMN qq_job.error IS 'True if job ended in failure, false otherwise.';
COMMENT ON COLUMN qq_job.result IS 'JSON error or success result.';

CREATE INDEX ix_qq_job_type
   ON qq_job (type ASC NULLS LAST);

CREATE INDEX ix_qq_job_desired_run_time
   ON qq_job (desired_run_time ASC NULLS LAST);
