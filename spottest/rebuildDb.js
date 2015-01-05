#!/usr/bin/env node

// Run from the project root so config will work.

var config = require('./config');
var adminDb = new(require('../lib/db'))(config.db.admin.url);
var stockDb = new(require('../lib/db'))(config.db.stock.url);
var template = require('./template');
var createRoleDbSql = template.render('./spottest/createRole.sql', config);

adminDb.executeSqlStatements(createRoleDbSql)
  .then(function() {
    return stockDb.executeSqlStatements('./spottest/ddl.sql');
  })
  .then(function() {
    console.log('success!');
  })
  .catch(function(err) {
    console.log('error!', err);
  })
  .finally(adminDb.end);