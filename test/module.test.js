import axios from 'axios'

import { setup, loadConfig, get, url } from '@nuxtjs/module-test-utils'
import { compile } from 'path-to-regexp'

const libPrefix = '[xhr-cache]'

jest.mock('axios')

const defaultResource = {
  name: 'default',
  request: {
    methods: 'get',
    url: 'default'
  },
  content: { default: true }
}

const defaultConfig = {
  xhrCache: {
    apiKey: 'apiKey',
    resources: [defaultResource]
  }
}

describe('module.default', () => {
  let nuxt

  beforeAll(async () => {
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    nuxt = (await setup(loadConfig(__dirname, 'basic', defaultConfig), {
      beforeNuxtReady: (nuxt) => {
        jest.spyOn(nuxt.moduleContainer, 'addTemplate')
      },
      port: 3000
    })).nuxt
  })

  afterAll(async () => {
    await nuxt.close()
  })

  test('should inject plugin with default config and resources', () => {
    expect(nuxt.moduleContainer.addTemplate).toBeDefined()
    const call = nuxt.moduleContainer.addTemplate.mock.calls.find(args => args[0].src.includes('plugin.js'))
    const options = call[0].options
    const config = JSON.parse(options.config)
    const resources = JSON.parse(options.resources)

    expect(config.rootUrl).toBe('xhr-cache')
    expect(config.rootFolder).toBe('cache')
    expect(resources[0].id).toBe(defaultResource.name)
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Register apiKey ${defaultConfig.xhrCache.apiKey}`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Serve '${defaultResource.name}' resource to ${url(`/xhr-cache/${defaultResource.name}`)}`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Resource '${defaultResource.name}' got '${defaultResource.name}' identifier`)
    /* eslint-enable */
  })

  test('should inject serverMiddlewares', () => {
    const middlewares = nuxt.moduleContainer.options.serverMiddleware

    expect(middlewares.findIndex(middleware => middleware.route === `/xhr-cache/${defaultResource.name}`)).not.toBe(-1)
    expect(middlewares.findIndex(middleware => middleware.route === '/xhr-cache/refresh')).not.toBe(-1)

    const req = {}

    middlewares[4](req, false, () => {
      expect(req.xhrCache.resources.length).toBe(1)
      expect(req.xhrCache.apiKey).toBe(defaultConfig.xhrCache.apiKey)
    })
  })

  test('resource middleware with fetch error should throw 503', async () => {
    axios.mockResolvedValue({ data: null })

    try {
      await get(`/xhr-cache/${defaultResource.name}`)
    } catch (e) {
      expect(e.statusCode).toBe(503)
      /* eslint-disable-next-line */
      expect(console.error.mock.calls[0][0]).toBe(`${libPrefix} Response from ${defaultResource.request.url} is empty`)
    }
  })

  test('resource middleware should return resource', async () => {
    axios.mockResolvedValue({ data: defaultResource.content })
    /* eslint-disable-next-line */
    console.info.mockClear()
    const test = await get(`/xhr-cache/${defaultResource.name}`, { json: true })

    expect(test).toMatchObject(defaultResource.content)
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Fetch ${defaultResource.name} resource from ${defaultResource.request.url}`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Refresh url for '${defaultResource.name}' with id '${defaultResource.name}' is available at ${url(`/xhr-cache/refresh/${defaultResource.name}?apiKey=${defaultConfig.xhrCache.apiKey}`)}`)
    /* eslint-enable */
  })

  test('refresh resource should work', async () => {
    /* eslint-disable-next-line */
    console.info.mockClear()
    defaultResource.content.default = false
    axios.mockResolvedValue({ data: defaultResource.content })
    await get(`/xhr-cache/refresh/${defaultResource.name}?apiKey=${defaultConfig.xhrCache.apiKey}`)

    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Force refresh for identifier '${defaultResource.name}'`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Fetch ${defaultResource.name} resource from ${defaultResource.request.url}`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Refresh for identifier '${defaultResource.name}' done`)
    /* eslint-enable */

    const response = await get(`/xhr-cache/${defaultResource.name}`, { json: true })

    expect(response).toMatchObject(defaultResource.content)
  })

  test('refresh resource without apiKey should throw 400', async () => {
    try {
      await get(`/xhr-cache/refresh/${defaultResource.name}`)
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('refresh resource with wrong apiKey should throw 400', async () => {
    try {
      await get(`/xhr-cache/refresh/${defaultResource.name}?apiKey=wrong`)
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('refresh resource that doesn\'t exist should throw 404', async () => {
    try {
      await get(`/xhr-cache/refresh/not-exist?apiKey=${defaultConfig.xhrCache.apiKey}`)
    } catch (e) {
      expect(e.statusCode).toBe(404)
    }
  })

  test('refresh already in progress should throw 409', async () => {
    axios.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: defaultResource.content }), 1000)))

    await get(`/xhr-cache/refresh/${defaultResource.name}?apiKey=${defaultConfig.xhrCache.apiKey}`)

    try {
      await get(`/xhr-cache/refresh/${defaultResource.name}?apiKey=${defaultConfig.xhrCache.apiKey}`)
    } catch (e) {
      expect(e.statusCode).toBe(409)
    }
  })

  test('list resources without apiKey should throw 400', async () => {
    try {
      await get('/xhr-cache/resources')
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('list resources with wrong apiKey should throw 400', async () => {
    try {
      await get('/xhr-cache/resources?apiKey=wrong')
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('list resources should return 200', async () => {
    const response = await get(`/xhr-cache/resources?apiKey=${defaultConfig.xhrCache.apiKey}`, { json: true })

    expect(response).toMatchObject([{
      name: defaultResource.name,
      id: defaultResource.name,
      path: `xhr-cache/${defaultResource.name}`,
      active: true,
      content: defaultResource.content
    }])
  })

  test('get resource by id should return resource', async () => {
    await expect(get(`/xhr-cache/resource/${defaultResource.name}`, { json: true })).resolves.toMatchObject(defaultResource.content)
  })

  test('get resource that doesn\'t exist should throw 404', async () => {
    try {
      await get('/xhr-cache/resource/wrong')
    } catch (e) {
      expect(e.statusCode).toBe(404)
    }
  })

  test('nuxt close hook should stop auto refresh of resource', async (done) => {
    /* eslint-disable-next-line */
    console.info.mockClear()

    nuxt.hook('close', () => {
      /* eslint-disable-next-line */
      expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Stop auto refresh for '${defaultResource.name} with id '${defaultResource.name}'`)
      done()
    })

    await nuxt.callHook('close')
  })
})

const customResources = [{
  name: 'custom',
  request: ({ id }) => ({
    method: 'get',
    url: 'custom',
    params: {
      id
    }
  }),
  init: ({ store }) => {
    const ctx = { id: 'REF' }
    const path = `custom/custom-${ctx.id}.json`

    return store({ path, ctx, identifier: ctx.id })
  },
  middleware: {
    /* eslint-disable-next-line */
    path: '/custom/:id',
    handler (params, { get, store }) {
      const ctx = { id: params.id }
      const path = `custom/custom-${ctx.id}.json`

      if (ctx.id === '123') {
        throw new Error('Resource not found')
      }

      return get(path) || store({ path, ctx, identifier: ctx.id })
    }
  },
  content: { custom: true }
}]

const customConfig = {
  xhrCache: {
    apiKey: 'apiKey',
    resources: [
      Object.assign({ init: true, maxAge: false }, defaultResource),
      ...customResources
    ]
  }
}

describe('module.custom', () => {
  let nuxt

  beforeAll(async () => {
    axios.mockImplementation(config => ({ data: customConfig.xhrCache.resources.find(resource => resource.name === config.url).content }))
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    /* eslint-disable */
    console.info.mockClear()
    console.error.mockClear()
    /* eslint-enable */

    nuxt = (await setup(loadConfig(__dirname, 'basic', customConfig))).nuxt
  })

  afterAll(async () => {
    await nuxt.close()
  })

  test('default resource with init should fetch resource at init', () => {
    /* eslint-disable-next-line */
    expect(console.info.mock.calls.findIndex(message => (message[0] === `${libPrefix} Fetch ${defaultResource.name} resource from ${defaultResource.request.url}`))).not.toBe(-1)
  })

  test('custom resource with init should fetch resource at init', () => {
    /* eslint-disable-next-line */
    expect(console.info.mock.calls.findIndex(message => (message[0] === `${libPrefix} Resource '${customResources[0].name}' with context ${JSON.stringify({ id: 'REF' })} got '${customResources[0].name}-REF' identifier`))).not.toBe(-1)
  })

  test('custom resource should expose custom middleware', async () => {
    /* eslint-disable-next-line */
    expect(console.info.mock.calls.findIndex(message => (message[0] === `${libPrefix} Serve custom '${customResources[0].name}' resource to ${url(`/xhr-cache${customResources[0].middleware.path}`)}`))).not.toBe(-1)
    await expect(get(`/xhr-cache${compile(customResources[0].middleware.path)({ id: 'REF' })}`, { json: true })).resolves.toMatchObject(customResources[0].content)
  })

  test('custom resource should throw 503 on middleware exception', async () => {
    try {
      await get(`/xhr-cache${compile(customResources[0].middleware.path)({ id: '123' })}`, { json: true })
    } catch (e) {
      expect(e.statusCode).toBe(503)
    }
  })
})
