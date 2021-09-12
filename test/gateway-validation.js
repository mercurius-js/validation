'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

async function createTestService (t, schema, resolvers = {}) {
  const service = Fastify()
  service.register(mercurius, {
    schema,
    resolvers,
    federationMetadata: true
  })
  await service.listen(0)
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

async function createTestGatewayServer (t, validationOptions) {
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

  const [userService, userServicePort] = await createTestService(t, userServiceSchema, userServiceResolvers)

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

  const [postService, postServicePort] = await createTestService(t, postServiceSchema, postServiceResolvers)

  const gateway = Fastify()
  t.teardown(async () => {
    await gateway.close()
    await userService.close()
    await postService.close()
  })
  gateway.register(mercurius, {
    gateway: {
      services: [{
        name: 'user',
        url: `http://localhost:${userServicePort}/graphql`
      }, {
        name: 'post',
        url: `http://localhost:${postServicePort}/graphql`
      }]
    }
  })

  gateway.register(mercuriusValidation, validationOptions ?? {
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
  return gateway
}

t.test('Gateway validation', t => {
  t.plan(2)

  t.test('gateway - should protect the schema as normal if everything is okay', async (t) => {
    t.plan(1)

    const app = await createTestGatewayServer(t)

    const query = `
      query {
        me(id: 1) {
          id
          name
          nickname: name
          topPosts(count: 2) {
            pid
            author {
              id
            }
          }
        }
        topPosts(count: 2) {
          pid
        }
      }`

    const res = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(res.body), {
      data: {
        me: {
          id: 'u1',
          name: 'John',
          nickname: 'John',
          topPosts: [
            {
              pid: 'p1',
              author: {
                id: 'u1'
              }
            },
            {
              pid: 'p3',
              author: {
                id: 'u1'
              }
            }
          ]
        },
        topPosts: [
          {
            pid: 'p1'
          },
          {
            pid: 'p2'
          }
        ]
      }
    })
  })

  t.test('gateway - should protect the schema if everything is not okay', async (t) => {
    t.plan(1)
    const app = await createTestGatewayServer(t)

    const query = `query {
      invalidId: me(id: 0) {
        id
      }
      me(id: 1) {
        id
        name
        nickname: name
        topPosts(count: -1) {
          pid
          author {
            id
          }
        }
      }
      topPosts(count: -2) {
        pid
      }
  }`

    const res = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(res.body), {
      data: {
        invalidId: null,
        me: {
          id: 'u1',
          name: 'John',
          nickname: 'John',
          topPosts: null
        },
        topPosts: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.me'",
          locations: [
            {
              line: 2,
              column: 7
            }
          ],
          path: [
            'invalidId'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                instancePath: '/id',
                schemaPath: '#/properties/id/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/me/id',
                  type: 'integer',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.topPosts'",
          locations: [
            {
              line: 16,
              column: 7
            }
          ],
          path: [
            'topPosts'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                instancePath: '/count',
                schemaPath: '#/properties/count/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/topPosts/count',
                  type: 'integer',
                  minimum: 1
                },
                data: -2
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'User.topPosts'",
          locations: [
            {
              line: 9,
              column: 9
            }
          ],
          path: [
            'me',
            'topPosts'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                instancePath: '/count',
                schemaPath: '#/properties/count/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/User/topPosts/count',
                  type: 'integer',
                  minimum: 1
                },
                data: -1
              }
            ]
          }
        }
      ]
    })
  })
})
