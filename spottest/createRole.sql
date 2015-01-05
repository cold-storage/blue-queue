

DROP DATABASE IF EXISTS {{ db.stock.db }};

DROP ROLE IF EXISTS {{ db.stock.role }};

CREATE ROLE {{ db.stock.role }} LOGIN
  PASSWORD '{{ db.stock.pw }}'
  NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE DATABASE {{ db.stock.db }}
  WITH OWNER = {{ db.stock.role }}
       ENCODING = 'UTF8'
       TABLESPACE = pg_default
       CONNECTION LIMIT = -1;
