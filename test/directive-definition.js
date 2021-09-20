'use strict'

const t = require('tap')
const { parse, GraphQLSchema, extendSchema, buildSchema } = require('graphql')
const { graphQLTypeDefs } = require('..')

t.test('directive', t => {
  t.plan(1)

  t.test('validationTypeDefs', t => {
    t.plan(2)

    t.test('should be a valid GraphQL type definition', t => {
      t.plan(1)

      parse(graphQLTypeDefs)
      t.ok('Valid GraphQL type definition')
    })

    t.test('should be able to extend an existing executable schema', t => {
      t.plan(1)

      const graphQLSchemaToExtend = buildSchema(`
        type Query {
          message(id: ID @constraint(wrong: String)): String
        }
      `, { assumeValid: true })
      t.type(extendSchema(graphQLSchemaToExtend, parse(graphQLTypeDefs)), GraphQLSchema)
    })
  })
})
