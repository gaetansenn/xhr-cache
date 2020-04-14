import { dirname } from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import axios from 'axios'

export const libPrefix = '[xhr-cache]'

export function isFunction (fnc) {
  if (!fnc) { return false }

  return ['[object Function]', '[object AsyncFunction]'].includes({}.toString.call(fnc))
}

// Store requested content to file system
export async function store (name, path, request) {
  const response = await methods.fetch(name, request)

  methods.write(path, response.data)

  return response
}

// Fetch data from url
export async function fetch (name, request) {
  // Inject response type if not present
  const config = Object.assign({ responseType: 'text' }, request)

  let requestInfo = `${libPrefix} Fetch ${name} resource from ${request.url}`

  if (request.params) { requestInfo += `, params: ${JSON.stringify(request.params)}` }

  /* eslint-disable-next-line */
  console.info(requestInfo)

  try {
    const response = await axios(config)

    if (!response.data) {
      let error = `${libPrefix} Response from ${request.url} is empty`

      if (typeof request.catch !== 'undefined') {
        error += ` using provided default value ${request.catch}`
        /* eslint-disable-next-line */
        console.info(error)

        return { data: request.catch }
      }

      /* eslint-disable-next-line */
      console.error(error)

      return Promise.reject(new Error(`Response from ${request.url} is empty`))
    }

    return response
  } catch (err) {
    if (typeof request.catch !== 'undefined') {
      /* eslint-disable-next-line */
      console.info(`${libPrefix} Error on fetching resource ${request.url} returning catch value: ${err}`)

      return { data: request.catch }
    }

    /* eslint-disable-next-line */
    console.error(`${libPrefix} Error on fetching resource ${request.url}: ${err}`)

    return Promise.reject(err)
  }
}

// Read file from filesystem
export function get (path) {
  if (!fs.existsSync(path)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(path, 'UTF-8'))
  } catch (err) {
    /* eslint-disable-next-line */
    console.error(`${libPrefix} Unable to parse JSON from ${path}`)

    return {}
  }
}

// Store data to filesystem
export function write (path, content) {
  mkdirp.sync(dirname(path))
  fs.writeFileSync(path, JSON.stringify(content))
}

const methods = {
  get,
  write,
  store,
  fetch,
  isFunction
}

export default methods
