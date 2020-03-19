# Custom

Custom resource allow you to cache multiple content from one source

```js
{
  name: 'categories',
  maxAge: 1000 * 60 * 60 * 4, // 4 hours
  // Return https://github.com/axios/axios#request-config
  request: ({ storeId }) => ({
    method: 'get',
    url: `http://my-api/categories`,
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

A custom resource allow you to fetch a resource with custom params.
As you can see on this exemple the `middleware` get the param `id` and inject it to the `request` method through the method [store](../api/methods.md#store).<br><br>
The `init` method is called during the module intialisation to initialize the resource with a specific value.

With this resource configuration XHR Cache will:
  - Fetch the resource **http://my-api/categories** at nuxt start with the query param `id=REF`
  - Assign the resource with param `id=REF` as id `categories-REF`
  - Store the resource with param `id=REF` to **[rootFolder](../api/options.md#rootfolder)/cartegories/REF.json**
  - Expose the resource **http://hostname:port/[rootUrl](../api/options.md#rooturl)/categories/:storeId** and with the [getResourceById](../api/plugin.md#getresourcebyid-id) or [getResourceByUrl](../api/plugin.md#getresourcebyurl-url)
  - Expose a refresh route **http://hostname:port/[rootUrl](../api/options.md#rooturl)/refresh/categories-REF** and with [refreshResourceById](../api/plugin.md#refreshresourcebyid-id-apikey) method
  - Refresh automatically the resource every 4 hours

