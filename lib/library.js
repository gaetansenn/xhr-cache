import { dirname } from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import axios from 'axios'

export const libPrefix = '[xhr-cache]'

export function logAxiosError (err) {
  let error = ''

  if (err.response) {
    // Request made and server responded
    error += ['data', 'status', 'headers'].reduce((accu, key) => {
      if (err.response[key]) {
        accu.push(`${key}: ${JSON.stringify(err.response[key])}`)
      }

      return accu
    }, []).join(', ')
  } else if (err.request) {
    // The request was made but no response was received
    error += `request: ${err.request}`
  } else {
    // Something happened in setting up the request that triggered an Error
    error += `error: ${err.message}`
  }

  return error
}

export function getLog (name, request, action, head) {
  let log = `${libPrefix} ${action} ${name} resource from ${request.url}`

  if (request.params) {
    log += `, params: ${JSON.stringify(request.params)}`
  }

  if (head) {
    log += ` ${head}`
  }

  return log
}

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

  /* eslint-disable-next-line */
  console.info(getLog(name, request, 'Fetch'))

  try {
    const response = await axios(config)

    if (!response.data) {
      let error = getLog(name, request, 'Response', 'is empty.')

      if (typeof request.catch !== 'undefined') {
        error += ` Using provided default value ${request.catch}`
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
      console.error(getLog(name, request, 'Error on fetching', `returning catch value: ${request.catch}, ${logAxiosError(err)}`))

      return { data: request.catch }
    }

    /* eslint-disable-next-line */
    console.error(getLog(name, request, 'Error on fetching', `${logAxiosError(err)}`))

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
