import { join, resolve } from 'path'
import rimraf from 'rimraf'
import { match } from 'path-to-regexp'
import uuid from 'uuid-apikey'

import { isFunction, get, store, libPrefix } from './library'

// Refresh informations
const resources = []

const defaultsConfig = {
  rootFolder: 'cache',
  rootUrl: 'xhr-cache',
  maxAge: 3600 * 1000,
  clean: true
}

function defaultMiddleware (conf, resource, { get, store }) {
  const path = join(conf.rootUrl, resource.name)
  /* eslint-disable-next-line */
  console.info(`${libPrefix} Serve '${resource.name}' resource to ${`${conf.serverUrl}/${join(path)}`}`)

  return {
    path,
    async handler (req, res) {
      try {
        let content = get()

        if (!content) { content = await store() }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(content))
      } catch (err) {
        res.writeHead(503, err)
        res.end()
      }
    }
  }
}

function refreshMiddeware (conf) {
  return {
    path: join(conf.rootUrl, 'refresh'),
    async handler (req, res) {
      /* Use fake hostname as URL method will throw an error */
      const apiKey = (new URL(join('http://test.com', req.originalUrl))).searchParams.get('apiKey')

      if (!apiKey) {
        res.writeHead(400, `${libPrefix} apiKey query not found`)
        res.end()
      } else if (apiKey && apiKey !== conf.apiKey) {
        res.writeHead(400, `${libPrefix} wrong apiKey`)
        res.end()
      } else {
        const id = (req.url || '').replace('/', '').replace(`?apiKey=${apiKey}`, '')
        const resource = resources.find(resource => resource.id === id)

        if (!resource) {
          res.writeHead(404, `${libPrefix} Resource not found`)
          res.end()
        } else if (resource.ongoing) {
          res.writeHead(409, `${libPrefix} Resource already ongoing`)
          res.end()
        } else {
          /* eslint-disable-next-line */
          console.info(`${libPrefix} Force refresh for identifier '${id}'`)

          resource.ongoing = true
          res.end()
          await resource.store()
          /* eslint-disable-next-line */
          console.info(`${libPrefix} Refresh for identifier '${id}' done`)
          resource.ongoing = false
        }
      }
    }
  }
}

function resourcesList (conf) {
  return {
    path: join(conf.rootUrl, 'resources'),
    handler (req, res) {
      /* Use fake hostname as URL method will throw an error */
      const apiKey = (new URL(join('http://test.com', req.originalUrl))).searchParams.get('apiKey')

      if (!apiKey) {
        res.writeHead(400, `${libPrefix} apiKey query not found`)
        res.end()
      } else if (apiKey && apiKey !== conf.apiKey) {
        res.writeHead(400, `${libPrefix} wrong apiKey`)
        res.end()
      } else {
        res.end(JSON.stringify(resources.filter(resource => resource.id).map((resource) => {
          const mapped = {
            name: resource.name || resource.parent.name,
            id: resource.id,
            path: resource.middleware ? resource.middleware.path : resource.parent.middleware.path,
            active: resource.active
          }

          if (resource.active) { mapped.content = resource.get() }

          return mapped
        })))
      }
    }
  }
}

/* Get resource by id */
function getResource (conf) {
  return {
    path: join(conf.rootUrl, 'resource'),
    async handler (req, res) {
      const id = (req.url || '').replace('/', '')
      const resource = resources.find(resource => resource.id === id)

      if (!resource) {
        res.writeHead(404, `${libPrefix} Unable to find resource with identifier '${id}'`)
        res.end()
      } else {
        const content = await resource.get()

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(content))
      }
    }
  }
}

function handleRefresh (store, id, maxAge, name, conf, response) {
  const resource = resources.find(resource => resource.id === id)

  // Avoid subscribe to refresh if already active
  if (resource.active) { return false } else { resource.active = true }
  /* eslint-disable-next-line */
  console.info(`${libPrefix} Refresh url for '${name}' with id '${id}' is available at ${`${conf.serverUrl}/${join(conf.rootUrl, 'refresh', id)}?apiKey=${conf.apiKey}`}`)

  const refresh = (response) => {
    const _maxAge = isFunction(maxAge) ? maxAge(response) : maxAge

    resource.refresh = resource.refresh || {}
    resource.refresh.maxAge = _maxAge

    const stop = function (logger = true) {
      clearInterval(resource.refresh.intervalId)

      const refreshResourceIndex = resources.findIndex(resource => resource.id === id)

      if (refreshResourceIndex !== -1) {
        resource.refresh.intervalId = false
        /* eslint-disable-next-line */
        if (logger) console.info(`${libPrefix} Stop auto refresh for '${name} with id '${id}'`)
      }
    }

    this.nuxt.hook('close', stop)

    // Avoid adding hook for dev as build is called on each save of files
    if (this.options.dev === false && this.options.test !== true) { this.nuxt.hook('build:done', stop) }

    // Bind refresh
    resource.refresh.intervalId = setInterval(async () => {
      const response = await store()

      // Update refresh if maxAge changed
      if (isFunction(maxAge)) {
        if (resource.refresh.maxAge !== maxAge(response)) {
          /* eslint-disable-next-line */
          console.info(`${libPrefix} Update auto refresh for '${name} with id '${id}' from ${resource.refresh.maxAge}ms to ${maxAge(response)}ms`)
          stop(false)
          refresh(response)
        }
      }
    }, _maxAge)
  }

  if (maxAge) { refresh(response) }
}

function registerResource ({ store, get, id, ctx, name }) {
  const resource = resources.find(resource => resource.id === id)

  if (resource) { return false }

  const parent = resources.find(resource => resource.name === name)

  const _resource = {
    id,
    get,
    store,
    parent
  }

  resources.push(_resource)

  /* eslint-disable-next-line */
  console.info(`${libPrefix} Resource '${name}' with context ${JSON.stringify(ctx)} got '${id}' identifier`)
}

function generateId (name, identifier) {
  // Generate unique identifier
  if (!identifier) { return name }

  return `${name}-${identifier}`
}

module.exports = async function xhrCache () {
  const buildProcess = this.options._build !== undefined && this.options.dev === false
  // Set default path into static directory
  defaultsConfig.path = join(this.nuxt.options.srcDir, defaultsConfig.rootFolder)

  const conf = Object.assign(defaultsConfig, this.options.xhrCache)

  conf.serverUrl = `http${this.options.server.https ? 's' : ''}://${this.options.server.host}:${this.options.server.port}`

  if (!conf.apiKey) { conf.apiKey = uuid.create().apiKey }

  /* eslint-disable-next-line */
  if (!buildProcess) console.info(`${libPrefix} Register apiKey ${conf.apiKey}`)

  // Clean directory cache
  if (!buildProcess && conf.clean) { rimraf.sync(conf.path) }

  await Promise.all(conf.resources.map(async (resource) => {
    const maxAge = (resource.maxAge === false) ? false : (resource.maxAge || conf.maxAge)
    // Bind get method with conf path
    const getFnc = path => get(join(conf.path, path))
    // Bind store method
    // path: The final file name stored
    // ctx: Injected to request if method
    // identifier: Used for custom middleware for identification
    const storeFnc = async ({ path, ctx, identifier }) => {
      let request = resource.request

      const getMethod = getFnc.bind(this, path)

      path = join(conf.path, path)

      if (isFunction(request)) { request = request(ctx) }

      const storeMethod = store.bind(this, resource.name, path, request)

      const content = await storeMethod()

      // Generate unique identifier used for refresh method
      const id = generateId(resource.name, identifier)

      if (resource.middleware) { registerResource({ store: storeMethod, get: getMethod, id, ctx, name: resource.name, maxAge }) }

      handleRefresh.call(this, storeMethod, id, maxAge, resource.name, conf, content)

      return content.data
    }

    const context = { get: getFnc, store: storeFnc }

    if (resource.middleware) {
      const path = join(conf.rootUrl, resource.middleware.path)

      resources.push({
        name: resource.name,
        ...context,
        middleware: Object.assign({}, resource.middleware, {
          path
        })
      })

      // Init custom resource if provided
      if (!buildProcess && isFunction(resource.init)) { await resource.init(context) }

      const middleware = async (req, res, next) => {
        // eslint-disable-next-line no-useless-escape
        const matchResult = match(`/${path.replace(/\\(?![^\(]*\))/g, '/')}`, { decode: decodeURIComponent })(join(req.url).replace(/\\(?![^\(]*\))/g, '/'))

        if (!matchResult) { next() } else {
          try {
            const response = await resource.middleware.handler(matchResult.params || {}, context)

            res.end(JSON.stringify(response))
          } catch (err) {
            res.writeHead(503)
            res.end()
          }
        }
      }

      if (!buildProcess) {
        /* eslint-disable-next-line */
      console.info(`${libPrefix} Serve custom '${resource.name}' resource to ${`${conf.serverUrl}/${join(path)}`}`)
        this.addServerMiddleware(middleware)
      }
    } else {
      // Bind default path to get and store method
      context.store = context.store.bind(this, { path: join(`${resource.name}.json`) })
      context.get = context.get.bind(this, join(`${resource.name}.json`))
      const id = generateId(resource.name)

      // Inject default middleware
      if (!buildProcess) { this.addServerMiddleware(defaultMiddleware(conf, resource, context)) }

      resources.push({
        name: resource.name,
        id,
        ...context,
        middleware: {
          path: join(conf.rootUrl, resource.name)
        }
      })

      /* eslint-disable-next-line */
      console.info(`${libPrefix} Resource '${resource.name}' got '${id}' identifier`)

      if (resource.init === true) { await context.store() }
    }
  }))

  if (!buildProcess) {
  // Inject resources list
    this.addServerMiddleware(resourcesList(conf))
    // Inject refresh middleware
    this.addServerMiddleware(refreshMiddeware(conf))
    // Inject resource route
    this.addServerMiddleware(getResource(conf))

    // Inject helper to requests
    this.addServerMiddleware((req, res, next) => {
      req.xhrCache = {
        resources,
        apiKey: conf.apiKey
      }

      next()
    })
  }

  // Inject plugin
  this.addPlugin({
    src: resolve(__dirname, 'plugin.js'),
    fileName: 'xhr-cache/plugin.js',
    options: {
      config: JSON.stringify({
        rootUrl: conf.rootUrl,
        rootFolder: conf.rootFolder,
        serverUrl: conf.serverUrl
      }),
      resources: JSON.stringify(resources.map(resource => ({
        id: resource.id
      })))
    }
  })

  // Extend xhrCache with plugins
  if (conf.plugins) {
    conf.plugins.forEach(p => this.options.plugins.push(p))
    delete conf.plugins
  }
}
