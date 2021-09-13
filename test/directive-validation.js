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
    text: String @constraint(type: "string" minLength: 1)
  }

  input NestedFilters {
    input: Filters
  }

  input ArrayFilters {
    values: [String] @constraint(minItems: 1)
    filters: [Filters] @constraint(minItems: 1)
  }

  type Query {
    message(id: ID @constraint(type: "string", minLength: 1)): Message
    messages(
      filters: Filters @constraint
      nestedFilters: NestedFilters
      arrayScalarFilters: [String] @constraint(minItems: 1)
      arrayObjectFilters: [ArrayFilters] @constraint(minItems: 1)
    ): [Message]
  }
`

const messages = [
  {
    id: 0,
    text: 'Some system message.',
    unprotectedText: ''
  },
  {
    id: 1,
    text: 'Hello there',
    unprotectedText: ''
  },
  {
    id: 2,
    text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.',
    unprotectedText: ''
  },
  {
    id: 3,
    text: '',
    unprotectedText: ''
  }
]

const resolvers = {
  Query: {
    message: async (_, { id }) => {
      return messages.find(message => message.id === Number(id))
    },
    messages: async (_, { filters }) => {
      return messages
    }
  }
}

t.test('With directives', t => {
  t.plan(8)

  t.test('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: "1") {
        id
        text
      }
      messages(filters: { text: "hello"}, nestedFilters: { input: { text: "hello"} }) {
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
    app.register(mercuriusValidation, {})

    const query = `query {
      message(id: "") {
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
                instancePath: '/id',
                schemaPath: '#/properties/id/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  type: 'string',
                  minLength: 1
                },
                data: ''
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
    app.register(mercuriusValidation, {})

    const query = `query {
      messages(filters: { text: ""}) {
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
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  type: 'string',
                  minLength: 1
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should work alongside existing directives', async (t) => {
    t.plan(1)

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      directive @notUsed on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

      type Message {
        id: ID!
        text: String
      }
    
      input Filters {
        id: ID
        text: String @constraint(type: "string" minLength: 1) @notUsed
      }
    
      input NestedFilters {
        input: Filters
      }
    
      input ArrayFilters {
        values: [String] @constraint(minItems: 1) @notUsed
        filters: [Filters] @constraint(minItems: 1) @notUsed
      }
    
      type Query {
        message(id: ID @constraint(type: "string", minLength: 1)): Message
        messages(
          filters: Filters @notUsed
          nestedFilters: NestedFilters
          arrayScalarFilters: [String] @constraint(minItems: 1) @notUsed
          arrayObjectFilters: [ArrayFilters] @constraint(minItems: 1) @notUsed
        ): [Message]
      }
  `

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {})

    const query = `query {
      message(id: "") {
        id
        text
      }
      messages(filters: { text: ""}) {
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
                schemaPath: '#/properties/id/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  type: 'string',
                  minLength: 1
                },
                data: ''
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [{
            line: 6,
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
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  type: 'string',
                  minLength: 1
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support jit', async (t) => {
    t.plan(2)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers,
      jit: 1
    })
    app.register(mercuriusValidation, {})

    const query = `query {
      message(id: "") {
        id
        text
      }
      messages(filters: { text: ""}) {
        id
        text
      }
    }`

    {
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
                  schemaPath: '#/properties/id/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    $id: 'https://mercurius.dev/validation/Query/message/id',
                    type: 'string',
                    minLength: 1
                  },
                  data: ''
                }
              ]
            }
          },
          {
            message: "Failed Validation on arguments for field 'Query.messages'",
            locations: [{
              line: 6,
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
                  schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    $id: 'https://mercurius.dev/validation/Filters/text',
                    type: 'string',
                    minLength: 1
                  },
                  data: ''
                }
              ]
            }
          }
        ]
      })
    }

    // Trigger JIT compilation
    {
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
                  schemaPath: '#/properties/id/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    $id: 'https://mercurius.dev/validation/Query/message/id',
                    type: 'string',
                    minLength: 1
                  },
                  data: ''
                }
              ]
            }
          },
          {
            message: "Failed Validation on arguments for field 'Query.messages'",
            locations: [{
              line: 6,
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
                  schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                  keyword: 'minLength',
                  params: {
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 characters',
                  schema: 1,
                  parentSchema: {
                    $id: 'https://mercurius.dev/validation/Filters/text',
                    type: 'string',
                    minLength: 1
                  },
                  data: ''
                }
              ]
            }
          }
        ]
      })
    }
  })

  t.todo('should protect schema list scalar types and error accordingly')

  t.todo('should protect schema list input object types and error accordingly')

  t.todo('should protect schema non-null types and error accordingly')
})
