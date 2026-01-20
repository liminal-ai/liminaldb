# @fastify/cors

> Source: https://github.com/fastify/fastify-cors

Enables CORS in a Fastify application.

## Install

```bash
npm i @fastify/cors
```

## Compatibility

| Plugin version | Fastify version |
|----------------|-----------------|
| `^11.x`        | `^5.x`          |
| `^10.x`        | `^5.x`          |
| `^8.x`         | `^4.x`          |

## Usage

```javascript
import Fastify from 'fastify'
import cors from '@fastify/cors'

const fastify = Fastify()
await fastify.register(cors, {
  // options
})

fastify.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

await fastify.listen({ port: 5001 }) // 5001 is PromptDB default port
```

## Options

- `origin`: Configure Access-Control-Allow-Origin
  - `true`: Reflect request origin
  - `false`: Disable CORS
  - `"*"`: Allow any origin (default)
  - `String`: Specific origin
  - `RegExp`: Pattern to test origin
  - `Array`: Array of valid origins
  - `Function`: Custom logic `(origin, cb) => cb(null, true)`

- `methods`: Access-Control-Allow-Methods (default: `GET,HEAD,POST`)
- `allowedHeaders`: Access-Control-Allow-Headers
- `exposedHeaders`: Access-Control-Expose-Headers
- `credentials`: Access-Control-Allow-Credentials (set to `true` to enable)
- `maxAge`: Access-Control-Max-Age in seconds
- `preflight`: Enable/disable preflight (default: `true`)

## Async Configuration

```javascript
fastify.register(require('@fastify/cors'), (instance) => {
  return (req, callback) => {
    const corsOptions = { origin: true };

    if (/^localhost$/m.test(req.headers.origin)) {
      corsOptions.origin = false
    }

    callback(null, corsOptions)
  }
})
```

## Route-Level Overrides

```javascript
fastify.get('/cors-allow-all', {
  config: {
    cors: { origin: '*' },
  },
}, (_req, reply) => {
  reply.send('Custom CORS')
})

fastify.get('/cors-disabled', {
  config: {
    cors: false,
  },
}, (_req, reply) => {
  reply.send('No CORS')
})
```
