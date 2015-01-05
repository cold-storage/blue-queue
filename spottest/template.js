var cache = {};
var fs = require('fs');
var crypto = require('crypto');
var Hogan = require('hogan.js');

function getTemplate(stringPathUrl) {
  var rv = null;
  if ('/' === stringPathUrl.substr(0, 1) || './' === stringPathUrl.substr(0, 2)) {
    if (!cache[stringPathUrl]) {
      rv = Hogan.compile(fs.readFileSync(stringPathUrl, 'utf-8'));
      cache[stringPathUrl] = rv;
    }
  } else {
    var md5 = crypto.createHash('md5').update(stringPathUrl).digest('hex');
    if (!cache[md5]) {
      rv = Hogan.compile(stringPathUrl);
      cache[md5] = rv;
    }
  }
  // console.log('template cache', cache);
  return rv;
}

// renders template from given string, path or URL, and data.
// caches compiled template.
function render(stringPathUrl, data) {
  data = data || {};
  var template = getTemplate(stringPathUrl);
  return template.render(data);
}

module.exports = {
  render: render
};