import axios from 'axios'

import { setup, loadConfig, get } from '@nuxtjs/module-test-utils'

const libPrefix = '[xhr-cache]'

jest.mock('axios')
axios.mockResolvedValue({ data: { toto: true } })

const resource = {
  name: 'test',
  request: {
    methods: 'get',
    url: 'http://test'
  }
}

const config = {
  xhrCache: {
    apiKey: 'test',
    resources: [resource]
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
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Serve 'test' resource to http:/localhost:3000/xhr-cache/test`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Resource 'test' got 'test' identifier`)
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

  test('resource middleware should return resource', async () => {
    const test = await get('/xhr-cache/test', { json: true })

    expect(test).toMatchObject({ toto: true })
  })

  test('refresh resource should work', async () => {
    spy.mockClear()
    axios.mockResolvedValue({ data: { toto: false } })
    await get('/xhr-cache/refresh/test?apiKey=test')

    jest.setTimeout(1000)
    /* eslint-disable */
    expect(console.info.mock.calls[0][0]).toBe(`${libPrefix} Force refresh for identifier '${resource.name}'`)
    expect(console.info.mock.calls[1][0]).toBe(`${libPrefix} Fetch test resource from ${resource.request.url}`)
    expect(console.info.mock.calls[2][0]).toBe(`${libPrefix} Refresh url for '${resource.name}' with id '${resource.name}' is available at http:/localhost:3000/xhr-cache/refresh/${resource.name}?apiKey=test`)
    expect(console.info.mock.calls[3][0]).toBe(`${libPrefix} Refresh for identifier '${resource.name}' done`)
    /* eslint-enable */

    const response = await get('/xhr-cache/test', { json: true })

    expect(response).toMatchObject({ toto: false })
  })
})
