'use strict'

const { parse } = require('graphql')
const t = require('tap')
const { graphQLTypeDefs } = require('..')

t.test('directive', t => {
  t.plan(1)

  t.test('validationTypeDefs', t => {
    t.plan(1)

    t.test('should be a valid GraphQL type definition', t => {
      t.plan(1)

      parse(graphQLTypeDefs)
      t.ok('Valid GraphQL type definition')
    })
  })
})
