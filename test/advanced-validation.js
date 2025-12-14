'use strict'

const { describe, test } = require('node:test')
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
    message(id: ID @constraint(type: "string" format: "uuid")): Message
    messages(
      filters: Filters
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

describe('Advanced', () => {
  describe('when mode is JSON Schema', () => {
    test('should all work independently together', async t => {
      const app = Fastify()
      t.after(() => app.close())

      app.register(mercurius, {
        schema,
        resolvers
      })
      app.register(mercuriusValidation, {
        schema: {
          Filters: {
            text: { minLength: 1 }
          },
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
          filters: { text: "" }
          arrayObjectFilters: [
            { values: [] }, { values: ["hello", "there"] }
          ]
        ) {
          id
          text
        }
        directiveMessages: messages(
          arrayScalarFilters: [""]
          arrayObjectFilters: []
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

      t.assert.deepStrictEqual(JSON.parse(response.body), {
        data: {
          message: null,
          messages: null,
          directiveMessages: null
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
                    minLength: 1,
                    type: ['string', 'null'],
                    $id: 'https://mercurius.dev/validation/Filters/text'
                  },
                  data: ''
                },
                {
                  instancePath: '/arrayObjectFilters/0/values',
                  schemaPath: '#/properties/values/minItems',
                  keyword: 'minItems',
                  params: {
                    limit: 2
                  },
                  message: 'must NOT have fewer than 2 items',
                  schema: 2,
                  parentSchema: {
                    minItems: 2,
                    type: 'array',
                    $id: 'https://mercurius.dev/validation/ArrayFilters/values',
                    items: {
                      type: ['string', 'null']
                    },
                    nullable: true
                  },
                  data: []
                }
              ]
            }
          },
          {
            message: "Failed Validation on arguments for field 'Query.messages'",
            locations: [
              {
                line: 15,
                column: 9
              }
            ],
            path: [
              'directiveMessages'
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
                    minItems: 2,
                    type: 'array',
                    $id: 'https://mercurius.dev/validation/Query/messages/arrayScalarFilters',
                    items: {
                      type: ['string', 'null']
                    },
                    nullable: true
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
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 items',
                  schema: 1,
                  parentSchema: {
                    minItems: 1,
                    $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                    type: 'array',
                    items: {
                      $ref: 'https://mercurius.dev/validation/ArrayFilters'
                    },
                    nullable: true
                  },
                  data: []
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

    test('directive validation should run after in-band validation', async t => {
      const app = Fastify()
      t.after(() => app.close())

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

      {
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

        t.assert.deepStrictEqual(JSON.parse(response.body), {
          data: {
            message: null
          },
          errors: [
            {
              message: "Failed Validation on arguments for field 'Query.message'",
              locations: [
                {
                  line: 2,
                  column: 11
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
      }

      {
        const query = `query {
          message(id: "not-uuid") {
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
              locations: [
                {
                  line: 2,
                  column: 11
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
                    data: 'not-uuid'
                  }
                ]
              }
            }
          ]
        })
      }
    })
  })

  describe('when mode is JTD', () => {
    test('should all work independently together', async t => {
      const app = Fastify()
      t.after(() => app.close())

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
          filters: { text: "" }
        ) {
          id
          text
        }
        directiveMessages: messages(
          arrayScalarFilters: [""]
          arrayObjectFilters: []
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

      t.assert.deepStrictEqual(JSON.parse(response.body), {
        data: {
          message: null,
          messages: null,
          directiveMessages: null
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
          },
          {
            message: "Failed Validation on arguments for field 'Query.messages'",
            locations: [
              {
                line: 12,
                column: 9
              }
            ],
            path: [
              'directiveMessages'
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
                    minItems: 2,
                    type: 'array',
                    $id: 'https://mercurius.dev/validation/Query/messages/arrayScalarFilters',
                    items: {
                      type: ['string', 'null']
                    },
                    nullable: true
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
                    limit: 1
                  },
                  message: 'must NOT have fewer than 1 items',
                  schema: 1,
                  parentSchema: {
                    minItems: 1,
                    $id: 'https://mercurius.dev/validation/Query/messages/arrayObjectFilters',
                    type: 'array',
                    items: {
                      $ref: 'https://mercurius.dev/validation/ArrayFilters'
                    },
                    nullable: true
                  },
                  data: []
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

    test('directive validation should run after in-band validation', async t => {
      const app = Fastify()
      t.after(() => app.close())

      app.register(mercurius, {
        schema,
        resolvers
      })
      app.register(mercuriusValidation, {
        mode: 'JTD',
        schema: {
          Query: {
            message: {
              id: { enum: ['hello', 'there'] }
            }
          }
        }
      })

      {
        const query = `query {
          message(id: "wrong") {
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
              locations: [
                {
                  line: 2,
                  column: 11
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
                    data: 'wrong'
                  }
                ]
              }
            }
          ]
        })
      }

      {
        const query = `query {
          message(id: "hello") {
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
              locations: [
                {
                  line: 2,
                  column: 11
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
                    data: 'hello'
                  }
                ]
              }
            }
          ]
        })
      }
    })
  })
})
