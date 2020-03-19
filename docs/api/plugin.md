# Plugin

XHR Cache provide a Nuxt.js plugin to manage resources in a simply way.

All resources initialized during nuxt start are available with a specific `id` and can be retrieved with the [getResourceById](./plugin.md#getresourcebyid-resourceid) method.

::: tip 
You can find the generated resource `id` in the console
:::

Beside any [custom resource](../resources/custom.md) that has not been cached can be retrived by calling the [getResourceByUrl](./plugin.md#getresourcebyurl-resourceurl) method.

## methods

### `getResourceById(id)`
- **Arguments**:
  - id: (type: `string`) the id of the resource
- **Returns**: `Promise<Object | Array>`

Return a specific resoure identified by his id

:::warning
Only resource with generated `id` can be called.
:::

```js
const resource = await this.$xhrCache.getResourceById('my-resource')
```

### `getResourceByUrl(url)`
- **Arguments**:
  - url: (type: `string`) the path of the resource
- **Returns**: `Promise<Object | Array>`

Return a specific resource identified by his url

This is commonly used when using [custom middlewrare](../resources/custom.md)

```js
const resource = await this.$xhrCache.getResourceByUrl('categories/1425')
```

### `refreshResourceById(id, apiKey)`
- **Arguments**:
  - id: (type: `string`) the id of the resource
  - apiKey: (type: `string`) the [apiKey](./options.md#apikey) value
- Returns: `Exception if error`

Refresh a specific resource identifed by his `id`.

The `apiKey` argument is provided for security reason and provided by the [apiKey](./options.md#apikey) option

```js
this.$xhrCache.refreshResourceById('my-resource', 'MGM90YE-2HEMCCJ-QQ0RGJT-QG3S4BX')
```
