# XHR Cache Module

> Cache application/json api resources and serve it as static resource

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
      'xhr-cache'
    ]
  ]
}
```

Then you can add all resources that you want to cache by adding it to your Nuxt config.

```javascript
// nuxt.config.js

{
  xhrCache: {
    rootFolder: 'cache', // Root folder of cached resources (default value)
    rootUrl: 'static', // Root url of cached resources (default value)
    maxAge: 3600 * 1000 // Age of cached files (default value)
    clean: true // Clean all resources on nuxt start (default value)
    resources: [
      {
        name: 'xhr-cache', // Used for identifier but also for file name and url
        init: false, // Used to call the resource at nuxt start (default value)
        request: { // Axios request https://github.com/axios/axios#request-config
          method: 'get',
          url: 'http://www.mocky.io/v2/5d9e4c643200002a00329d0a'
        } 
      }
    ]
  }
}
```

## Refresh content manually

XHR cache expose routes to refresh a resource manually.

All routes are exposed during nuxtjs start with the specific path:

```javascript
path.join(
  conf.rootUrl, // Route url from config
  '/cache/refresh/',
  id // Generated id of resource
```

## Advanced usage

With XHR cache you can customize the default middleware and the initial value.
Here a configuration to cache specific categories from a specific store

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
        init: async ({ store }) => { 
          const ctx = { storeId: '1234' }
          const path = `categories/categories-${storeId}.json`

          await store(path, ctx)
        },
        middleware: {
          path: 'categories',
          handler: async (req, res, { get, store }) => {
            const match = req.url.match(/\/categories-(\d*).json/)

            if (!match || match.length < 2) {
              res.statusCode = 404
              res.end()
            } else {
              const ctx = { storeId: match[1] }
              const path = `categories/categories-${ctx.storeId}.json`

              let content = get(path)

              if (!content) content = await store(path, ctx)

              res.end(JSON.stringify(content))
            }
          }
        }
      }
    ]
  }
}
```

## Methods 

Store and get methods are inject to middlware and initial config and allows you to interact with the file system.

### `store (path, context: optional)`
Store requested content to file system
- path: file system path
- context: injected and used for axios request

### `get (path)`
Get file from filesystem
- path: file system path

## License

[MIT License](./LICENSE)