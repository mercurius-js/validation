'use strict'

const t = require('tap')
// const Fastify = require('fastify')
// const mercurius = require('mercurius')
// const mercuriusValidation = require('..')

// const schema = `
//   ${mercuriusValidation.graphQLTypeDefs}

//   type Message {
//     id: ID!
//     text: String
//   }

//   input Filters {
//     id: ID
//     text: String @constraint(type: "string" minLength: 1)
//   }

//   input NestedFilters {
//     input: Filters
//   }

//   input ArrayFilters {
//     values: [String] @constraint(minItems: 1)
//     filters: [Filters] @constraint(minItems: 1)
//   }

//   type Query {
//     message(id: ID @constraint(type: "string", minLength: 1)): Message
//     messages(
//       filters: Filters @constraint
//       nestedFilters: NestedFilters
//       arrayScalarFilters: [String] @constraint(minItems: 1)
//       arrayObjectFilters: [ArrayFilters] @constraint(minItems: 1)
//     ): [Message]
//   }
// `

// const messages = [
//   {
//     id: 0,
//     text: 'Some system message.',
//     unprotectedText: ''
//   },
//   {
//     id: 1,
//     text: 'Hello there',
//     unprotectedText: ''
//   },
//   {
//     id: 2,
//     text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.',
//     unprotectedText: ''
//   },
//   {
//     id: 3,
//     text: '',
//     unprotectedText: ''
//   }
// ]

// const resolvers = {
//   Query: {
//     message: async (_, { id }) => {
//       return messages.find(message => message.id === Number(id))
//     },
//     messages: async (_, { filters }) => {
//       return messages
//     }
//   }
// }

t.test('Advanced', t => {
  t.plan(2)

  t.test('when mode is JSON Schema', t => {
    t.plan(1)

    t.todo('all validators should work together')
  })

  t.test('when mode is JTD', t => {
    t.plan(1)

    t.todo('all validators should work together')
  })
})
