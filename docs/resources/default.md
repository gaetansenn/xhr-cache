# Default

A default resource allow you to cache a specific resource and expose it publicly.

```js
{
  name: 'my-resource'
  maxAge: 3600 * 1000, // TTL of resource
  init: true, // Fetch the resource at nuxt start
  request: {
    method: 'get',
    url: 'http://www.mocky.io/v2/5d9e4c643200002a00329d0a'
  }
}
```

With this resource configuration XHR Cache will:
  - Assign the resource as id `my-resource`
  - Fetch the resource **http://www.mocky.io/v2/5d9e4c643200002a00329d0a** at nuxt build/start
  - Store the resource to **[rootFolder](../api/options.md#rootfolder)/my-resource.json**
  - Expose the resource to **http://hostname:port/[rootUrl](../api/options.md#rooturl)/my-resource** and with the [getResourceById](../api/plugin.md#getresourcebyid-id) method
  - Expose a refresh url to **http://hostname:port/[rootUrl](../api/options.md#rooturl)/refresh/my-resource** and with the [refreshResourceById](../api/plugin.md#refreshresourcebyid-id-apikey) method
  - Refresh automatically the resource every hours
