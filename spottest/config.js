// postgres://role:pw@host:port/db
function buildUrl(cfg) {
  return 'postgres://' + cfg.role + ':' +
    cfg.pw + '@' + cfg.host + ':' + cfg.port + '/' + cfg.db;
}

var cfg = {
  db: {
    admin: {
      db: 'postgres',
      role: 'postgres',
      pw: 'qwer1234',
      host: 'localhost',
      port: 5432
    },
    stock: {
      db: 'qq',
      role: 'qq',
      pw: 'qq',
      host: 'localhost',
      port: 5432
    }
  }
};

cfg.db.admin.url = buildUrl(cfg.db.admin);
cfg.db.stock.url = buildUrl(cfg.db.stock);

module.exports = cfg;