'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const app = Fastify()

app.register(mercurius, {
  gateway: {
    services: [{
      name: 'user',
      url: 'http://127.0.0.1:3001/graphql'
    }, {
      name: 'post',
      url: 'http://127.0.0.1:3002/graphql'
    }]
  },
  graphiql: false,
  jit: 1
})

app.register(mercuriusValidation, {
  schema: {
    User: {
      topPosts: {
        count: { type: 'integer', minimum: 1 }
      }
    },
    Query: {
      me: {
        id: { type: 'integer', minimum: 1 }
      },
      topPosts: {
        count: { type: 'integer', minimum: 1 }
      }
    }
  }
})

app.listen({ port: 3000 })
