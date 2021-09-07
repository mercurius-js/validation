'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

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
    message(id: Int): Message
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

t.test('basic with policy', t => {
  t.plan(6)

  t.test('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      validationSchemaMode: 'JTD',
      validation: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        Query: {
          message: {
            id: { type: 'int16' }
          }
        }
      }
    })

    const query = `query {
      message(id: 1) {
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
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      validationSchemaMode: 'JTD',
      validation: {
        Query: {
          message: {
            id: { type: 'int16' }
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
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
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
                instancePath: '/id',
                schemaPath: '/optionalProperties/id/type',
                keyword: 'type',
                params: {
                  type: 'int16',
                  nullable: false
                },
                message: 'must be int16',
                schema: 'int16',
                parentSchema: {
                  type: 'int16'
                },
                data: 32768
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should protect the schema input types and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      validationSchemaMode: 'JTD',
      validation: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        Query: {
          message: {
            id: { type: 'int16' }
          }
        }
      }
    })

    const query = `query {
      messages(filters: { text: "wrong"}) {
        id
        text
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        messages: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'messages'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                instancePath: '/filters/text',
                schemaPath: '/definitions/Filters/optionalProperties/text/enum',
                keyword: 'enum',
                params: {
                  allowedValues: [
                    'hello',
                    'there'
                  ]
                },
                message: 'must be equal to one of the allowed values',
                schema: [
                  'hello',
                  'there'
                ],
                parentSchema: {
                  enum: [
                    'hello',
                    'there'
                  ]
                },
                data: 'wrong'
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should protect the schema input types with nested types and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      validationSchemaMode: 'JTD',
      validation: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        Query: {
          message: {
            id: { type: 'int16' }
          }
        }
      }
    })

    const query = `query {
      messages(filters: { text: "hello"}, nestedFilters: { input: { text: "wrong" }}) {
        id
        text
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        messages: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'messages'
          ],
          extensions: {
            code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
            name: 'ValidationError',
            details: [
              {
                instancePath: '/nestedFilters/input/text',
                schemaPath: '/definitions/Filters/optionalProperties/text/enum',
                keyword: 'enum',
                params: {
                  allowedValues: [
                    'hello',
                    'there'
                  ]
                },
                message: 'must be equal to one of the allowed values',
                schema: [
                  'hello',
                  'there'
                ],
                parentSchema: {
                  enum: [
                    'hello',
                    'there'
                  ]
                },
                data: 'wrong'
              }
            ]
          }
        }
      ]
    })
  })

  t.todo('should protect schema list scalar types and error accordingly')

  t.todo('should protect schema list input object types and error accordingly')
})
