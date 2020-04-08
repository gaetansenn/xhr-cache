import axios from 'axios'

import { setup, loadConfig, get, url } from '@nuxtjs/module-test-utils'

const libPrefix = '[xhr-cache]'

jest.mock('axios')

const resource = {
  config: {
    name: 'test',
    request: {
      methods: 'get',
      url: 'http://test'
    }
  },
  content: { toto: true }
}

const config = {
  xhrCache: {
    apiKey: 'test',
    resources: [resource.config]
  }
}

describe('module.defaults', () => {
  let nuxt, spy

  beforeAll(async () => {
    spy = jest.spyOn(console, 'info').mockImplementation(() => {})
    nuxt = (await setup(loadConfig(__dirname, 'basic', config), {
      beforeNuxtReady: (nuxt) => {
        jest.spyOn(nuxt.moduleContainer, 'addTemplate')
      }
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
    expect(resources[0].id).toBe('test')
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Register apiKey test`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Serve '${resource.config.name}' resource to ${url('/xhr-cache/test')}`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Resource '${resource.config.name}' got '${resource.config.name}' identifier`)
    /* eslint-enable */
  })

  test('should inject serverMiddlewares', () => {
    const middlewares = nuxt.moduleContainer.options.serverMiddleware

    expect(middlewares.findIndex(middleware => middleware.route === '/xhr-cache/test')).not.toBe(-1)
    expect(middlewares.findIndex(middleware => middleware.route === '/xhr-cache/refresh')).not.toBe(-1)

    const req = {}

    middlewares[4](req, false, () => {
      expect(req.xhrCache.resources.length).toBe(1)
      expect(req.xhrCache.apiKey).toBe('test')
    })
  })

  test('resource middleware with fetch error should throw 503', async () => {
    axios.mockResolvedValue({ data: null })

    try {
      await get('/xhr-cache/test')
    } catch (e) {
      expect(e.statusCode).toBe(503)
    }
  })

  test('resource middleware should return resource', async () => {
    axios.mockResolvedValue({ data: resource.content })
    spy.mockClear()
    const test = await get('/xhr-cache/test', { json: true })

    expect(test).toMatchObject(resource.content)
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Fetch ${resource.config.name} resource from ${resource.config.request.url}`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Refresh url for '${resource.config.name}' with id '${resource.config.name}' is available at ${url(`/xhr-cache/refresh/${resource.config.name}?apiKey=test`)}`)
    /* eslint-enable */
  })

  test('refresh resource should work', async () => {
    spy.mockClear()
    resource.content.toto = false
    axios.mockResolvedValue({ data: resource.content })
    await get('/xhr-cache/refresh/test?apiKey=test')

    jest.setTimeout(1000)
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Force refresh for identifier '${resource.config.name}'`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Fetch test resource from ${resource.config.request.url}`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Refresh for identifier '${resource.config.name}' done`)
    /* eslint-enable */

    const response = await get('/xhr-cache/test', { json: true })

    expect(response).toMatchObject(resource.content)
  })

  test('refresh resource without apiKey should throw 400', async () => {
    try {
      await get('/xhr-cache/refresh/test')
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('refresh resource with wrong apiKey should throw 400', async () => {
    try {
      await get('/xhr-cache/refresh/test?apiKey=wrong')
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })

  test('refresh resource that doesn\'t exist should throw 404', async () => {
    try {
      await get('/xhr-cache/refresh/not-exist?apiKey=test')
    } catch (e) {
      expect(e.statusCode).toBe(404)
    }
  })

  test('refresh already in progress should throw 409', async () => {
    axios.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: resource.content }), 1000)))

    await get('/xhr-cache/refresh/test?apiKey=test')

    try {
      await get('/xhr-cache/refresh/test?apiKey=test')
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
    const response = await get('/xhr-cache/resources?apiKey=test', { json: true })

    expect(response).toMatchObject([{
      name: resource.config.name,
      id: resource.config.name,
      path: `xhr-cache/${resource.config.name}`,
      active: true,
      content: resource.content
    }])
  })
})

// describe('module.custom', () => {

// })
