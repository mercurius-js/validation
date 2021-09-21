'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const { AssertionError } = require('assert')
const mercuriusValidation = require('..')
const { MER_VALIDATION_ERR_INVALID_OPTS } = require('../lib/errors')

const schema = `
  directive @constraint(
    pattern: String
  ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | FIELD_DEFINITION

  type Mutation {
    sendMessage(text: String @constraint(pattern: "^[A-Za-z0-9 ]$")): String
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
  t.plan(5)

  t.test('registration - should error if mercurius is not loaded', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    t.rejects(app.register(mercuriusValidation, {}), new AssertionError({
      message:
              "The dependency 'mercurius' of plugin 'mercurius-validation' is not registered",
      actual: false,
      expected: true,
      operator: '=='
    }))
  })

  t.test('registration - should error if schema is defined but not an object', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })

    t.rejects(
      app.register(mercuriusValidation, { schema: 'string' }),
      new MER_VALIDATION_ERR_INVALID_OPTS('opts.schema must be an object.')
    )
  })

  t.test('registration - should error if schema type is not an object', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })

    t.rejects(
      app.register(mercuriusValidation, { schema: { foo: 'bad' } }),
      new MER_VALIDATION_ERR_INVALID_OPTS('opts.schema.foo must be an object.')
    )
  })

  t.test('registration - should error if schema type field is a function', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })

    t.rejects(
      app.register(mercuriusValidation, { schema: { foo: { bar: () => {} } } }),
      new MER_VALIDATION_ERR_INVALID_OPTS('opts.schema.foo.bar cannot be a function. Only field arguments currently support functional validators.')
    )
  })

  t.test('registration - should register the plugin without options', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    await app.register(mercuriusValidation)

    t.ok('mercurius validation plugin is registered without options')
  })
})
