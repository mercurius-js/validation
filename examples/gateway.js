'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('mercurius-validation')

async function createService (schema, resolvers = {}) {
  const service = Fastify()
  service.register(mercurius, {
    schema,
    resolvers,
    federationMetadata: true
  })
  await service.listen({ port: 0 })
  return [service, service.server.address().port]
}

const users = {
  u1: {
    id: 'u1',
    name: 'John'
  },
  u2: {
    id: 'u2',
    name: 'Jane'
  }
}

const posts = {
  p1: {
    pid: 'p1',
    title: 'Post 1',
    content: 'Content 1',
    authorId: 'u1'
  },
  p2: {
    pid: 'p2',
    title: 'Post 2',
    content: 'Content 2',
    authorId: 'u2'
  },
  p3: {
    pid: 'p3',
    title: 'Post 3',
    content: 'Content 3',
    authorId: 'u1'
  },
  p4: {
    pid: 'p4',
    title: 'Post 4',
    content: 'Content 4',
    authorId: 'u1'
  }
}

async function start (authOpts) {
  // User service
  const userServiceSchema = `
    type Query @extends {
      me(id: Int): User
    }

    type User @key(fields: "id") {
      id: ID!
      name: String
    }`
  const userServiceResolvers = {
    Query: {
      me: (root, args, context, info) => {
        return users.u1
      }
    },
    User: {
      __resolveReference: (user, args, context, info) => {
        return users[user.id]
      }
    }
  }
  const [, userServicePort] = await createService(userServiceSchema, userServiceResolvers)

  // Post service
  const postServiceSchema = `
    type Post @key(fields: "pid") {
      pid: ID!
      author: User
    }

    extend type Query {
      topPosts(count: Int): [Post]
    }

    type User @key(fields: "id") @extends {
      id: ID! @external
      topPosts(count: Int!): [Post]
    }`
  const postServiceResolvers = {
    Post: {
      __resolveReference: (post, args, context, info) => {
        return posts[post.pid]
      },
      author: (post, args, context, info) => {
        return {
          __typename: 'User',
          id: post.authorId
        }
      }
    },
    User: {
      topPosts: (user, { count }, context, info) => {
        return Object.values(posts).filter(p => p.authorId === user.id).slice(0, count)
      }
    },
    Query: {
      topPosts: (root, { count = 2 }) => Object.values(posts).slice(0, count)
    }
  }
  const [, postServicePort] = await createService(postServiceSchema, postServiceResolvers)

  const gateway = Fastify()

  gateway.register(mercurius, {
    gateway: {
      services: [{
        name: 'user',
        url: `http://127.0.0.1:${userServicePort}/graphql`
      }, {
        name: 'post',
        url: `http://127.0.0.1:${postServicePort}/graphql`
      }]
    }
  })

  gateway.register(mercuriusValidation, {
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

  await gateway.listen({ port: 3000 })
}

start()
