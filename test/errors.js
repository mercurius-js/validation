'use strict'

const t = require('tap')
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

t.test('errors', t => {
  t.plan(3)

  t.test('MER_VALIDATION_ERR_FAILED_VALIDATION', t => {
    t.plan(1)

    t.test('toString', t => {
      t.plan(1)

      t.test('should print a validation error to string', t => {
        t.plan(2)

        const error = new errors.MER_VALIDATION_ERR_FAILED_VALIDATION('some message', [])

        t.same(error.toString(), 'ValidationError [MER_VALIDATION_ERR_FAILED_VALIDATION]: some message')
        t.equal(error.statusCode, 400)
      })
    })
  })

  t.test('Validation errors result in a response status code of 400 when result is not nullable', async (t) => {
    t.plan(2)

    const app = Fastify()
    t.teardown(app.close.bind(app))

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

    t.same(JSON.parse(response.body), {
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
    t.equal(response.statusCode, 400)
  })

  t.test('Validation errors result in a response status code of 200 when result is nullable', async (t) => {
    t.plan(2)

    const app = Fastify()
    t.teardown(app.close.bind(app))

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

    t.same(JSON.parse(response.body), {
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
    t.equal(response.statusCode, 200)
  })
})
