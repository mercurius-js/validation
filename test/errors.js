'use strict'

const { describe, test } = require('node:test')
const errors = require('../lib/errors')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const schema = `
  ${mercuriusValidation.graphQLTypeDefs}

  type Message {
    id: ID!
    text: String
  }

  type Query {
    # the result type must be non-nullable for the statusCode from the
    # validation error to be propogated. If the result type is nullable
    # then the graphql library does error protection which results in a 
    # status code of 200 ignoring the statusCode on the error:
    messageNotNullable(id: ID @constraint(type: "string" format: "uuid")): Message!
    
    messageNullable(id: ID @constraint(type: "string" format: "uuid")): Message
  }
`

const resolvers = {
  Query: {
    messageNotNullable: async (_, { id }) => ({
      id: 0,
      text: 'Some system message.'
    }),
    messageNullable: async (_, { id }) => null
  }
}

describe('errors', () => {
  describe('MER_VALIDATION_ERR_FAILED_VALIDATION', () => {
    describe('toString', () => {
      test('should print a validation error to string', t => {
        const error = new errors.MER_VALIDATION_ERR_FAILED_VALIDATION('some message', [])

        t.assert.strictEqual(error.toString(), 'ValidationError [MER_VALIDATION_ERR_FAILED_VALIDATION]: some message')
        t.assert.strictEqual(error.statusCode, 400)
      })
    })
  })

  test('Validation errors result in a response status code of 400 when result is not nullable', async (t) => {
    const app = Fastify()
    t.after(() => app.close())

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messageNotNullable(id: "") {
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
      data: null,
      errors: [
        {
          message: 'Failed Validation on arguments for field \'Query.messageNotNullable\'',
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'messageNotNullable'
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
                  $id: 'https://mercurius.dev/validation/Query/messageNotNullable/id',
                  type: 'string',
                  format: 'uuid'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
    t.assert.strictEqual(response.statusCode, 400)
  })

  test('Validation errors result in a response status code of 200 when result is nullable', async (t) => {
    const app = Fastify()
    t.after(() => app.close())

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation)

    const query = `query {
      messageNullable(id: "") {
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
        messageNullable: null
      },
      errors: [
        {
          message: 'Failed Validation on arguments for field \'Query.messageNullable\'',
          locations: [{
            line: 2,
            column: 7
          }],
          path: [
            'messageNullable'
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
                  $id: 'https://mercurius.dev/validation/Query/messageNullable/id',
                  type: 'string',
                  format: 'uuid'
                },
                data: ''
              }
            ]
          }
        }
      ]
    })
    t.assert.strictEqual(response.statusCode, 200)
  })
})
