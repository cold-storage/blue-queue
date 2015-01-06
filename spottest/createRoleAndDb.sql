

DROP DATABASE IF EXISTS {{ db.qq.db }};

DROP ROLE IF EXISTS {{ db.qq.role }};

CREATE ROLE {{ db.qq.role }} LOGIN
  PASSWORD '{{ db.qq.pw }}'
  NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE DATABASE {{ db.qq.db }}
  WITH OWNER = {{ db.qq.role }}
       ENCODING = 'UTF8'
       TABLESPACE = pg_default
       CONNECTION LIMIT = -1;
