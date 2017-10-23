const {isNotNil} = require('ramda-adjunct')
const {any, compose, takeWhile} = require('ramda')
const {acceptableHeaders, getDomainList, parseHeaders} = require('./patterns')

const getMatchingCORS = (LIST) => {
    const isInDomainOrIP = getDomainList(LIST)
    return compose(
        any(isInDomainOrIP),
        acceptableHeaders,
        parseHeaders
    )
}

const blacklistMiddleware = (BLACKLIST) => {
    const failingCORS = getMatchingCORS(BLACKLIST)
    return (req, callback) => {
        if (failingCORS(req)) {
            return callback(
                new Error(`${takeWhile(isNotNil, parseHeaders(req))[0] || ''} Not Allowed Access`)
            )
        }
        
        return callback(null, {origin: true})
    }
}
const whitelistMiddleware = (WHITELIST) => {
    const passingCORS = getMatchingCORS(WHITELIST)
    return (req, callback) => {
        if (!passingCORS(req)) {
            return callback(
                new Error(`${takeWhile(isNotNil, parseHeaders(req))[0] || ''} Not Allowed Access`)
            )
        }
        
        return callback(null, {origin: true})
    }
}

module.exports = {
    blacklistMiddleware,
    whitelistMiddleware
}
