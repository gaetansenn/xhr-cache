import path from 'path'
import rimraf from 'rimraf'

import { isFunction, get, store, libPrefix } from './library'

// Refresh informations
const resources = []

const defaultsConfig = {
  rootFolder: 'cache',
  rootUrl: 'static',
  maxAge: 3600 * 1000,
  clean: true
}

function defaultMiddleware (conf, resource, { get, store }) {
  const file = `${resource.name}.json`

  const middleware = {
    path: path.join(conf.rootUrl, file),
    async handler (req, res) {
      let content = get(file)

      if (!content) content = await store(file)

      res.end(JSON.stringify(content))
    }
  }

  /* eslint-disable-next-line */
  console.info(`${libPrefix} Serve ${resource.name} resource to ${middleware.path}`)

  return middleware
}

function refreshMiddeware (conf) {
  return {
    path: path.join(conf.rootUrl, '/cache/refresh'),
    async handler (req, res) {
      const id = (req.url || '').replace('/', '')
      const resource = resources.find(resource => resource.id === id)

      if (!resource) res.end(`${libPrefix} Unable to find identifier ${id} for refresh`)
      else if (resource.ongoing) {
        res.statusCode = 400
        res.end(`${libPrefix} Refresh for identifier ${id} already in progress...`)
      } else {
        const id = req.url.replace('/', '')
        /* eslint-disable-next-line */
        console.info(`${libPrefix} Force refresh for identifier ${id}`)
        res.end(`${libPrefix} Force refresh for identifier ${id} executed`)

        // Clean resource
        resource.ongoing = true
        await resource.store()
        resource.ongoing = false
      }
    }
  }
}

function handleRefresh (store, id, maxAge, resource, conf) {
  // Avoid subscribe to refresh if already active
  if (resources.find(resource => resource.id === id)) return false

  // eslint-disable-next-line
  console.info(`${libPrefix} Refresh url for ${resource.name} with id ${id} is available at ${path.join(conf.rootUrl, '/cache/refresh/', id)}`)

  resources.push({ id, store })

  if (maxAge) {
    const intervalId = setInterval(store, maxAge)

    const stop = function () {
      clearInterval(intervalId)

      const refreshResourceIndex = resources.findIndex(resource => resource.id === id)

      if (refreshResourceIndex !== -1) resources.splice(refreshResourceIndex, 1)
    }

    this.nuxt.hook('close', () => stop)

    // Avoid adding hook for dev as build is called on each save of files
    if (this.options.dev === false) this.nuxt.hook('build:done', stop)
  }
}

function generateId (name, identifier) {
  // Generate unique identifier
  if (!identifier) return name

  return `${name}-${identifier}`
}

module.exports = async function xhrCache () {
  // Set default path into static directory
  defaultsConfig.path = path.join(this.nuxt.options.srcDir, this.nuxt.options.dir.static, defaultsConfig.rootFolder)

  const conf = Object.assign(defaultsConfig, this.options.xhrCache)

  // Clean directory cache
  if (conf.clean) rimraf.sync(conf.path)

  await Promise.all(conf.resources.map(async (resource) => {
      const maxAge = (resource.maxAge === false) ? false : (resource.maxAge || conf.maxAge)
      const storeFnc = async (_path, ctx, identifier) => {
        let _request = resource.request

        _path = path.join('/', conf.path, _path)

        if (isFunction(_request)) _request = _request(ctx)

        const method = store.bind(this, resource.name, _path, _request)
        const content = await method()
        // Generate unique identifier used for refresh method
        const id = generateId(resource.name, identifier)

        handleRefresh.call(this, method, id, maxAge, resource, conf)

        return content
      }

      const getFnc = (_path) => get(path.join(conf.path, _path))
      const context = { get: getFnc, store: storeFnc }

      // Inject middleware
      if (!resource.middleware) this.addServerMiddleware(defaultMiddleware(conf, resource, context))
      else {
        const middleware = {
          path: path.join(conf.rootUrl, resource.middleware.path),
          handler: (req, res) => {
            resource.middleware.handler(req, res, context)
          }
        }

      /* eslint-disable-next-line */
      console.info(`${libPrefix} Serve ${resource.name} resource to ${middleware.path}`)
      this.addServerMiddleware(middleware)
      }

      // Handle init fetch
      if (isFunction(resource.init)) await resource.init(context)
      else if (resource.init) await storeFnc(path.join(`${resource.name}.json`))
  }))

  // Inject refresh middleware
  this.addServerMiddleware(refreshMiddeware(conf))
}
