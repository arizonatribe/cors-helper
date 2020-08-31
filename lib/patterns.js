const ip = require("ip")
const { URL } = require("url")
const { IPv4, IPv6 } = require("ipaddr.js")
const { isRange, inRange } = require("range_check")

/**
 * Checks if a given value corresponds to one of the normal localhost URL/domain/IP patterns
 * (ie, 'localhost', '::1', '127.0.0.1')
 *
 * @function
 * @name isLocalhost
 *
 * @param val
 * @returns {boolean} Whether or not the provided value corresponds to one of the normal localhost URL/domain/IP patterns
 */
function isLocalhost(val) {
  return val === "::1"
    || /^(http:\/\/)?(127\.0\.0\.1)$/i.test(val)
    || /^(http:\/\/)?(localhost)$/i.test(val)
}

/**
 * Checks whether or not two IPs are the same (regardless of protocol prefix being missing on one or the other)
 *
 * @function
 * @name areEqualIps
 * @param {string} val1 The first IP to check
 * @param {string} val2 The second IP to check
 * @returns {boolean} Whether or not the two values are equal _and_ are IPs
 */
function areEqualIps(val1, val2) {
  try {
    return ip.isEqual(val1, val2)
  } catch (err) {
    return false
  }
}

function isLocalHostIP(val) {
  return areEqualIps("127.0.0.1", val) || areEqualIps("::1", val)
}

function isCidr(val) {
  return typeof val === "string" && val && isRange(val)
}

function isValidIp(val) {
  return typeof val === "string" && val && (IPv4.isValid(val) || IPv6.isValid(val))
}

// eslint-disable-next-line consistent-return
function makeUrl(val) {
  try {
    if (/^localhost/i.test(val)) {
      return new URL(`http://${val}`)
    }
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
  return ["protocol", "port", "hostname"].every(prop => url1[prop] === url2[prop])
}

function compareUris(val1, val2) {
  const a = makeUrl(val1)
  const b = makeUrl(val2)
  return a && b && areUrisEqual(a, b)
}

function createListValidators(list = []) {
  return list.filter(Boolean).map(host => {
    if (isCidr(host)) {
      return {
        host,
        type: "range",
        validate: val2 => inRange(val2, host)
      }
    } else if (isValidIp(host)) {
      return {
        host,
        type: "ip",
        validate: val2 => areEqualIps(host, val2)
      }
    } else if (host) {
      return {
        host,
        type: "domain",
        validate: val2 => compareUris(host, val2)
      }
    }
    return {}
  }).filter(f => f.type)
}

function parseList(val) {
  return createListValidators(
    Array.isArray(val)
      ? val
      : String(val || "").trim().replace(/"/g, "").split("|")
  )
}

function parseHeaders(req) {
  return [
    req.headers.host,
    req.headers.origin,
    req.headers["x-forwarded-for"],
    req.socket && req.socket.remoteAddress
  ].filter(Boolean)
}

function getAcceptableHeaders(headers) {
  return headers.filter(s => isValidIp(s) || isLocalhost(s) || isURL(s))
}

function getDomainList(LIST = "") {
  const allowedList = parseList(LIST)

  function ipIsInWhitelist(value) {
    return allowedList.filter(w => ["range", "ip"].includes(w.type)).some(s => s.validate(value))
  }

  function isSameDomain(value) {
    return allowedList.filter(w => w.type === "domain").some(s => s.validate(value))
  }

  function isInDomainOrIP(val) {
    return (isSameDomain(val) && (isLocalhost(val) || isURL(val))) ||
      (isValidIp(val) && (isLocalHostIP(val) || ipIsInWhitelist(val)))
  }

  return isInDomainOrIP
}

module.exports = {
  isLocalhost,
  isLocalHostIP,
  isCidr,
  isValidIp,
  makeUrl,
  isURL,
  getAcceptableHeaders,
  getDomainList,
  parseHeaders
}
