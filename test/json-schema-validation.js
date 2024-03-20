'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')
const { MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED } = require('../lib/errors')
const { GraphQLBoolean } = require('graphql')

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
    values: [String]
    filters: [Filters]
  }

  type Query {
    noResolver(id: ID): ID
    message(id: ID): Message
    messages(
      filters: Filters
      nestedFilters: NestedFilters
      arrayScalarFilters: [String]
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

t.test('JSON Schema validators', t => {
  t.plan(19)

  t.test('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          text: { type: 'string', minLength: 1 }
        },
        Query: {
          message: {
            id: { type: 'string', minLength: 1 }
          }
        }
      }
    })

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
    app.register(mercuriusValidation, {
      schema: {
        Query: {
          message: {
            id: { type: 'string', minLength: 1 }
          }
        }
      }
    })

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
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          text: { type: 'string', minLength: 1 }
        }
      }
    })

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
                  type: ['string', 'null'],
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

  t.test('should protect the schema input types with nested types and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          text: { type: 'string', minLength: 1 }
        }
      }
    })

    const query = `query {
      messages(filters: { text: "hello"}, nestedFilters: { input: { text: ""} }) {
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
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  type: ['string', 'null'],
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

  t.test('should error when type is undefined and cannot be inferred', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })

    t.rejects(app.register(mercuriusValidation, {
      schema: {
        Filters: {
          id: { minLength: 1 }
        }
      }
    }), new MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED('https://mercurius.dev/validation/Filters/id'))
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
      schema: {
        Query: {
          messages: {
            arrayScalarFilters: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1
              },
              minItems: 2
            }
          }
        }
      }
    })

    const query = `query {
      messages(arrayScalarFilters: [""]) {
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
                instancePath: '/arrayScalarFilters',
                schemaPath: '#/properties/arrayScalarFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayScalarFilters',
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1
                  },
                  minItems: 2
                },
                data: ['']
              },
              {
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '#/properties/arrayScalarFilters/items/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
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

  t.test('should protect schema list input object types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          text: { type: 'string', minLength: 1 }
        },
        Query: {
          messages: {
            arrayObjectFilters: {
              type: 'array',
              minItems: 2
            }
          }
        }
      }
    })

    const query = `query {
      messages(arrayObjectFilters: [{ filters: { text: "" }}]) {
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
                instancePath: '/arrayObjectFilters',
                schemaPath: '#/properties/arrayObjectFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                  type: 'array',
                  items: {
                    $ref: 'https://mercurius.dev/validation/ArrayFilters'
                  },
                  minItems: 2
                },
                data: [{ filters: [{ text: '' }] }]
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/text',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  type: ['string', 'null'],
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
      schema: {
        Filters: {
          text: { type: 'string', minLength: 1 }
        },
        Query: {
          message: {
            id: { type: 'string', minLength: 1 }
          },
          messages: {
            arrayObjectFilters: {
              type: 'array',
              minItems: 2
            },
            arrayScalarFilters: {
              type: 'array',
              minItems: 2
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
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  type: 'string',
                  minLength: 1
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
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayScalarFilters',
                  type: 'array',
                  minItems: 2,
                  items: {
                    type: 'string'
                  }
                },
                data: [
                  ''
                ]
              },
              {
                instancePath: '/arrayObjectFilters',
                schemaPath: '#/properties/arrayObjectFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                  type: 'array',
                  items: {
                    $ref: 'https://mercurius.dev/validation/ArrayFilters'
                  },
                  minItems: 2
                },
                data: [{ values: [''], filters: [{ text: '' }] }]
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/text',
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

  t.test('should protect schema fields that have arguments but no associated resolver', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Query: {
          noResolver: {
            id: { type: 'string', minLength: 1 }
          }
        }
      }
    })

    const query = `query {
      noResolver(id: "")
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
                schemaPath: '#/properties/id/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/noResolver/id',
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

  t.test('should protect at the input object type level and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          __typeValidation: {
            minProperties: 1
          }
        }
      }
    })

    const query = `query {
      messages(filters: {}) {
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
          locations: [
            {
              line: 2,
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
                instancePath: '/filters',
                schemaPath: 'https://mercurius.dev/validation/Filters/minProperties',
                keyword: 'minProperties',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 properties',
                schema: 1,
                parentSchema: {
                  minProperties: 1,
                  $id: 'https://mercurius.dev/validation/Filters',
                  type: 'object',
                  properties: {
                    text: {
                      type: ['string', 'null'],
                      $id: 'https://mercurius.dev/validation/Filters/text'
                    }
                  }
                },
                data: {}
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should protect at the input object type level alongside existing field validations and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          __typeValidation: {
            minProperties: 2
          },
          text: { minLength: 1 }
        }
      }
    })

    const query = `query {
      messages(filters: { text: "" }) {
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
          locations: [
            {
              line: 2,
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
                instancePath: '/filters',
                schemaPath: 'https://mercurius.dev/validation/Filters/minProperties',
                keyword: 'minProperties',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 properties',
                schema: 2,
                parentSchema: {
                  minProperties: 2,
                  $id: 'https://mercurius.dev/validation/Filters',
                  type: 'object',
                  properties: {
                    text: {
                      minLength: 1,
                      type: ['string', 'null'],
                      $id: 'https://mercurius.dev/validation/Filters/text'
                    }
                  }
                },
                data: {
                  text: ''
                }
              },
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
                  minLength: 1,
                  type: ['string', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/text'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should coerce types by default on scalar types', async (t) => {
    t.plan(1)

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
            id: { type: 'integer', minimum: 1 }
          }
        }
      }
    })

    const query = `query {
      message(id: 0) {
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
                schemaPath: '#/properties/id/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  type: 'integer',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should infer types for String scalar types', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      type Message {
        text: String
      }

      input Filters {
        text: String
      }

      input NestedFilters {
        input: Filters
      }

      input ArrayFilters {
        values: [String]
        filters: [Filters]
      }

      type Query {
        message(id: String): Message
        messages(
          filters: Filters
          nestedFilters: NestedFilters
          arrayScalarFilters: [String]
          arrayObjectFilters: [ArrayFilters]
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          text: { minLength: 1 }
        },
        Query: {
          message: {
            id: { minLength: 1 }
          },
          messages: {
            arrayObjectFilters: {
              type: 'array',
              minItems: 2
            },
            arrayScalarFilters: {
              type: 'array',
              items: { minLength: 1 }
            }
          }
        }
      }
    })

    const query = `query {
      message(id: "") {
        text
      }
      messages(
        filters: { text: ""}
        nestedFilters: { input: { text: ""} }
        arrayScalarFilters: [""]
        arrayObjectFilters: [{ filters: { text: "" }}]
      ) {
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
                schemaPath: '#/properties/id/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  type: ['string', 'null'],
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  minLength: 1
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
              line: 5,
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
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  type: ['string', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  minLength: 1
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
                  type: ['string', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/text',
                  minLength: 1
                },
                data: ''
              },
              {
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '#/properties/arrayScalarFilters/items/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  type: ['string', 'null'],
                  minLength: 1
                },
                data: ''
              },
              {
                instancePath: '/arrayObjectFilters',
                schemaPath: '#/properties/arrayObjectFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                  type: 'array',
                  items: {
                    $ref: 'https://mercurius.dev/validation/ArrayFilters'
                  },
                  minItems: 2
                },
                data: [
                  {
                    filters: [
                      {
                        text: ''
                      }
                    ]
                  }
                ]
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/text',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/text/minLength',
                keyword: 'minLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 characters',
                schema: 1,
                parentSchema: {
                  type: ['string', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/text',
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

  t.test('should infer types for Int scalar types', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      type Message {
        text: String
      }

      input Filters {
        value: Int
      }

      input NestedFilters {
        input: Filters
      }

      input ArrayFilters {
        values: [Int]
        filters: [Filters]
      }

      type Query {
        message(id: Int): Message
        messages(
          filters: Filters
          nestedFilters: NestedFilters
          arrayScalarFilters: [Int]
          arrayObjectFilters: [ArrayFilters]
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          value: { minimum: 1 }
        },
        Query: {
          message: {
            id: { minimum: 1 }
          },
          messages: {
            arrayObjectFilters: {
              type: 'array',
              minItems: 2
            },
            arrayScalarFilters: {
              type: 'array',
              items: { minimum: 1 }
            }
          }
        }
      }
    })

    const query = `query {
      message(id: 0) {
        text
      }
      messages(
        filters: { value: 0}
        nestedFilters: { input: { value: 0 } }
        arrayScalarFilters: [0]
        arrayObjectFilters: [{ filters: { value: 0 }}]
      ) {
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
                schemaPath: '#/properties/id/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['integer', 'null'],
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [
            {
              line: 5,
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
                instancePath: '/filters/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['integer', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/nestedFilters/input/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['integer', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '#/properties/arrayScalarFilters/items/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['integer', 'null'],
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/arrayObjectFilters',
                schemaPath: '#/properties/arrayObjectFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                  type: 'array',
                  items: {
                    $ref: 'https://mercurius.dev/validation/ArrayFilters'
                  },
                  minItems: 2
                },
                data: [
                  {
                    filters: [
                      {
                        value: 0
                      }
                    ]
                  }
                ]
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['integer', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should infer types for Float scalar types', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      type Message {
        text: String
      }

      input Filters {
        value: Float
      }

      input NestedFilters {
        input: Filters
      }

      input ArrayFilters {
        values: [Float]
        filters: [Filters]
      }

      type Query {
        message(id: Float): Message
        messages(
          filters: Filters
          nestedFilters: NestedFilters
          arrayScalarFilters: [Float]
          arrayObjectFilters: [ArrayFilters]
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          value: { minimum: 1 }
        },
        Query: {
          message: {
            id: { minimum: 1 }
          },
          messages: {
            arrayObjectFilters: {
              type: 'array',
              minItems: 2
            },
            arrayScalarFilters: {
              type: 'array',
              items: { minimum: 1 }
            }
          }
        }
      }
    })

    const query = `query {
      message(id: 0) {
        text
      }
      messages(
        filters: { value: 0}
        nestedFilters: { input: { value: 0 } }
        arrayScalarFilters: [0]
        arrayObjectFilters: [{ filters: { value: 0 }}]
      ) {
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
                schemaPath: '#/properties/id/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['number', 'null'],
                  $id: 'https://mercurius.dev/validation/Query/message/id',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        },
        {
          message: "Failed Validation on arguments for field 'Query.messages'",
          locations: [
            {
              line: 5,
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
                instancePath: '/filters/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['number', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/nestedFilters/input/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['number', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/arrayScalarFilters/0',
                schemaPath: '#/properties/arrayScalarFilters/items/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['number', 'null'],
                  minimum: 1
                },
                data: 0
              },
              {
                instancePath: '/arrayObjectFilters',
                schemaPath: '#/properties/arrayObjectFilters/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                  type: 'array',
                  items: {
                    $ref: 'https://mercurius.dev/validation/ArrayFilters'
                  },
                  minItems: 2
                },
                data: [
                  {
                    filters: [
                      {
                        value: 0
                      }
                    ]
                  }
                ]
              },
              {
                instancePath: '/arrayObjectFilters/0/filters/0/value',
                schemaPath: 'https://mercurius.dev/validation/Filters/properties/value/minimum',
                keyword: 'minimum',
                params: {
                  comparison: '>=',
                  limit: 1
                },
                message: 'must be >= 1',
                schema: 1,
                parentSchema: {
                  type: ['number', 'null'],
                  $id: 'https://mercurius.dev/validation/Filters/value',
                  minimum: 1
                },
                data: 0
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support additional AJV options', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      formats: {
        base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
      },
      schema: {
        Query: {
          message: {
            id: { type: 'string', format: 'base64' }
          }
        }
      }
    })

    const query = `query {
      message(id: "not-base-64") {
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
                schemaPath: '#/properties/id/format',
                keyword: 'format',
                params: {
                  format: 'base64'
                },
                message: 'must match format "base64"',
                schema: 'base64',
                parentSchema: {
                  type: 'string',
                  format: 'base64',
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 'not-base-64'
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support custom errors', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      formats: {
        base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
      },
      schema: {
        Query: {
          message: {
            id: { type: 'string', format: 'base64', errorMessage: { format: 'Input must be in base64 format.' } }
          }
        }
      }
    })

    const query = `query {
      message(id: "not-base-64") {
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
                schemaPath: '#/properties/id/errorMessage',
                keyword: 'errorMessage',
                params: {
                  errors: [
                    {
                      instancePath: '/id',
                      schemaPath: '#/properties/id/format',
                      keyword: 'format',
                      params: {
                        format: 'base64'
                      },
                      message: 'must match format "base64"',
                      schema: 'base64',
                      parentSchema: {
                        type: 'string',
                        format: 'base64',
                        errorMessage: {
                          format: 'Input must be in base64 format.'
                        },
                        $id: 'https://mercurius.dev/validation/Query/message/id'
                      },
                      data: 'not-base-64',
                      emUsed: true
                    }
                  ]
                },
                message: 'Input must be in base64 format.',
                schema: {
                  format: 'Input must be in base64 format.'
                },
                parentSchema: {
                  type: 'string',
                  format: 'base64',
                  errorMessage: {
                    format: 'Input must be in base64 format.'
                  },
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 'not-base-64'
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support nullable input type arguments', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema: `type Query {
        nullableInput(input: String): String
      }`,
      resolvers: {
        Query: {
          nullableInput: async (_, { input }) => {
            return input
          }
        }
      }
    })
    app.register(mercuriusValidation)

    const query = `query {
      nullableInput(input: null)
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(response.json(), {
      data: {
        nullableInput: null
      }
    })
  })

  t.test('should invoke customTypeInferenceFn option and not affect operations when everything is okay', async (t) => {
    const productSchema = `
      type Product {
        id: ID!
        text: String
        isAvailable: Boolean
      }

      input Filters {
        id: ID
        text: String
        isAvailable: Boolean
      }

      type Query {
        noResolver(id: ID): ID
        product(id: ID): Product
        products(
          filters: Filters
        ): [Product]
      }
    `

    const products = [
      {
        id: 0,
        text: 'Phone',
        isAvailable: true
      },
      {
        id: 1,
        text: 'Laptop',
        isAvailable: true
      },
      {
        id: 2,
        text: 'Keyboard',
        isAvailable: false
      }
    ]

    const productResolvers = {
      Query: {
        product: async (_, { id }) => {
          return products.find(product => product.id === Number(id))
        },
        products: async (_, { filters }) => {
          return products.filter(product => product.isAvailable === filters.isAvailable)
        }
      }
    }

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema: productSchema,
      resolvers: productResolvers
    })
    app.register(mercuriusValidation, {
      schema: {
        Filters: {
          isAvailable: { type: 'boolean' }
        },
        Query: {
          product: {
            id: { type: 'string', minLength: 1 }
          }
        }
      },
      customTypeInferenceFn: (type, isNonNull) => {
        if (type === GraphQLBoolean) {
          return isNonNull ? { type: 'boolean' } : { type: ['boolean', 'null'] }
        }
      }
    })

    const query = `query {
      product(id: "1") {
        id
        text
        isAvailable
      }
      products(filters: { isAvailable: true }) {
        id
        text
        isAvailable
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
        product: {
          id: 1,
          text: 'Laptop',
          isAvailable: true
        },
        products: [
          {
            id: 0,
            text: 'Phone',
            isAvailable: true
          },
          {
            id: 1,
            text: 'Laptop',
            isAvailable: true
          }
        ]
      }
    })
  })
})
