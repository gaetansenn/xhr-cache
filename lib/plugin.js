export const libPrefix = '[xhr-cache]'

async function makeRequest (url, refresh) {
  const response = await fetch(url)

  if (response.ok) { return (refresh) ? response : response.json() }

  if (refresh) { throw new Error(response.status === 404 ? `${libPrefix} Resource not found` : `${libPrefix} Refresh already in progress`) } else { throw new Error(`${libPrefix} Resource with url ${url} not found`) }
}

export default (ctx, inject) => {
  const config = JSON.parse('<%= options.config %>')
  const resources = process.server ? ctx.ssrContext.req.xhrCache.resources : JSON.parse('<%= options.resources %>')

  const xhrCache = {
    getResourceById: (resourceId) => {
      const resource = resources.find(resource => resource.id === resourceId)

      if (process.server) {
        if (!resource) { throw new Error(`${libPrefix} Resource with id ${resourceId} not found`) }

        // We get file from file system as we are on server side
        return Promise.resolve(resource.active ? resource.get() : resource.store())
      }

      return makeRequest(`/${config.rootUrl}/resource/${resourceId}`)
    },
    getResourceByUrl: (resourceUrl) => {
      // Clean duplicate `/`
      resourceUrl = (resourceUrl[0] === '/') ? resourceUrl.substring(1) : resourceUrl

      if (process.server) {
        const { match } = require('path-to-regexp')
        const { join } = require('path')

        // eslint-disable-next-line no-useless-escape
        const regex = /\\(?![^\(]*\))/g
        const resource = resources.find(resource =>
          resource.middleware && match(resource.middleware.path.replace(regex, '/'), { decode: decodeURIComponent })(join(config.rootUrl, resourceUrl).replace(regex, '/'))
        )

        if (!resource) { throw new Error(`${libPrefix} Resource url ${resourceUrl} not found`) }

        const matchResult = match(resource.middleware.path.replace(regex, '/'), { decode: decodeURIComponent })(join(config.rootUrl, resourceUrl).replace(regex, '/'))

        if (resource) { return Promise.resolve(resource.middleware.handler(matchResult.params, { get: resource.get, store: resource.store })) }
      } else { return makeRequest(`/${config.rootUrl}/${resourceUrl}`) }
    },
    refreshResourceById: async (resourceId, apiKey) => {
      const resource = resources.find(resource => resource.id === resourceId)

      if (process.server) {
        if (apiKey !== ctx.ssrContext.req.xhrCache.apiKey) { throw new Error(`${libPrefix} wrong apiKey`) }
        if (!resource) { throw new Error(`${libPrefix} Resource with id ${resourceId} not found`) }

        // We get file from file system as we are on server side
        if (resource.ongoing) { throw new Error(`${libPrefix} Resource with id ${resourceId} already in refresh progress`) }

        resource.ongoing = true
        await resource.store()
        resource.ongoing = false
      } else { return makeRequest(`/${config.rootUrl}/refresh/${resourceId}?apiKey=${apiKey}`, true) }
    }
  }

  ctx.xhrCache = xhrCache
  inject('xhrCache', xhrCache)
}
