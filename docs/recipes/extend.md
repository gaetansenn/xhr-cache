# Extending xhr-cache plugin

If you have plugins that need to access `$xhrCache`, you can use the `xhrCache.plugins` option.

`nuxt.config.js`

```js
{
  modules: [
    '@dewib/xhr-cache'
  ],
  xhrCache: {
     plugins: [ '~/plugins/categories.js' ]
  }
}
```

`plugins/categories.js`

```js
export default async ({ xhrCache }) => {
  if (process.server) {
    const categories = await xhrCache.getResourceByUrl(`categories/all`)
  }
}

```
