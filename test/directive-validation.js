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
    message(id: ID @constraint(type: "string", minLength: 1)): Message
    messages(
      filters: Filters @constraint
      nestedFilters: NestedFilters
      arrayScalarFilters: [String] @constraint(minItems: 2)
      arrayObjectFilters: [ArrayFilters] @constraint(minItems: 2)
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
  t.plan(27)

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

  t.test('should protect schema list input object types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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

  t.test('should protect schema non-null types and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID!
        text: String
      }

      input Filters {
        id: ID
        text: String! @constraint(minLength: 1)
      }

      input NestedFilters {
        input: Filters!
      }

      input ArrayFilters {
        values: [String!]! @constraint(minItems: 1)
        filters: [Filters!]! @constraint(minItems: 1)
      }

      type Query {
        message(id: ID! @constraint(type: "string", minLength: 1)): Message
        messages(
          filters: Filters!
          nestedFilters: NestedFilters!
          arrayScalarFilters: [String!]! @constraint(minItems: 2)
          arrayObjectFilters: [ArrayFilters!]! @constraint(minItems: 2)
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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

  t.test('should support additional AJV options', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

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
        message(id: ID @constraint(type: "string", minLength: 1, format: "base64")): Message
        messages(
          filters: Filters @constraint
          nestedFilters: NestedFilters
          arrayScalarFilters: [String] @constraint(minItems: 1)
          arrayObjectFilters: [ArrayFilters] @constraint(minItems: 1)
        ): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      formats: {
        base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
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
                  minLength: 1,
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

  t.test('should protect at the input object type level and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      input Filters @constraint(minProperties: 1) {
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(filters: Filters): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                message: 'must NOT have fewer than 1 items',
                schema: 1,
                parentSchema: {
                  minProperties: 1,
                  $id: 'https://mercurius.dev/validation/Filters',
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string',
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

  t.test('should protect at the input object type level alongside existing field validation and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      input Filters @constraint(minProperties: 2) {
        text: String  @constraint(minLength: 1)
      }

      type Query {
        message(id: ID): Message
        messages(filters: Filters): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  minProperties: 2,
                  $id: 'https://mercurius.dev/validation/Filters',
                  type: 'object',
                  properties: {
                    text: {
                      minLength: 1,
                      type: 'string',
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
                  type: 'string',
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

  t.test('should support the JSON Schema "type" input and error accordingly', async t => {
    t.plan(2)

    t.test('should support a single type', async t => {
      t.plan(1)

      const app = Fastify()
      t.teardown(app.close.bind(app))

      const schema = `
        ${mercuriusValidation.graphQLTypeDefs}
  
        type Message {
          id: ID
          text: String
        }
  
        type Query {
          message(id: ID @constraint(type: "number")): Message
          messages: [Message]
        }
      `

      app.register(mercurius, {
        schema,
        resolvers
      })
      app.register(mercuriusValidation)

      const query = `query {
        message(id: "not-number") {
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
                  instancePath: '/id',
                  schemaPath: '#/properties/id/type',
                  keyword: 'type',
                  params: {
                    type: 'number'
                  },
                  message: 'must be number',
                  schema: 'number',
                  parentSchema: {
                    type: 'number',
                    $id: 'https://mercurius.dev/validation/Query/message/id'
                  },
                  data: 'not-number'
                }
              ]
            }
          }
        ]
      })
    })

    t.test('should support multiple types', async t => {
      t.plan(1)

      const app = Fastify()
      t.teardown(app.close.bind(app))

      const schema = `
        ${mercuriusValidation.graphQLTypeDefs}
  
        type Message {
          id: ID
          text: String
        }
  
        type Query {
          message(id: ID @constraint(type: ["number", "integer"])): Message
          messages: [Message]
        }
      `

      app.register(mercurius, {
        schema,
        resolvers
      })
      app.register(mercuriusValidation)

      const query = `query {
        message(id: "not-number") {
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
            message:
              "Failed Validation on arguments for field 'Query.message'",
            locations: [
              {
                line: 2,
                column: 9
              }
            ],
            path: ['message'],
            extensions: {
              code: 'MER_VALIDATION_ERR_FAILED_VALIDATION',
              name: 'ValidationError',
              details: [
                {
                  instancePath: '/id',
                  schemaPath: '#/properties/id/type',
                  keyword: 'type',
                  params: {
                    type: ['number', 'integer']
                  },
                  message: 'must be number,integer',
                  schema: [
                    'number',
                    'integer'
                  ],
                  parentSchema: {
                    type: [
                      'number',
                      'integer'
                    ],
                    $id: 'https://mercurius.dev/validation/Query/message/id'
                  },
                  data: 'not-number'
                }
              ]
            }
          }
        ]
      })
    })
  })

  t.test('should support the JSON Schema "maxLength" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "string", maxLength: 1)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: "too-long") {
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
                schemaPath: '#/properties/id/maxLength',
                keyword: 'maxLength',
                params: {
                  limit: 1
                },
                message: 'must NOT have more than 1 characters',
                schema: 1,
                parentSchema: {
                  type: 'string',
                  maxLength: 1,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 'too-long'
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "minLength" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "string", minLength: 1)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                  type: 'string',
                  minLength: 1,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "format" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "string", format: "uuid")): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                  format: 'uuid'
                },
                message: 'must match format "uuid"',
                schema: 'uuid',
                parentSchema: {
                  type: 'string',
                  format: 'uuid',
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "pattern" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "string", pattern: "^[A-Za-z0-9]+$")): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                schemaPath: '#/properties/id/pattern',
                keyword: 'pattern',
                params: {
                  pattern: '^[A-Za-z0-9]+$'
                },
                message: 'must match pattern "^[A-Za-z0-9]+$"',
                schema: '^[A-Za-z0-9]+$',
                parentSchema: {
                  type: 'string',
                  pattern: '^[A-Za-z0-9]+$',
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "maximum" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "number", maximum: 10)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: 11) {
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
                schemaPath: '#/properties/id/maximum',
                keyword: 'maximum',
                params: {
                  comparison: '<=',
                  limit: 10
                },
                message: 'must be <= 10',
                schema: 10,
                parentSchema: {
                  type: 'number',
                  maximum: 10,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 11
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "minimum" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "number", minimum: 1)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                  type: 'number',
                  minimum: 1,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 0
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "exclusiveMaximum" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "number", exclusiveMaximum: 10)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: 10) {
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
                schemaPath: '#/properties/id/exclusiveMaximum',
                keyword: 'exclusiveMaximum',
                params: {
                  comparison: '<',
                  limit: 10
                },
                message: 'must be < 10',
                schema: 10,
                parentSchema: {
                  type: 'number',
                  exclusiveMaximum: 10,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 10
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "exclusiveMinimum" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "number", exclusiveMinimum: 1)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: 1) {
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
                schemaPath: '#/properties/id/exclusiveMinimum',
                keyword: 'exclusiveMinimum',
                params: {
                  comparison: '>',
                  limit: 1
                },
                message: 'must be > 1',
                schema: 1,
                parentSchema: {
                  type: 'number',
                  exclusiveMinimum: 1,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 1
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "multipleOf" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID @constraint(type: "number", multipleOf: 2)): Message
        messages: [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      message(id: 3) {
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
                schemaPath: '#/properties/id/multipleOf',
                keyword: 'multipleOf',
                params: {
                  multipleOf: 2
                },
                message: 'must be multiple of 2',
                schema: 2,
                parentSchema: {
                  type: 'number',
                  multipleOf: 2,
                  $id: 'https://mercurius.dev/validation/Query/message/id'
                },
                data: 3
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "maxProperties" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      input Filters {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(filters: Filters @constraint(maxProperties: 1)): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messages(filters: { id: "", text: ""}) {
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
                schemaPath: '#/properties/filters/maxProperties',
                keyword: 'maxProperties',
                params: {
                  limit: 1
                },
                message: 'must NOT have more than 1 items',
                schema: 1,
                parentSchema: {
                  maxProperties: 1,
                  $id: 'https://mercurius.dev/validation/Query/messages/filters',
                  type: 'object',
                  $ref: 'https://mercurius.dev/validation/Filters'
                },
                data: {
                  id: '',
                  text: ''
                }
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "minProperties" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      input Filters {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(filters: Filters @constraint(minProperties: 1)): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

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
                schemaPath: '#/properties/filters/minProperties',
                keyword: 'minProperties',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 items',
                schema: 1,
                parentSchema: {
                  minProperties: 1,
                  $id: 'https://mercurius.dev/validation/Query/messages/filters',
                  type: 'object',
                  $ref: 'https://mercurius.dev/validation/Filters'
                },
                data: {}
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "maxItems" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(ids: [ID] @constraint(maxItems: 1)): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messages(ids: [1, 2]) {
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
                instancePath: '/ids',
                schemaPath: '#/properties/ids/maxItems',
                keyword: 'maxItems',
                params: {
                  limit: 1
                },
                message: 'must NOT have more than 1 items',
                schema: 1,
                parentSchema: {
                  maxItems: 1,
                  $id: 'https://mercurius.dev/validation/Query/messages/ids',
                  type: 'array',
                  items: {}
                },
                data: [
                  '1',
                  '2'
                ]
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "minItems" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(ids: [ID] @constraint(minItems: 1)): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messages(ids: []) {
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
                instancePath: '/ids',
                schemaPath: '#/properties/ids/minItems',
                keyword: 'minItems',
                params: {
                  limit: 1
                },
                message: 'must NOT have fewer than 1 items',
                schema: 1,
                parentSchema: {
                  minItems: 1,
                  $id: 'https://mercurius.dev/validation/Query/messages/ids',
                  type: 'array',
                  items: {}
                },
                data: []
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the JSON Schema "uniqueItems" input and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(ids: [ID] @constraint(uniqueItems: true)): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messages(ids: [1, 1]) {
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
                instancePath: '/ids',
                schemaPath: '#/properties/ids/uniqueItems',
                keyword: 'uniqueItems',
                params: {
                  i: 1,
                  j: 0
                },
                message: 'must NOT have duplicate items (items ## 0 and 1 are identical)',
                schema: true,
                parentSchema: {
                  uniqueItems: true,
                  $id: 'https://mercurius.dev/validation/Query/messages/ids',
                  type: 'array',
                  items: {}
                },
                data: [
                  '1',
                  '1'
                ]
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should support the custom "schema" input for unsupported JSON schemas and error accordingly', async t => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    const idValidationSchema = JSON.stringify({
      items: { type: 'integer' }
    }).replace(/"/g, '\\"')

    const schema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message {
        id: ID
        text: String
      }

      type Query {
        message(id: ID): Message
        messages(ids: [ID] @constraint(minItems: 2 schema: "${idValidationSchema}")): [Message]
      }
    `

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messages(ids: ["1.1"]) {
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
                instancePath: '/ids',
                schemaPath: '#/properties/ids/minItems',
                keyword: 'minItems',
                params: {
                  limit: 2
                },
                message: 'must NOT have fewer than 2 items',
                schema: 2,
                parentSchema: {
                  minItems: 2,
                  items: {
                    type: 'integer'
                  },
                  $id: 'https://mercurius.dev/validation/Query/messages/ids',
                  type: 'array'
                },
                data: [
                  '1.1'
                ]
              },
              {
                instancePath: '/ids/0',
                schemaPath: '#/properties/ids/items/type',
                keyword: 'type',
                params: {
                  type: 'integer'
                },
                message: 'must be integer',
                schema: 'integer',
                parentSchema: {
                  type: 'integer'
                },
                data: '1.1'
              }
            ]
          }
        }
      ]
    })
  })

  t.test('should be able to turn off directive validation', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, { directiveValidation: false })

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
})
