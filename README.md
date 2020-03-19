# XHR Cache Module v2.0.3

> Cache application/json api resources and serve it as static resource

## Links
- [Documentation](https://xhr-cache.dewib.com)

## Setup
```sh
yarn add @dewib/xhr-cache # yarn
npm i @dewib/xhr-cache # npm
```

## Basic usage
Firstly, you need to add `xhr-cache` to your Nuxt config.

```javascript
// nuxt.config.js

{
  modules: [
    [
      '@dewib/xhr-cache'
    ]
  ]
}
```

Then you can add all resources that you want to cache by adding it to your `nuxt.config.js`.

```javascript
// nuxt.config.js
{
  xhrCache: {
    apiKey: 'you-can-specify-your-own-key', // apiKey used to refresh resource https://github.com/chronosis/uuid-apikey#readme
    rootFolder: 'cache', // Root folder of cached resources (default value)
    rootUrl: 'xhr-cache', // Root url of cached resources (default value)e
    maxAge: 3600 * 1000 // Age of cached files (default value) 1 hour
    clean: true // Clean all resources on nuxt start (default value)
    resources: [
      {
        name: 'xhr-cache', // Used for identifier but also for file name and url
        init: false, // Used to call the resource at nuxt start (default value)
        request: { // Axios request https://github.com/axios/axios#request-config
          method: 'get',
          url: 'http://www.mocky.io/v2/5d9e4c643200002a00329d0a'
        },
        catch: [] // (Optional) Value used if request error or no content
      }
    ]
  }
}
```

## Refresh content manually

XHR cache expose routes to refresh a resource manually

All routes are exposed once the first called has been made to the resource or if the init resource option is set to true

The refresh route is generated like this:

```javascript
path.join(
  conf.rootUrl, // Route url from config
  'refresh',
  id) // Generated id of resource
```

and need the apiKey as query params for security reasons

## Advanced usage

With XHR cache you can customize the default middleware and the initial value.
Here an example to cache specific categories from a specific store

```javascript
// nuxt.config.js
{
  xhrCache: {
    resources: [
      {
        name: 'categories',
        request: ({ storeId }) => ({
          method: 'get',
          url: `api/v1/categories`,
          params: {
            storeId
          }
        }),
        }
        middleware: {
          // Handle regex path. 
          // Usage: https://github.com/pillarjs/path-to-regexp#readme
          path: 'categories/:storeId(\\d*|REF)',
          handler: async (params, { get, store }) => {
            const ctx = { storeId: params.storeId }
            const path = `categories/categories-${ctx.storeId}.json`

            // You can also throw Error inside the middleware
            if (ctx.storeId === '123') throw Error(`Store with id ${ctx.storeId} doesn't not exist`)

            return get(path) || store({ path, ctx, identifier: ctx.storeId })
          }
        }
      }
    ]
  }
}
```

## Injected Methods

`store` and `get` methods are inject to custom `middleware` and `init` methods and allows you to interact with the stored files.

### `store ({ path: String, context: Object (optional), identifier: String (optional) }): Promise`
Fetch and store requested content to file system
- path: File system path
- context: Injected and used for axios request
- identifier: Used to generate uniq identifier

### `get (path): Resource`
Get file from filesystem
- path: file system path

## NuxtJS Plugin

XHR Request provide a nuxtJS plugin to get or refresh resource

### `getResourceById (resourceId: String): Promise<Resource>`
Get resource by id

### `getResourceByUrl (resourceUrl: String): Promise<Resource>`
Get resource by url

### `refreshResourceById (resourceId: String, apiKey: String)`
Refresh resource by id

## License

[MIT License](./LICENSE)