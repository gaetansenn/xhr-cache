import { dirname } from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import axios from 'axios'

export const libPrefix = '[xhr-cache]'

export function isFunction (fnc) {
  if (!fnc) return false

  return ['[object Function]', '[object AsyncFunction]'].includes({}.toString.call(fnc))
}

// Store requested content to file system
export async function store (name, path, request) {
  const response = await fetch(name, request)

  write(path, response.data)

  return response.data
}

// Fetch data from url
export function fetch (name, request) {
  // Inject response type if not present
  const config = Object.assign({ responseType: 'text' }, request)

  let requestInfo = `${libPrefix} Fetch ${name} resource from ${request.url}`

  if (request.params) requestInfo += `, params: ${JSON.stringify(request.params)}`

  /* eslint-disable-next-line */
  console.info(requestInfo)

  return axios(config).catch((err) => {
    return { data: request.catch } || Promise.reject(err)
  })
}

// Read file from filesystem
export function get (path) {
  if (!fs.existsSync(path)) return null

  return JSON.parse(fs.readFileSync(path, 'UTF-8'))
}

// Store data to filesystem
export function write (path, content) {
  return new Promise((resolve, reject) => {
    mkdirp(dirname(path), function (err) {
      if (err) reject(err)

      try {
        fs.writeFileSync(path, JSON.stringify(content))
      } catch (err) {
        reject(err)
      }

      return resolve(content)
    })
  })
}
