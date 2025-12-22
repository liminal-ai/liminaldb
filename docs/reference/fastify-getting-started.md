# Fastify Getting Started

> Source: https://fastify.dev/docs/latest/Guides/Getting-Started/

## Install

```bash
npm i fastify
# or
yarn add fastify
```

## Your First Server

```js
import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

**Note:** Include `"type": "module"` in your package.json for ESM.

## Your First Plugin

```js
// server.js
import Fastify from 'fastify'
import firstRoute from './our-first-route.js'

const fastify = Fastify({ logger: true })

fastify.register(firstRoute)

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

```js
// our-first-route.js
async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })
}

export default routes;
```

## Loading Order

```
└── plugins (from the Fastify ecosystem)
└── your plugins (your custom plugins)
└── decorators
└── hooks
└── your services
```

## Validate Your Data

Fastify uses JSON Schema for validation:

```js
const opts = {
  schema: {
    body: {
      type: 'object',
      properties: {
        someKey: { type: 'string' },
        someOtherKey: { type: 'number' }
      }
    }
  }
}

fastify.post('/', opts, async (request, reply) => {
  return { hello: 'world' }
})
```

## Serialize Your Data

Speed up JSON serialization with response schemas:

```js
const opts = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}

fastify.get('/', opts, async (request, reply) => {
  return { hello: 'world' }
})
```
