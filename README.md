# Cors Helper

This piece of ExpressJs middleware exists to make it easier to configure CORS settings in a NodeJs app with either a list of blocked or allowed IPs/URLs/Domains.

## Installation

```bash
npm install cors-helper
```

## Usage

A somewhat standard Express app would setup some key pieces of middleware ([body-parser](https://www.npmjs.com/package/body-parser), [compression](https://www.npmjs.com/package/compression), [helmet](https://www.npmjs.com/package/helmet), etc), but rather than using [cors](https://www.npmjs.com/package/cors) middleware out-of-the-box (by default `cors()` will allow _everything_!), instead [you can pass it a function to dynamically handle origins](https://www.npmjs.com/package/cors#configuring-cors-w-dynamic-origin). This `cors-helper` package provides you two factory functions that will create that function for you (depending on whether you want to block or allow certain IPs/URLs/Domains).

```javascript
const cors = require('cors')
const helmet = require('helmet')
const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const { createBlockedListMiddleware } = require('cors-helper')

// An array of strings representing all the sites you DON'T want to allow
const listOfBadSites = require('./blacklist.json')

const corsOptions = createBlockedListMiddleware(listOfBadSites)

const port = process.env.PORT || 5000

express()
  .use(bodyParser.json({ limit: '4mb' }))
  .use(bodyParser.urlencoded({ extended: true }))
  .use(compression)
  .use(cors(corsOptions))
  .use(helmet)
  .listen(port, () => console.log(`app is now listening on port ${port}`))
```

## API

This package exports two named factory functions that take a list of IPs, URLs, and/or Domains that you will be able to allow or block when your `cors` middleware is set up.

* `allowCrossDomainMiddleware` - A common piece of middleware that is used (mostly) for local development to completely turn off cors validation by setting certain headers (not typically used in production)
* `createBlockedListMiddleware` - A function that takes an `Array` of (`String`) values that represent the IPs, URLs, and/or Domains to _reject_ (everything else will be allowed)
* `createAllowedListMiddleware` - A function that takes an `Array` of (`String`) values that represent the IPs, URLs, and/or Domains to _allow_ (everything else will be rejected)
