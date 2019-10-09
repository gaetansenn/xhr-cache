import path from 'path'
import rimraf from 'rimraf'

import { isFunction, get, store, libPrefix } from './library'

const refreshResources = []

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

function handleRefresh (store, name, maxAge) {
  const intervalId = setInterval(() => {
    store()
  }, maxAge)

  const stop = function () {
    clearInterval(intervalId)

    const refreshResourceIndex = refreshResources.findIndex(resource => resource === name)

    if (refreshResourceIndex !== -1) refreshResources.splice(refreshResourceIndex, 1)
  }

  this.nuxt.hook('close', () => stop)

  // Avoid adding hook for dev as build is called on each save of files
  if (this.options.dev === false) this.nuxt.hook('build:done', stop)

  refreshResources.push(name)
}

module.exports = async function () {
  // Set default path into static directory
  defaultsConfig.path = path.join(this.nuxt.options.srcDir, this.nuxt.options.dir.static, defaultsConfig.rootFolder)

  const conf = Object.assign(defaultsConfig, this.options.xhrCache)

  // Clean directory cache
  if (conf.clean) rimraf.sync(conf.path)

  await Promise.all(conf.resources.map(async (resource) => {
    const maxAge = (resource.maxAge === false) ? false : (resource.maxAge || conf.maxAge)

    const storeFnc = async (_path, ctx) => {
      let _request = resource.request

      _path = path.join('/', conf.path, _path)

      if (isFunction(_request)) _request = _request(ctx)

      const method = store.bind(this, resource.name, _path, _request)

      const content = await method()

      if (maxAge && !refreshResources.includes(resource.name)) handleRefresh.call(this, method, resource.name, maxAge)

      return content
    }

    const getFnc = (_path) => {
      return get(path.join(conf.path, _path))
    }

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
}
