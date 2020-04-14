import fs from 'fs'
import { join } from 'path'
import axios from 'axios'
import library, { get, write, isFunction, fetch, store } from '../lib/library'

const libPrefix = '[xhr-cache]'

jest.mock('axios')

describe('library:get', () => {
  test('should return null if file doesn\'t exist', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(get(null)).toBe(null)
    spy.mockRestore()
  })

  test('should return JSON error parsing', () => {
    const path = join(__dirname, './fixture/wrong-file.json')
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const file = get(path)
    expect(spy.mock.calls[0][0]).toContain(`${libPrefix} Unable to parse JSON from ${path}`)
    spy.mockRestore()

    expect(file).toMatchObject({})
  })

  test('should return file', () => {
    expect(get(join(__dirname, './fixture/good-file.json'))).toMatchObject([])
  })
})

describe('library:write', () => {
  test('should write file to filesystem', () => {
    const path = join(__dirname, './test.json')
    const data = { toto: true }
    write(path, data)
    expect(fs.readFileSync(path, 'UTF-8')).toBe(JSON.stringify(data))
    fs.unlinkSync(path)
  })
})

describe('library:isFunction', () => {
  test('should return false if not function', () => {
    expect(isFunction(false)).toBe(false)
  })

  test('should return true if sync function', () => {
    expect(isFunction(function () {})).toBe(true)
  })

  test('should return true if async function', () => {
    expect(isFunction(async function () {})).toBe(true)
  })
})

describe('library:fetch', () => {
  test('should fetch and return content', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        }
      },
      response: {
        data: {
          toto: true
        }
      }
    }

    axios.mockResolvedValue(context.response)

    const spy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const response = await fetch(context.name, context.request)

    expect(spy.mock.calls[0][0]).toContain(`${libPrefix} Fetch ${context.name} resource from ${context.request.url}, params: ${JSON.stringify(context.request.params)}`)
    expect(axios.mock.calls[0][0]).toMatchObject({ responseType: 'text' })
    expect(axios.mock.calls.length).toBe(1)
    expect(response).toBe(response)
    spy.mockClear()
  })

  test('should throw an error request.catch empty and if XHR request is empty', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        }
      },
      response: {
        data: null
      }
    }

    axios.mockResolvedValue(context.response)

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetch(context.name, context.request)).rejects.toThrow(`Response from ${context.request.url} is empty`)
    expect(spy.mock.calls[0][0]).toContain(`${libPrefix} Response from ${context.request.url} is empty`)
    spy.mockClear()
  })

  test('should throw an error request.catch empty and if XHR request throw an error', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        }
      },
      response: {
        data: null
      },
      error: 'error'
    }

    axios.mockResolvedValue(Promise.reject(new Error(context.error)))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(fetch(context.name, context.request)).rejects.toThrow(context.error)
    expect(spy.mock.calls[0][0]).toContain(`${libPrefix} Error on fetching resource ${context.request.url}: ${new Error(context.error)}`)
    spy.mockClear()
  })

  test('should return request.catch value if request.catch is not empty and if XHR request is empty', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        },
        catch: 'test'
      },
      response: {
        data: null
      }
    }

    axios.mockResolvedValue(context.response)

    const spy = jest.spyOn(console, 'info').mockImplementation(() => {})
    spy.mockClear()

    await expect(fetch(context.name, context.request)).resolves.toEqual({ data: context.request.catch })
    expect(spy.mock.calls[1][0]).toContain(`${libPrefix} Response from ${context.request.url} is empty using provided default value ${context.request.catch}`)
    spy.mockClear()
  })

  test('should return request.catch value if request.catch is not empty and if XHR request is empty', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        },
        catch: 'test'
      },
      response: {
        data: null
      },
      error: 'error'
    }

    axios.mockResolvedValue(Promise.reject(new Error(context.error)))

    const spy = jest.spyOn(console, 'info').mockImplementation(() => {})
    spy.mockClear()

    await expect(fetch(context.name, context.request)).resolves.toEqual({ data: context.request.catch })
    expect(spy.mock.calls[1][0]).toContain(`${libPrefix} Error on fetching resource ${context.request.url} returning catch value: ${new Error(context.error)}`)
    spy.mockClear()
  })
})

describe('library:store', () => {
  test('should fetch and store to filesystem', async () => {
    const context = {
      name: 'test',
      request: {
        method: 'get',
        url: '/test',
        params: {
          storeId: 'test'
        }
      },
      response: {
        data: {
          toto: true
        },
        headers: {
          maxAge: 1200
        }
      },
      path: join(__dirname, './test.json')
    }

    const spy = jest.spyOn(library, 'fetch').mockImplementation(() => context.response)

    await expect(store(context.name, context.path, context.request)).resolves.toEqual(context.response)
    expect(spy.mock.calls.length).toBe(1)
  })
})
