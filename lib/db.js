var pg = require('pg');
var Promise = require('bluebird');
var pgp = Promise.promisifyAll(pg);
var fs = require('fs');

// Just gives you a Db instance. Does not actually connect to the
// database. Use testConnection to make sure the connection is good.
//
// Takes the same arguments as pg.connect
// https://github.com/brianc/node-postgres/wiki/pg#method-connect
function Db(connectionStringOrConfig) {
  this.connectionStringOrConfig = connectionStringOrConfig;
}

// Takes the same arguments as client.query
// https://github.com/brianc/node-postgres/wiki/Client
//
// Always returns full result set. Doesn't support query.on('row')
// If you are going to have tons of results, we will need to come up
// with another way.
Db.prototype.query = function query() {
  var args = arguments;
  return pgp.connectAsync(this.connectionStringOrConfig)
    .spread(function(client, done) {
      var rv = null;
      if (Array.isArray(args[0])) {
        var proms = [];
        args[0].forEach(function(sqlOrConfig) {
          proms.push(client.queryAsync(sqlOrConfig));
        });
        rv = Promise.all(proms);
      } else {
        rv = client.queryAsync.apply(client, args);
      }
      return rv
        .then(function(result) {
          done();
          return result;
        })
        .catch(function(err) {
          done(err);
          throw err;
        });
    });
};

Db.prototype.end = function end() {
  pg.end();
};

// As long as this method doesn't error, your connection is good.
// Takes no arguments.
Db.prototype.testConnection = function testConnection() {
  return this.query('SELECT $1::int AS number', ['1']);
};

// Takes a string with one or more sql statements and executes them all in
// a single client session.
//
// If the string starts with ./ or / we assume it's a file and we read the
// file and run it.
Db.prototype.executeSqlStatements = function executeSqlStatements(sqlstatements) {
  if ('/' === sqlstatements.substr(0, 1) || './' === sqlstatements.substr(0, 2)) {
    // looks like a file path, read in from file.
    sqlstatements = fs.readFileSync(sqlstatements, 'utf-8');
  }
  var statements = this._parseSqlStatements(sqlstatements);
  return this.query(statements);
};

// Parses a string of one or more sql statements. Handy for slurping in a sql
// file and running it.
//
// Returns an array of individual sql statements.
//
// Ignores lines that start with --. Ignores blank lines. All other lines are
// concatinated together till we reach a line that ends with a semicolon.
// Then we start all over again.
Db.prototype._parseSqlStatements = function _parseSqlStatements(sqlstatements) {
  var a = sqlstatements.split('\n');
  var rv = [];
  var statement = '';
  a.forEach(function(line) {
    line = line.trim();
    if (line.indexOf('--') === 0) {
      // skip
    } else if (line === '') {
      // skip
    } else if (line.indexOf(';') === line.length - 1) {
      rv.push((statement + ' ' + line.substr(0, line.length - 1)).trim());
      statement = '';
    } else {
      statement += ' ' + line;
    }
  });
  return rv;
};

module.exports = Db;