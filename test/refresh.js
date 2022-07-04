'use strict'

const t = require('tap')
const FakeTimers = require('@sinonjs/fake-timers')
const { promisify } = require('util')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const immediate = promisify(setImmediate)

const schema = `
  ${mercuriusValidation.graphQLTypeDefs}

  type Message @key(fields: "id") {
    id: ID!
    text: String
  }

  input Filters {
    id: ID
    text: String
  }

  extend type Query {
    message(id: ID @constraint(type: "string" minLength: 1)): Message
    messages(filters: Filters): [Message]
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

t.test('gateway refresh', t => {
  t.plan(1)

  t.test('polling interval with a new schema should trigger refresh of schema policy build', async t => {
    t.plan(2)

    const clock = FakeTimers.install({
      shouldAdvanceTime: true,
      advanceTimeDelta: 40
    })
    t.teardown(() => clock.uninstall())

    const messageService = Fastify()
    const gateway = Fastify()
    t.teardown(async () => {
      await gateway.close()
      await messageService.close()
    })

    messageService.register(mercurius, {
      schema,
      resolvers,
      federationMetadata: true
    })

    await messageService.listen({ port: 0 })

    const messageServicePort = messageService.server.address().port

    await gateway.register(mercurius, {
      gateway: {
        services: [
          {
            name: 'message',
            url: `http://127.0.0.1:${messageServicePort}/graphql`
          }
        ],
        pollingInterval: 2000
      }
    })
    await gateway.register(mercuriusValidation, {})

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
      const res = await gateway.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(res.body), {
        data: {
          message: null,
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
    }

    const newSchema = `
      ${mercuriusValidation.graphQLTypeDefs}

      type Message @key(fields: "id") {
        id: ID!
        text: String
      }

      input Filters {
        id: ID
        text: String @constraint(type: "string" minLength: 1)
      }

      extend type Query {
        message(id: ID @constraint(type: "string" minLength: 1)): Message
        messages(filters: Filters): [Message]
      }
    `
    messageService.graphql.replaceSchema(mercurius.buildFederationSchema(newSchema))
    messageService.graphql.defineResolvers(resolvers)

    await clock.tickAsync(2000)

    // We need the event loop to actually spin twice to
    // be able to propagate the change
    await immediate()
    await immediate()

    {
      const res = await gateway.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(res.body), {
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
    }
  })
})
