'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusAuth = require('..')

const app = Fastify()

app.register(mercurius, {
  gateway: {
    services: [{
      name: 'user',
      url: 'http://localhost:3001/graphql'
    }, {
      name: 'post',
      url: 'http://localhost:3002/graphql'
    }]
  },
  graphiql: false,
  jit: 1
})

app.register(mercuriusAuth, {
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

app.listen(3000)
