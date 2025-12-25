# @fastify/static

> Source: https://github.com/fastify/fastify-static

Plugin for serving static files as fast as possible.

## Install

```bash
npm i @fastify/static
```

## Compatibility

| Plugin version | Fastify version |
|----------------|-----------------|
| `>=8.x`        | `^5.x`          |
| `>=7.x <8.x`   | `^4.x`          |

## Usage

```javascript
const fastify = require('fastify')({logger: true})
const path = require('node:path')

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default '/'
})

fastify.get('/another/path', function (req, reply) {
  reply.sendFile('myHtml.html')
})

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
})
```

## Multiple Prefixed Roots

```javascript
// first plugin
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public')
})

// second plugin
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'node_modules'),
  prefix: '/node_modules/',
  decorateReply: false
})
```

## Key Options

- `root` (required): Absolute path of directory containing files to serve
- `prefix`: URL path prefix (default: `'/'`)
- `serve`: Set to `false` to not serve files (default: `true`)
- `index`: Set to `false` to disable index.html, or provide custom index
- `cacheControl`: Enable/disable Cache-Control header (default: `true`)
- `maxAge`: Cache-Control max-age in seconds
- `immutable`: Add immutable directive to Cache-Control
- `redirect`: Redirect directories without trailing slash (default: `false`)

## Methods

### reply.sendFile(filename, [options])

Send a file from the root directory.

### reply.download(filename, [customFilename], [options])

Send a file with `content-disposition` header.
