'use strict'

const { describe, test } = require('node:test')
const { parse, GraphQLSchema, extendSchema, buildSchema } = require('graphql')
const { graphQLTypeDefs } = require('..')

describe('directive', () => {
  describe('validationTypeDefs', () => {
    test('should be a valid GraphQL type definition', t => {
      parse(graphQLTypeDefs)
      t.assert.ok('Valid GraphQL type definition')
    })

    test('should be able to extend an existing executable schema', t => {
      const graphQLSchemaToExtend = buildSchema(`
        type Query {
          message(id: ID @constraint(wrong: String)): String
        }
      `, { assumeValid: true })
      t.assert.strictEqual(extendSchema(graphQLSchemaToExtend, parse(graphQLTypeDefs)).constructor.name, GraphQLSchema.name)
    })
  })
})
