'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusAuth = require('..')
const { schema, resolvers } = require('./normal-setup')

const app = Fastify()

app.register(mercurius, {
  schema,
  resolvers,
  graphiql: false,
  jit: 1
})

app.register(mercuriusAuth, {
  schema: {
    Filters: {
      text: { type: 'string', minLength: 1 }
    },
    Query: {
      message: {
        id: { type: 'string', minLength: 1 }
      },
      messages: {
        arrayScalarFilters: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1
          },
          minItems: 1
        },
        arrayObjectFilters: {
          type: 'array',
          minItems: 1
        }
      }
    }
  }
})

app.listen(3000)
