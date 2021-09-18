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
    id: ID
    text: String
  }

  input NestedFilters {
    input: Filters
  }

  input ArrayFilters {
    values: [Int]
    filters: [Filters]
  }

  type Query {
    noResolver(id: Int): Int
    message(id: Int): Message
    messages(
      filters: Filters
      nestedFilters: NestedFilters
      arrayScalarFilters: [Int]
      arrayObjectFilters: [ArrayFilters]
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

t.test('JTD validators', t => {
  t.plan(9)

  t.test('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      schema: {
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
      noResolver(id: 1)
      message(id: 1) {
        id
        text
      }
      messages(
        filters: { text: "hello" }
        nestedFilters: { input: { text: "hello" } }
        arrayScalarFilters: [1, 2]
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
        noResolver: null,
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
      mode: 'JTD',
      schema: {
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
      mode: 'JTD',
      schema: {
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
      mode: 'JTD',
      schema: {
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

  t.test('should protect schema list scalar types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      schema: {
        ArrayFilters: {
          values: {
            elements: {
              type: 'int16'
            }
          }
        },
        Query: {
          messages: {
            arrayScalarFilters: {
              elements: {
                type: 'int16'
              }
            }
          }
        }
      }
    })

    const query = `query {
      messages(arrayScalarFilters: [32768]) {
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
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '/optionalProperties/arrayScalarFilters/elements/type',
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

  t.test('should protect schema list input object types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      schema: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        ArrayFilters: {
          values: {
            elements: {
              type: 'int16'
            }
          }
        }
      }
    })

    const query = `query {
      messages(arrayObjectFilters: [{ values: [32768], filters: [{ text: "" }]}]) {
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
                instancePath: '/arrayObjectFilters/0/values/0',
                schemaPath: '/definitions/ArrayFilters/optionalProperties/values/elements/type',
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
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/text',
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
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should protect schema non-null types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      type Message {
        id: ID!
        text: String
      }

      input Filters {
        id: ID
        text: String!
      }

      input NestedFilters {
        input: Filters!
      }

      input ArrayFilters {
        values: [String!]!
        filters: [Filters!]!
      }

      type Query {
        message(id: ID!): Message
        messages(
          filters: Filters!
          nestedFilters: NestedFilters!
          arrayScalarFilters: [String!]!
          arrayObjectFilters: [ArrayFilters!]!
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      schema: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        Query: {
          message: {
            id: { enum: ['hello', 'there'] }
          },
          messages: {
            arrayScalarFilters: {
              elements: { enum: ['hello', 'there'] }
            }
          }
        }
      }
    })

    const query = `query {
      message(id: "") {
        id
        text
      }
      messages(
        filters: { text: ""}
        nestedFilters: { input: { text: ""} }
        arrayScalarFilters: [""]
        arrayObjectFilters: [{ values: [""], filters: { text: "" }}]
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
          message: "Failed Validation on arguments for field 'Query.message'",
          locations: [
            {
              line: 2,
              column: 7
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
                instancePath: '/id',
                schemaPath: '/optionalProperties/id/enum',
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
                data: ''
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [
            {
              line: 6,
              column: 7
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
                data: ''
              },
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
                data: ''
              },
              {
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '/optionalProperties/arrayScalarFilters/elements/enum',
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
                data: ''
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/text',
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
                data: ''
              },
              {
                instancePath: '/arrayObjectFilters/0/values',
                schemaPath: '/definitions/ArrayFilters',
                keyword: 'optionalProperties',
                params: {
                  error: 'additional',
                  additionalProperty: 'values'
                },
                message: 'must NOT have additional properties',
                schema: {
                  filters: {
                    elements: {
                      ref: 'Filters'
                    }
                  }
                },
                parentSchema: {
                  optionalProperties: {
                    filters: {
                      elements: {
                        ref: 'Filters'
                      }
                    }
                  }
                },
                data: {
                  values: [
                    ''
                  ],
                  filters: [
                    {
                      text: ''
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should protect schema fields that have arguments but no associated resolver', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      schema: {
        Query: {
          noResolver: {
            id: { type: 'int16' }
          }
        }
      }
    })

    const query = `query {
      noResolver(id: 32768)
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        noResolver: null
      },
      errors: [
        {
          message: "Failed Validation on arguments for field 'Query.noResolver'",
          locations: [
            {
              line: 2,
              column: 7
            }
          ],
          path: [
            'noResolver'
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

  t.test('should support custom AJV options', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      type Message {
        id: ID!
        text: String
      }

      input Filters {
        id: ID
        text: String!
      }

      input NestedFilters {
        input: Filters!
      }

      input ArrayFilters {
        values: [String!]!
        filters: [Filters!]!
      }

      type Query {
        message(id: ID!): Message
        messages(
          filters: Filters!
          nestedFilters: NestedFilters!
          arrayScalarFilters: [String!]!
          arrayObjectFilters: [ArrayFilters!]!
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      mode: 'JTD',
      allErrors: false,
      schema: {
        Filters: {
          text: { enum: ['hello', 'there'] }
        },
        Query: {
          message: {
            id: { enum: ['hello', 'there'] }
          },
          messages: {
            arrayScalarFilters: {
              elements: { enum: ['hello', 'there'] }
            }
          }
        }
      }
    })

    const query = `query {
      message(id: "") {
        id
        text
      }
      messages(
        filters: { text: ""}
        nestedFilters: { input: { text: ""} }
        arrayScalarFilters: [""]
        arrayObjectFilters: [{ values: [""], filters: { text: "" }}]
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
          message: "Failed Validation on arguments for field 'Query.message'",
          locations: [
            {
              line: 2,
              column: 7
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
                instancePath: '/id',
                schemaPath: '/optionalProperties/id/enum',
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
                data: ''
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [
            {
              line: 6,
              column: 7
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
                data: ''
              }
            ]
          }
        }
      ]
    })
  })
})
