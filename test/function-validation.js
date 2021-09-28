'use strict'

const t = require('tap')
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

t.test('Function validators', t => {
  t.plan(3)

  t.test('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(9)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Query: {
          message: {
            id: async (metadata, argumentValue, parent, args, context, info) => {
              t.ok('should be called')
              t.same(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.equal(argumentValue, 1)
              t.type(parent, 'object')
              t.type(args, 'object')
              t.type(context, 'object')
              t.type(info, 'object')
              t.type(info.schema, GraphQLSchema)
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

    t.same(JSON.parse(response.body), {
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
  })

  t.test('should protect the schema arguments and error accordingly', async (t) => {
    t.plan(4)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Query: {
          message: {
            id: async (metadata, argumentValue) => {
              t.ok('should be called')
              t.same(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.equal(argumentValue, 32768)
              const error = new Error('kaboom')
              error.data = 'kaboom data'
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

    t.same(JSON.parse(response.body), {
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
  })

  t.test('should handle when validation is mismatched with the schema and not affect existing functionality', async (t) => {
    t.plan(4)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Wrong: {
          text: {
            arg: async () => {
              t.fail('should not be called when type name is wrong')
            }
          }
        },
        Message: {
          wrong: {
            arg: async () => {
              t.fail('should not be called when field name is wrong')
            }
          }
        },
        Query: {
          message: {
            id: async (metadata, argumentValue) => {
              t.ok('should be called')
              t.same(metadata, { type: 'Query', field: 'message', argument: 'id' })
              t.equal(argumentValue, 32768)
              const error = new Error('kaboom')
              error.data = 'kaboom data'
              throw error
            },
            wrong: async () => {
              t.fail('should not be called when arg name is wrong')
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

    t.same(JSON.parse(response.body), {
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
  })
})
