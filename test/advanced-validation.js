'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const schema = `
  ${mercuriusValidation.graphQLTypeDefs}

  type Message {
    id: ID!
    text: String
  }

  input Filters {
    id: ID
    text: String @constraint(minLength: 1)
  }

  input NestedFilters {
    input: Filters
  }

  input ArrayFilters {
    values: [String] @constraint(minItems: 1)
    filters: [Filters] @constraint(minItems: 1)
  }

  type Query {
    message(id: ID): Message
    messages(
      filters: Filters @constraint
      nestedFilters: NestedFilters
      arrayScalarFilters: [String] @constraint(minItems: 2)
      arrayObjectFilters: [ArrayFilters] @constraint(minItems: 1)
    ): [Message]
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

t.test('Advanced', t => {
  t.plan(2)

  t.test('when mode is JSON Schema', t => {
    t.plan(1)

    t.test('should all work together', async (t) => {
      t.plan(1)

      const app = Fastify()
      t.teardown(app.close.bind(app))

      app.register(mercurius, {
        schema,
        resolvers
      })
      app.register(mercuriusValidation, {
        schema: {
          ArrayFilters: {
            values: { type: 'array', minItems: 2 }
          },
          Query: {
            message: {
              id: async () => {
                const error = new Error('kaboom')
                error.details = ['kaboom']
                throw error
              }
            }
          }
        }
      })

      const query = `query {
        message(id: "1") {
          id
          text
        }
        messages(
          filters: { text: ""}
          nestedFilters: { input: { text: ""} }
          arrayScalarFilters: [""]
        ) {
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
          message: null,
          messages: null
        },
        errors: [
          {
            message: "Failed Validation on arguments for field 'Query.messages'",
            locations: [
              {
                line: 6,
                column: 9
              }
            ],
            path: [
              'messages'
            ],
            extensions: {
              code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
              name: 'ValidationError',
              details: [
                {
                  instancePath: '/filters/text',
                  schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    type: 'string',
                    minLength: 1,
                    $id: 'https://mercurius.dev/validation/Filters/text'
                  },
                  data: ''
                },
                {
                  instancePath: '/nestedFilters/input/text',
                  schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    type: 'string',
                    minLength: 1,
                    $id: 'https://mercurius.dev/validation/Filters/text'
                  },
                  data: ''
                },
                {
                  instancePath: '/arrayScalarFilters',
                  schemaPath: '#/properties/arrayScalarFilters/minItems',
                  keyword: 'minItems',
                  params: {
                    limit: 2
                  },
                  message: 'must NOT have fewer than 2 items',
                  schema: 2,
                  parentSchema: {
                    minItems: 2,
                    type: 'array',
                    $id: 'https://mercurius.dev/validation/Query/messages/arrayScalarFilters',
                    items: {
                      type: 'string'
                    }
                  },
                  data: [
                    ''
                  ]
                }
              ]
            }
          },
          {
            message: "Failed Validation on arguments for field 'Query.message'",
            locations: [
              {
                line: 2,
                column: 9
              }
            ],
            path: [
              'message'
            ],
            extensions: {
              code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
              name: 'ValidationError',
              details: [
                {
                  details: [
                    'kaboom'
                  ]
                }
              ]
            }
          }
        ]
      })
    })
  })

  t.test('when mode is JTD', t => {
    t.plan(1)

    t.todo('all validators should work together')
  })
})
