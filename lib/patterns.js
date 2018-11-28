const ip = require('ip')
const { URL } = require('url')
const { IPv4, IPv6 } = require('ipaddr.js')
const { isRange, inRange } = require('range_check')

function isLocalhost(val) {
  return /^(http:\/\/)?(localhost)(?:(:\d|\/)|$)/i.test(val)
}

function areEqualIps(val1, val2) {
  try {
    return ip.isEqual(val1, val2)
  } catch (err) {
    return false
  }
}

function isLocalHostIP(val) {
  return areEqualIps('127.0.0.1', val) || areEqualIps('::1', val)
}

function isCidr(val) {
  return typeof val === 'string' && val && isRange(val)
}

function isValidIp(val) {
  return typeof val === 'string' && val && (IPv4.isValid(val) || IPv6.isValid(val))
}

// eslint-disable-next-line consistent-return
function makeUrl(val) {
  try {
    return new URL(val)
  } catch (err) {
    // not a valid URL
  }
}

function isURL(val) {
  try {
    // Should be a URL but cannot be an IP address
    return makeUrl(val) && !isValidIp(val)
  } catch (err) {
    return false
  }
}

function areUrisEqual(url1, url2) {
  return ['protocol', 'port', 'hostname'].every(prop => url1[prop] === url2[prop]) ||
    ((url1.protocol == null || url1.protocol === 'localhost') && url1.href === url2.host)
}

function compareUris(val1, val2) {
  const a = makeUrl(val1)
  const b = makeUrl(val2)
  return a && b && areUrisEqual(a, b)
}

function createListValidators(list = []) {
  return list.map(host => {
    if (isCidr(host)) {
      return {
        host,
        type: 'range',
        validate: val2 => inRange(val2, host)
      }
    } else if (isValidIp(host)) {
      return {
        host,
        type: 'ip',
        validate: val2 => areEqualIps(host, val2)
      }
    } else if (host) {
      return {
        host,
        type: 'domain',
        validate: val2 => compareUris(host, val2)
      }
    }
    return {}
  }).filter(f => f.type)
}

function parseList(val) {
  const list = String(val).replace(/"/g, '').split('|')
  return createListValidators(list)
}

function parseHeaders(req) {
  return ['origin', 'x-forwarded-for'].map(h => req.headers[h])
}

function getAcceptableHeaders(headers) {
  return headers.filter(s => isValidIp(s) || isLocalhost(s) || isURL(s))
}

function getDomainList(LIST = '') {
  const whitelist = parseList(LIST)

  function ipIsInWhitelist(value) {
    return whitelist.filter(w => ['range', 'ip'].includes(w.type)).some(s => s.validate(value))
  }

  function isSameDomain(value) {
    return whitelist.filter(w => w.type === 'domain').some(s => s.validate(value))
  }

  function isInDomainOrIP(val) {
    return (isSameDomain(val) && (isLocalhost(val) || isURL(val))) ||
      (isValidIp(val) && (isLocalHostIP(val) || ipIsInWhitelist(val)))
  }

  return isInDomainOrIP
}

module.exports = {
  getAcceptableHeaders,
  getDomainList,
  parseHeaders
}
