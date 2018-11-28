const {
  parseHeaders,
  getDomainList,
  getAcceptableHeaders
} = require('./patterns')

function getMatchingCORS(LIST) {
  const isInDomainOrIP = getDomainList(LIST)

  function isPassingOrFailing(req) {
    const headersArr = parseHeaders(req)
    const filteredHeaders = getAcceptableHeaders(headersArr)
    return filteredHeaders.some(header => isInDomainOrIP(header))
  }

  return isPassingOrFailing
}

function createBlacklistMiddleware(BLACKLIST) {
  const failingCORS = getMatchingCORS(BLACKLIST)

  function blacklistMiddleware(req, callback) {
    if (failingCORS(req)) {
      const [header] = parseHeaders(req)
      return callback(new Error(`${header || ''} Not Allowed Access`))
    }

    return callback(null, { origin: true })
  }

  return blacklistMiddleware
}

function createWhitelistMiddleware(WHITELIST) {
  const passingCORS = getMatchingCORS(WHITELIST)

  function whitelistMiddleware(req, callback) {
    if (!passingCORS(req)) {
      const [header] = parseHeaders(req)
      return callback(new Error(`${header || ''} Not Allowed Access`))
    }

    return callback(null, { origin: true })
  }

  return whitelistMiddleware
}

module.exports = {
  createBlacklistMiddleware,
  createWhitelistMiddleware
}
