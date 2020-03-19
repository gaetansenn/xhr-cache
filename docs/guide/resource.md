# Resource

A resource is a cached external data source, by default a resource contains a single data but can contain multiple using [custom resource](../resources/custom.md).

## Default resource

A default resource is exposed with a Nuxt.js [server middleware](https://fr.nuxtjs.org/api/configuration-servermiddleware/) and Nuxt.js [plugin](./api/plugin.md).

The `name` attribute is used as a unique `id` to identify it from other resources.
It's also used to generate the stored filename and the static url which is exposed publicly.

For instance a resource with `my-resource` will have:
- The id `my-resource` to use it with the Nuxt.js [plugin](./api/plugin.md)  
- A file named `my-resource.json` inside the default [rootFolder](../api/options.md#rootfolder)
- An exposed route available at http://hostname:port/[rootUrl](../api/options.md#rooturl)/my-resource.json

