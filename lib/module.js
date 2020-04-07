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
  console.info(`${libPrefix} Serve '${resource.name}' resource to ${join(conf.serverUrl, path)}`)

  return {
    path,
    async handler (req, res) {
      try {
        let content = get()

        if (!content) { content = await store() }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(content))
      } catch (err) {
        res.writeHead(503)
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
          res.writeHead(202)
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
    path: join(conf.rootUrl, 'resources/list'),
    handler (req, res) {
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

function handleRefresh (store, id, maxAge, name, conf) {
  const resource = resources.find(resource => resource.id === id)

  // Avoid subscribe to refresh if already active
  if (resource.active) { return false } else { resource.active = true }

  /* eslint-disable-next-line */
  console.info(`${libPrefix} Refresh url for '${name}' with id '${id}' is available at ${join(conf.serverUrl, conf.rootUrl, 'refresh', id)}?apiKey=${conf.apiKey}`)

  if (maxAge) {
    const intervalId = setInterval(store, maxAge)

    const stop = function () {
      clearInterval(intervalId)

      const refreshResourceIndex = resources.findIndex(resource => resource.id === id)

      if (refreshResourceIndex !== -1) { resources.splice(refreshResourceIndex, 1) }
    }

    this.nuxt.hook('close', () => stop)

    // Avoid adding hook for dev as build is called on each save of files
    if (this.options.dev === false) { this.nuxt.hook('build:done', stop) }
  }
}

function registerResource ({ store, get, id, ctx, name }) {
  const resource = resources.find(resource => resource.id === id)

  if (resource) { return false }

  const parent = resources.find(resource => resource.name === name)

  resources.push({
    id,
    get,
    store,
    parent
  })

  /* eslint-disable-next-line */
  console.info(`${libPrefix} Resource '${name}' with context ${JSON.stringify(ctx)} got '${id}' identifier`)
}

function generateId (name, identifier) {
  // Generate unique identifier
  if (!identifier) { return name }

  return `${name}-${identifier}`
}

module.exports = async function xhrCache () {
  // Set default path into static directory
  defaultsConfig.path = join(this.nuxt.options.srcDir, defaultsConfig.rootFolder)

  const conf = Object.assign(defaultsConfig, this.options.xhrCache)

  conf.serverUrl = `http${this.options.server.https ? 's' : ''}://${this.options.server.host}:${this.options.server.port}`

  if (!conf.apiKey) { conf.apiKey = uuid.create().apiKey }

  /* eslint-disable-next-line */
  console.info(`${libPrefix} Register apiKey ${conf.apiKey}`)

  // Clean directory cache
  if (conf.clean) { rimraf.sync(conf.path) }

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

      path = join('/', conf.path, path)

      if (isFunction(request)) { request = request(ctx) }

      const storeMethod = store.bind(this, resource.name, path, request)

      const content = await storeMethod()

      // Generate unique identifier used for refresh method
      const id = generateId(resource.name, identifier)

      if (resource.middleware) { registerResource({ store: storeMethod, get: getMethod, id, ctx, name: resource.name }) }

      handleRefresh.call(this, storeMethod, id, maxAge, resource.name, conf)

      return content
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
      if (isFunction(resource.init)) { await resource.init(context) }

      const middleware = async (req, res, next) => {
        const matchResult = match(`/${path}`, { decode: decodeURIComponent })(req.url)

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

      /* eslint-disable-next-line */
      console.info(`${libPrefix} Serve custom '${resource.name}' resource to ${join(conf.serverUrl, path)}`)
      this.addServerMiddleware(middleware)
    } else {
      // Bind default path to get and store method
      context.store = context.store.bind(this, { path: join(`${resource.name}.json`) })
      context.get = context.get.bind(this, join(`${resource.name}.json`))
      const id = generateId(resource.name)

      // Inject default middleware
      this.addServerMiddleware(defaultMiddleware(conf, resource, context))

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

  // Inject plugin
  this.addPlugin({
    src: resolve(__dirname, 'plugin.js'),
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
}
