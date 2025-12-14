'use strict'

const { describe, test } = require('node:test')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')
const { GraphQLSchema } = require('graphql')

const schema = `
  type Message {
    id: ID!
    text: String
  }

  input Filters {
    text: String
  }

  input NestedFilters {
    input: Filters
  }

  type Query {
    message(id: Int unused: Int): Message
    messages(filters: Filters, nestedFilters: NestedFilters): [Message]
  }
`

const messages = [
  {
    id: 0,
    text: 'Some system message.'
  },
  {
    id: 1,
    text: 'Hello there'
  },
  {
    id: 2,
    text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.'
  },
  {
    id: 3,
    text: ''
  }
]

const resolvers = {
  Query: {
    message: async (_, { id }) => {
      return messages.find(message => message.id === Number(id))
    },
    messages: async () => {
      return messages
    }
  }
}

const withResolvers = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Function validators', () => {
  test('should protect the schema and not affect operations when everything is okay', async (t) => {
    const app = Fastify()
    t.after(() => app.close())
    app.register(mercurius, {
      schema,
      resolvers
    })

    const { promise, resolve } = withResolvers()

    app.register(mercuriusValidation, {
      schema: {
        Query: {
          message: {
            id: async (metadata, argumentValue, parent, args, context, info) => {
              t.assert.ok('should be called')
              t.assert.deepStrictEqual(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.assert.strictEqual(argumentValue, 1)
              t.assert.strictEqual(typeof parent, 'object')
              t.assert.strictEqual(typeof args, 'object')
              t.assert.strictEqual(typeof context, 'object')
              t.assert.strictEqual(typeof info, 'object')
              t.assert.strictEqual(info.schema.constructor.name, GraphQLSchema.name)
              resolve()
              return true
            }
          }
        }
      }
    })

    const query = `query {
      message(id: 1, unused: 1) {
        id
        text
      }
      messages(filters: { text: "hello" }, nestedFilters: { input: { text: "hello" } }) {
        id
        text
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.assert.deepStrictEqual(JSON.parse(response.body), {
      data: {
        message: {
          id: '1',
          text: 'Hello there'
        },
        messages: [
          {
            id: '0',
            text: 'Some system message.'
          },
          {
            id: '1',
            text: 'Hello there'
          },
          {
            id: '2',
            text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.'
          },
          {
            id: '3',
            text: ''
          }
        ]
      }
    })

    await promise
  })

  test('should protect the schema arguments and error accordingly', async (t) => {
    const app = Fastify()
    t.after(() => app.close())

    app.register(mercurius, {
      schema,
      resolvers
    })
    const { promise, resolve } = withResolvers()
    app.register(mercuriusValidation, {
      schema: {
        Query: {
          message: {
            id: async (metadata, argumentValue) => {
              t.assert.ok('should be called')
              t.assert.deepStrictEqual(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.assert.strictEqual(argumentValue, 32768)
              const error = new Error('kaboom')
              error.data = 'kaboom data'
              resolve()
              throw error
            }
          }
        }
      }
    })

    const query = `query {
      message(id: 32768) {
        id
        text
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.assert.deepStrictEqual(JSON.parse(response.body), {
      data: {
        message: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.message'",
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'message'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                data: 'kaboom data'
              }
            ]
          }
        }
      ]
    })

    await promise
  })

  test('should handle when validation is mismatched with the schema and not affect existing functionality', async (t) => {
    const app = Fastify()
    t.after(() => app.close())
    app.register(mercurius, {
      schema,
      resolvers
    })
    const { promise, resolve } = withResolvers()
    app.register(mercuriusValidation, {
      schema: {
        Wrong: {
          text: {
            arg: async () => {
              t.assert.fail('should not be called when type name is wrong')
            }
          }
        },
        Message: {
          wrong: {
            arg: async () => {
              t.assert.fail('should not be called when field name is wrong')
            }
          }
        },
        Query: {
          message: {
            id: async (metadata, argumentValue) => {
              t.assert.ok('should be called')
              t.assert.deepStrictEqual(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.assert.strictEqual(argumentValue, 32768)
              const error = new Error('kaboom')
              error.data = 'kaboom data'
              resolve()
              throw error
            },
            wrong: async () => {
              t.assert.fail('should not be called when arg name is wrong')
            }
          }
        }
      }
    })

    const query = `query {
      message(id: 32768) {
        id
        text
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.assert.deepStrictEqual(JSON.parse(response.body), {
      data: {
        message: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.message'",
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'message'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                data: 'kaboom data'
              }
            ]
          }
        }
      ]
    })

    await promise
  })
})
