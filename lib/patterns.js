const {isEqual} = require('ip')
const {IPv4, IPv6} = require('ipaddr.js')
const {
    __,
    allPass,
    and,
    anyPass,
    complement,
    compose,
    curry,
    equals,
    is,
    isNil,
    F,
    or,
    replace,
    split,
    toString,
    tryCatch
} = require('ramda')
const {isNotEmpty} = require('ramda-adjunct')
const {isRange, inRange} = require('range_check')
const url = require('url')
const validator = require('validator')

const isLocalhost = str => /^(http:\/\/)?(localhost)(?:(:\d|\/)|$)/i.test(str)
const areEqual = tryCatch(isEqual, F)
const isLocalHostIP = anyPass([
    curry(areEqual)('127.0.0.1'),
    curry(areEqual)('::1')
])
const isCidr = allPass([
    is(String),
    isNotEmpty,
    s => isRange(s)
])
const isValidIp = allPass([
    is(String),
    isNotEmpty,
    anyPass([
        s => IPv4.isValid(s),
        s => IPv6.isValid(s)
    ])
])
const isURL = allPass([
    is(String),
    str => validator.isURL(str),
    complement(isValidIp)
])
const areUrisEqual = ([a, b]) => or(
    and(
        or(isNil(a.protocol), equals('localhost:', a.protocol)),
        equals(a.href, b.host)
    ),
    ['protocol', 'port', 'hostname'].every(prop => a[prop] === b[prop])
)
const compareUris = compose(
    areUrisEqual,
    (a, b) => [url.parse(a), url.parse(b)]
)

const createListValidators = (list = []) =>
    list.map((host) => {
        if (isCidr(host)) {
            return {
                host,
                type: 'range',
                validate: curry(inRange)(__, host)
            }
        } else if (isValidIp(host)) {
            return {
                host,
                type: 'ip',
                validate: curry(areEqual)(host)
            }
        } else if (host) {
            return {
                host,
                type: 'domain',
                validate: curry(compareUris)(host)
            }
        }
        return {}
    }).filter(f => f.type)

const parseList = compose(
    createListValidators,
    split('|'),
    replace(/"/g, ''),
    toString
)

const parseHeaders = req =>
    ['origin', 'x-forwarded-for'].map(h => req.headers[h])
const acceptableHeaders = headers =>
    headers.filter(s => isValidIp(s) || isLocalhost(s) || isURL(s))

const getDomainList = (LIST = '') => {
    const whitelist = parseList(LIST)
    const ipIsInWhitelist = value =>
        whitelist.filter(w => ['range', 'ip'].includes(w.type)).some(s => s.validate(value))
    const isSameDomain = value =>
        whitelist.filter(w => w.type === 'domain').some(s => s.validate(value))

    return anyPass([
        allPass([
            anyPass([isLocalHostIP, ipIsInWhitelist]),
            isValidIp
        ]),
        allPass([
            anyPass([isLocalhost, isURL]),
            isSameDomain
        ])
    ])
}

module.exports = {
    acceptableHeaders,
    getDomainList,
    parseHeaders
}
