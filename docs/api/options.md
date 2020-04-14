# Options

## `apiKey`

- type: `string`
- default: `generated value from uuid-apikey`

The uuid key is generated using [uuid-apikey](https://github.com/chronosis/uuid-apikey#readme) module

## `rootFolder`

- type: `string`
- default: `'cache'`

The root folder used to store resources

## `rootUrl`

- type: `string`
- default: `'xhr-cache'`

The prefix url used by exposed resources

## `maxAge`

- type: `Number`
- default: `3600 * 1000`

Specifies the number (in milliseconds) until the resource is refreshed from his external resource

## `clean`

- type: `boolean`
- default: `true`

Clean all resources located in [rootFolder](./options.md#rootfolder)  `rootFolder` on nuxt start

## `resources`

- type: `Array<Resource>`
- default: `[]`

Specify all resources to be used

### `resource`

Full resource exemple:

```js
{
  name: 'categories',
  maxAge: 1000 * 60 * 60 * 4, // 4 hours
  // Return https://github.com/axios/axios#request-config
  request: ({ storeId }) => ({
    method: 'get',
    url: `${process.env.API_URL}/categories`,
    params: {
      store_id: storeId
    },
    headers: {
      'api-key': process.env.API_KEY
    }
  }),
  init: async ({ store }) => {
    const ctx = { storeId: 'REF' }
    const path = 'categories/REF.json'

    await store({ path, ctx, identifier: 'ref' })
  },
  middleware: {
    path: '/categories/:storeId(\\d*|REF)',
    handler: ({ storeId }, { get, store }) => {
      const ctx = { storeId }
      const path = `categories/${ctx.storeId}.json`

      return get(path) || store({ path, ctx, identifier: ctx.storeId })
    }
  }
}
```

#### name
  - type: `string`
  - **required**

  The name of the resource. Also used to generate the id of the resource

#### maxAge
  - type: `Number | boolean | Function`
  - default: value from [parent](./options.md#maxage)

  Number (in milliseconds) until the resource is refreshed default (maxAge)[./options.md#maxage].
  The resource is not refreshed if the `false` value is provided.
  `Function` method type is used to set/update maxAge value from response request.

  ##### type: `Function`

  - **Arguments**:
    - [Axios](https://github.com/axios/axios#response-schema) response
  - **Returns**: `Number`

  ```js
  function (response) {
    return response.headers.maxage || 8000
  }
  ```

#### request
  - type: `Object`
  - **Arguments**:
    - Context inject from [store method](../api/methods.md#store)
    - **Returns**: `Promise<AxiosResponse>`

  [Axios](https://github.com/axios/axios#request-config) The XHR request used to fetch the resource.

  ```js
  ({ storeId }) => ({
      method: 'get',
      url: 'api/v1/categories',
      params: {
        storeId
      }
    })
  ```

#### init
  - type: `boolean | Function`
  - default: `false`

  `boolean` type is most of the time used for [default resource](../resources/default.md) and `Function` type is used for [custom resource](../resources/custom.md) when [middleware](./options.md#middleware) is provided

  ##### type: `Function`
  
  - **Arguments**:
    - [store](./methods.md#store) and [get](./methods.md#get) (type: `Object`)
  - **Returns**: `Promise<undefined>`
  
  ```js
  async ({ store }) => {
    const ctx = { storeId: 'REF' }
    const path = `categories/categories-${ctx.storeId}.json`

    await store({ path, ctx, identifier: ctx.storeId })
  }
  ```

  Fetch resource at nuxt start
#### middleware
  - type: `Object`
    - path: `string`. The url where the resource will be exposed. All path are prefixed with the [rootUrl](./options.md#rooturl)
    - handler: `Function`. The handler middleware.
      - **Arguments**:
        - parsed params (type: `Object`) see: [path-to-regex](https://github.com/pillarjs/path-to-regexp#match)
        - [store](./methods.md#store) and [get](./methods.md#get) (type: `Object`)
      - **Return**: `Promise<Object | Array>` The resource data

    ```js
    middleware: {
      path: '/categories/:storeId(\\d*|REF)',
      handler: ({ storeId }, { get, store }) => {
        const ctx = { storeId }
        const path = `categories/categories-${ctx.storeId}.json`

        return get(path) || store({ path, ctx, identifier: ctx.storeId })
      }
    }
    ```
  Method used to expose a [custom resource](../resources/custom.md).

#### catch
  - type: `Object | Array`
  
  Value used if request error or no content returned

