DROP TABLE IF EXISTS stock;

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

CREATE TABLE job (
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

COMMENT ON COLUMN job.uuid IS 'Any unique string will do.';
COMMENT ON COLUMN job.type IS 'Name of job type.';
COMMENT ON COLUMN job.data IS 'Any arbitrary job data.';
COMMENT ON COLUMN job.desired_run_time IS 'When you would like the job to run.';
COMMENT ON COLUMN job.actual_run_time IS 'Last time we tried to run the job.';
COMMENT ON COLUMN job.end_time IS 'Last time the job either succeeded or failed.';
COMMENT ON COLUMN job.run_count IS 'How many times we have tried to run the job.';
COMMENT ON COLUMN job.error IS 'True if job ended in failure, false otherwise.';
COMMENT ON COLUMN job.result IS 'JSON error or success result.';

CREATE INDEX ix_job_type
   ON job (type ASC NULLS LAST);

CREATE INDEX ix_job_desired_run_time
   ON job (desired_run_time ASC NULLS LAST);

-- CREATE TABLE stock_price (
--   symbol text not null,
--   day date not null,
--   open numeric not null,
--   high numeric not null,
--   low numeric not null,
--   close numeric not null,
--   volume integer not null,
--   CONSTRAINT stock_price_pkey PRIMARY KEY (symbol, day),
--   CONSTRAINT stock_price_stock_fkey FOREIGN KEY (symbol)
--       REFERENCES stock (symbol)
-- );