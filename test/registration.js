'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const { AssertionError } = require('assert')
const mercuriusValidation = require('..')

const schema = `
  directive @constraint(
    regex: String
  ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | FIELD_DEFINITION

  type Mutation {
    sendMessage(text: String @constraint(regex: "^[A-Za-z0-9 ]$")): String
  }
`

const resolvers = {
  Mutation: {
    sendMessage: async (_, obj) => {
      const { text } = obj
      return text
    }
  }
}

t.test('registrations', t => {
  t.plan(2)

  t.test('registration - should error if mercurius is not loaded', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    try {
      await app.register(mercuriusValidation, {})
    } catch (error) {
      t.same(
        error,
        new AssertionError({
          message:
            "The dependency 'mercurius' of plugin 'mercurius-validation' is not registered",
          actual: false,
          expected: true,
          operator: '=='
        })
      )
    }
  })

  t.test('registration - should register the plugin', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    await app.register(mercuriusValidation, {})
    t.ok('mercurius auth plugin is registered')
  })
})
