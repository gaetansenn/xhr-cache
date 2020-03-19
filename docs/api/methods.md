# Methods

`store` and `get` methods are inject to custom `middleware` and `init` methods and allows you to interact with the stored files.

## `store ({ path, context: Object, identifier })`

- Returns: `Promise`

Fetch and store requested content to file system
- path: `<String>` File system path
- context: (optional) `<Object>` Injected and used for axios request
- identifier: (optional) `<String>` Used to generate uniq identifier

## `get (path)`

- Return: `Object`

Get file from filesystem
- path: `<String>` file system path