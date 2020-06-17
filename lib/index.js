const {
  isURL,
  isCidr,
  makeUrl,
  isValidIp,
  isLocalhost,
  isLocalHostIP,
  parseHeaders,
  getDomainList,
  getAcceptableHeaders
} = require("./patterns")

/**
 * Creates a validator function that will (as a piece of Express/connect middleware) examine the inbound request and determine if the request's origin is one that should be blocked or allowed
 *
 * @function
 * @name getMatchingCORS
 * @param {string[]|string} LIST A list of URLs, IPs, or Domains to block/allow
 * @returns {function} A function which will examine the Express/connect middleware request object and determine if the request should be blocked or allowed
 */
function getMatchingCORS(LIST) {
  const isInDomainOrIP = getDomainList(LIST)

  /**
   * An inner function which parses the headers from a given request and applies the block/allow logic to certain reserved headers
   *
   * @function
   * @name isPassingOrFailing
   * @private
   * @param {Object<string, any>} req The HTTP/HTTPS request coerced into a schema specific to express/connect middleware
   * @returns {boolean} Whether or not the request headers identify it as a blocked or allowed domain/IP/URL
   */
  function isPassingOrFailing(req) {
    const headersArr = parseHeaders(req)
    const filteredHeaders = getAcceptableHeaders(headersArr)
    return filteredHeaders.some(header => isInDomainOrIP(header))
  }

  return isPassingOrFailing
}

/**
 * Creates CORS middleware which will _block_ any IP/Domain/URL in the provided list.
 *
 * @function
 * @name createBlockedListMiddleware
 * @param {string|string[]} BLOCKLIST A list of IPs, Domains, and/or URLs to block
 * @returns {function} A piece of Express/connect middleware ready to be passed into the [cors](https://www.npmjs.com/package/cors) factory function, instead of a string
 */
function createBlockedListMiddleware(BLOCKLIST) {
  const failingCORS = getMatchingCORS(BLOCKLIST)

  function blockedListMiddleware(req, callback) {
    if (failingCORS(req)) {
      const [header] = parseHeaders(req)
      return callback(new Error(`${header || ""} Not Allowed Access`))
    }

    return callback(null, { origin: true })
  }

  return blockedListMiddleware
}

/**
 * Creates CORS middleware which will _allow_ any IP/Domain/URL in the provided list.
 *
 * @function
 * @name createAllowedListMiddleware
 * @param {string|string[]} ALLOWLIST A list of IPs, Domains, and/or URLs to allow
 * @returns {function} A piece of Express/connect middleware ready to be passed into the [cors](https://www.npmjs.com/package/cors) factory function, instead of a string
 */
function createAllowedListMiddleware(ALLOWLIST) {
  const passingCORS = getMatchingCORS(ALLOWLIST)

  function allowedListMiddleware(req, callback) {
    if (!passingCORS(req)) {
      const [header] = parseHeaders(req)
      return callback(new Error(`${header || ""} Not Allowed Access`))
    }

    return callback(null, { origin: true })
  }

  return allowedListMiddleware
}

/**
 * A piece of middleware which will allow inbound requests from _any_ source regardless of its origin.
 * This should only be used in local development or in cases where there is 100% guarantee that the source is trusted
 * (due to where the API sits in your infrastructure, most likely).
 *
 * @function
 * @name allowCrossDomainMiddleware
 * @param {function} res.header A function which expects the name of the header and the value to be set (respectively)
 * @param {function} next The reserved Express/connect middleware helper function which pushes execution forward (or triggers your error handler if you pass it an `Error` instance)
 */
function allowCrossDomainMiddleware(_, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE")
  res.header("Access-Control-Allow-Headers", "Content-Type")
  next()
}

module.exports = {
  isURL,
  isCidr,
  makeUrl,
  isValidIp,
  isLocalhost,
  isLocalHostIP,
  parseHeaders,
  allowCrossDomainMiddleware,
  createBlockedListMiddleware,
  createAllowedListMiddleware
}
