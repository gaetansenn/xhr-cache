export const libPrefix = '[xhr-cache]'

async function makeRequest (url, refresh) {
  const response = await fetch(url)

  if (response.ok) return (refresh) ? response : response.json()

  if (refresh) throw Error(response.status === 404 ? `${libPrefix} Resource not found` : `${libPrefix} Refresh already in progress`)
  else throw Error(`${libPrefix} Resource with url ${url} not found`)
}

export default (ctx, inject) => {
  const config = JSON.parse('<%= options.config %>')
  const resources = process.server ? ctx.ssrContext.req.xhrCache.resources : JSON.parse('<%= options.resources %>')

  const xhrCache = {
    getResourceById: async (resourceId) => {
      const resource = resources.find((resource) => resource.id === resourceId)

      if (process.server) {
        if (!resource) throw Error(`${libPrefix} Resource with id ${resourceId} not found`)

        // We get file from file system as we are on server side
        return resource.init ? resource.get() : await resource.store()
      }
      
      return makeRequest(`/${config.rootUrl}/resource/${resourceId}`)
    },
    getResourceByUrl: async (resourceUrl) => {
      // Clean duplicate `/`
      resourceUrl = (resourceUrl[0] === '/') ? resourceUrl.substring(1) : resourceUrl

      if (process.server) {
        const { match } = require('@dewib/xhr-cache/node_modules/path-to-regexp/dist/index.js')
        const path = require('@dewib/xhr-cache/node_modules/path/path.js')

        const resource = resources.find((resource) => resource.middleware && match(resource.middleware.path, { decode: decodeURIComponent })(path.join(config.rootUrl, resourceUrl)))

        if (!resource) throw Error(`${libPrefix} Resource url ${resourceUrl} not found`)

        const matchResult = match(resource.middleware.path, { decode: decodeURIComponent })(path.join(config.rootUrl, resourceUrl))

        if (resource) return resource.middleware.handler(matchResult.params, { get: resource.get, store: resource.store })

      } else return makeRequest(`/${config.rootUrl}/${resourceUrl}`)
    },
    refreshResourceById: async (resourceId, apiKey) => {
      const resource = resources.find((resource) => resource.id === resourceId)

      if (process.server) {
        if (apiKey !== ctx.ssrContext.req.xhrCache.apiKey) throw Error(`${libPrefix} wrong apiKey`)
        if (!resource) throw Error(`${libPrefix} Resource with id ${resourceId} not found`)

        // We get file from file system as we are on server side
        if (resource.ongoing) throw Error(`${libPrefix} Resource with id ${resourceId} already in refresh progress`)

        resource.ongoing = true
        await resource.store()
        resource.ongoing = false
      } else return makeRequest(`/${config.rootUrl}/refresh/${resourceId}?apiKey=${apiKey}`, true)
    }
  }

  ctx.xhrCache = xhrCache
  inject('xhrCache', xhrCache)
}