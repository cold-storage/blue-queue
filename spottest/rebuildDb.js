#!/usr/bin/env node

// Run from the project root so config will work.

var config = require('./config');
var adminDb = new(require('../lib/db'))(config.db.admin.url);
var qqDb = new(require('../lib/db'))(config.db.qq.url);
var template = require('./template');
var createRoleDbSql = template.render('./spottest/createRoleAndDb.sql', config);

adminDb.executeSqlStatements(createRoleDbSql)
  .then(function() {
    return qqDb.executeSqlStatements('./lib/ddl.sql');
  })
  .then(function() {
    console.log('success!');
  })
  .catch(function(err) {
    console.log('error!', err);
  })
  .finally(adminDb.end);