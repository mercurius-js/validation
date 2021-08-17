'use strict'

const t = require('tap')
const FakeTimers = require('@sinonjs/fake-timers')
const { promisify } = require('util')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const immediate = promisify(setImmediate)

t.test('refresh', t => {
  t.plan(1)

  t.skip('polling interval with a new schema should trigger refresh of schema policy build', async (t) => {
    t.plan(4)

    const clock = FakeTimers.install({
      shouldAdvanceTime: true,
      advanceTimeDelta: 40
    })
    t.teardown(() => clock.uninstall())

    const resolvers = {
      Mutation: {
        sendMessage: async (_, obj) => {
          const { text } = obj
          return text
        }
      },
      Message: {
        __resolveReference: (message, args, context, info) => message
      }
    }

    const messageService = Fastify()
    const gateway = Fastify()
    t.teardown(async () => {
      await gateway.close()
      await messageService.close()
    })

    messageService.register(mercurius, {
      schema: `
        directive @constraint(
          regex: String
        ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | FIELD_DEFINITION
      
        type Mutation {
          sendMessage(text: String @constraint(regex: "^[A-Za-z0-9 ]$")): String
        }
      `,
      resolvers: resolvers,
      federationMetadata: true
    })

    await messageService.listen(0)

    const messageServicePort = messageService.server.address().port

    await gateway.register(mercurius, {
      gateway: {
        services: [
          {
            name: 'user',
            url: `http://localhost:${messageServicePort}/graphql`
          }
        ],
        pollingInterval: 2000
      }
    })

    await gateway.register(mercuriusValidation, {
      async applyValidation (validationDirectiveAST, parent, args, context, info) {
        t.ok('should be called')
        return true
      },
      validationDirective: 'constraint'
    })

    {
      const query = `query {
      me {
        id
        name
      }
    }`

      const res = await gateway.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user': 'user' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(res.body), {
        data: {
          me: {
            id: 'u1',
            name: null
          }
        },
        errors: [
          {
            message: 'Failed auth policy check on name',
            locations: [
              {
                line: 4,
                column: 7
              }
            ],
            path: [
              'me',
              'name'
            ]
          }
        ]
      })
    }

    messageService.graphql.replaceSchema(
      mercurius.buildFederationSchema(`
        directive @constraint(
          regex: String
        ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | FIELD_DEFINITION
      
        type Mutation {
          sendMessage(text: String @constraint(regex: "^[A-Za-z ]$")): String
        }
      `)
    )
    messageService.graphql.defineResolvers(resolvers)

    await clock.tickAsync(2000)

    // We need the event loop to actually spin twice to
    // be able to propagate the change
    await immediate()
    await immediate()

    {
      const query = `query {
      me {
        id
        name
        lastName
      }
    }`

      const res = await gateway.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user': 'user' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(res.body), {
        data: {
          me: {
            id: 'u1',
            name: 'John',
            lastName: null
          }
        },
        errors: [
          {
            message: 'Failed auth policy check on lastName',
            locations: [
              {
                line: 5,
                column: 7
              }
            ],
            path: [
              'me',
              'lastName'
            ]
          }
        ]
      })
    }
  })
})
