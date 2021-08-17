'use strict'

const t = require('tap')
const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('..')

const schema = `
  directive @constraint(
    minLength: Int
  ) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | FIELD_DEFINITION

  scalar filtersString
  scalar idString

  type Message {
    id: ID!
    text: String
    unprotectedText: String
  }

  input Filters {
    text: String @constraint(minLength: 1)
  }

  type Query {
    message(id: ID @constraint(minLength: 1)): Message
    messages(filters: Filters): [Message]
  }
`

const messages = [
  {
    id: 0,
    text: 'Some system message.',
    unprotectedText: ''
  },
  {
    id: 1,
    text: 'Hello there',
    unprotectedText: ''
  },
  {
    id: 2,
    text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.',
    unprotectedText: ''
  },
  {
    id: 3,
    text: '',
    unprotectedText: ''
  }
]

const resolvers = {
  Query: {
    message: async (_, { id }) => {
      return messages.find(message => message.id === Number(id))
    },
    messages: async (_, { filters }) => {
      return messages
    }
  }
}

t.test('basic', t => {
  t.plan(10)

  t.skip('should protect the schema and not affect operations when everything is okay', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      applyValidation (validationDirectiveAST, field, value) {
        return true
      },
      validationDirective: 'constraint'
    })

    const query = `query {
      message(id: "1") {
        id
        text
        unprotectedText
      }
      messages(filters: { text: "He" }) {
        id
        text
        unprotectedText
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
        message: {
          id: '1',
          text: 'Hello there',
          unprotectedText: ''
        },
        messages: [
          {
            id: '0',
            text: 'Some system message.',
            unprotectedText: ''
          },
          {
            id: '1',
            text: 'Hello there',
            unprotectedText: ''
          },
          {
            id: '2',
            text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.',
            unprotectedText: ''
          },
          {
            id: '3',
            text: '',
            unprotectedText: ''
          }
        ]
      }
    })
  })

  t.skip('should protect the schema arguments and input types and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      applyValidation (validationDirectiveAST, field, value) {
        return value.length >= Number(validationDirectiveAST.arguments[0].value.value)
      },
      validationDirective: 'constraint'
    })

    const query = `query {
      message(id: "") {
        id
        text
        unprotectedText
      }
      messages(filters: { text: "" }) {
        id
        text
        unprotectedText
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: null,
      errors: [
        { message: 'Expected value of type "ID", found ""; Failed validation check on id', locations: [{ line: 2, column: 19 }] },
        { message: 'Expected value of type "String", found ""; Failed validation check on text', locations: [{ line: 7, column: 33 }] }
      ]
    })
  })

  t.test('should protect the schema arguments and input types from operation variables and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      applyValidation (validationDirectiveAST, field, value) {
        return value.length >= Number(validationDirectiveAST.arguments[0].value.value)
      },
      validationDirective: 'constraint'
    })

    const query = `query Messages($id: ID $text: String $filters: Filters) {
      message(id: $id) {
        id
        text
        unprotectedText
      }
      messages(filters: $filters) {
        id
        text
        unprotectedText
      }
      nestedMessages: messages(filters: { text: $text }) {
        id
        text
        unprotectedText
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query, variables: { id: '', text: '', filters: { text: '' } } })
    })

    t.same(JSON.parse(response.body), {
      // data: {
      //   message: null,
      //   messages: null,
      //   nestedMessages: null
      // },
      // errors: [
      //   { message: 'Variable "$id" got invalid value ""; Expected type "ID". Failed validation check on id', path: ['message'], locations: [{ line: 2, column: 7 }] },
      //   { message: 'Variable "$text" got invalid value ""; Expected type "String". Failed validation check on text', path: ['messages'], locations: [{ line: 7, column: 7 }] },
      //   { message: 'Variable "$text" got invalid value ""; Expected type "String". Failed validation check on text', path: ['nestedMessages'], locations: [{ line: 12, column: 7 }] }
      // ]
    })
  })

  t.skip('should protect the schema fields and error accordingly', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      applyValidation (validationDirectiveAST, value, parent, args, context, info) {
        return value.length >= Number(validationDirectiveAST.arguments[0].value.value)
      },
      validationDirective: 'constraint'
    })

    const query = `query {
      message(id: "1") {
        id
        text
        unprotectedText
      }
      messages {
        id
        text
        unprotectedText
      }
    }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        message: {
          id: '3',
          text: null,
          unprotectedText: ''
        },
        messages: [
          {
            id: '0',
            text: 'Some system message.',
            unprotectedText: ''
          },
          {
            id: '1',
            text: 'Hello there',
            unprotectedText: ''
          },
          {
            id: '2',
            text: 'Give me a place to stand, a lever long enough and a fulcrum. And I can move the Earth.',
            unprotectedText: ''
          },
          {
            id: '3',
            text: null,
            unprotectedText: ''
          }
        ]
      },
      errors: [
        {
          message: 'Failed validation check on text',
          locations: [
            {
              line: 4,
              column: 9
            }
          ],
          path: [
            'message',
            'text'
          ]
        },
        {
          message: 'Failed validation check on text',
          locations: [
            {
              line: 8,
              column: 9
            }
          ],
          path: [
            'messages',
            '3',
            'text'
          ]
        }
      ]
    })
  })

  t.skip('should work alongside existing directives', async (t) => {
    t.plan(1)

    const schema = `
      directive @auth(
        requires: Role = ADMIN,
      ) on OBJECT | FIELD_DEFINITION
  
      enum Role {
        ADMIN
        REVIEWER
        USER
        UNKNOWN
      }
  
      directive @notUsed on OBJECT | FIELD_DEFINITION
  
      type Query {
        add(x: Int, y: Int): Int @auth(requires: ADMIN) @notUsed
        subtract(x: Int, y: Int): Int @notUsed
      }
  `
    const resolvers = {
      Query: {
        add: async (_, obj) => {
          const { x, y } = obj
          return x + y
        },
        subtract: async (_, obj) => {
          const { x, y } = obj
          return x - y
        }
      }
    }

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
  }`

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      authContext (context) {
        return {
          identity: context.reply.request.headers['x-user']
        }
      },
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        return context.auth.identity === 'admin'
      },
      authDirective: 'auth'
    })

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        four: null,
        six: null,
        subtract: 0
      },
      errors: [
        { message: 'Failed auth policy check on add', locations: [{ line: 2, column: 3 }], path: ['four'] },
        { message: 'Failed auth policy check on add', locations: [{ line: 3, column: 3 }], path: ['six'] }
      ]
    })
  })

  t.skip('should handle when no fields within a type are allowed', async (t) => {
    t.plan(1)

    const schema = `
    directive @auth(
      requires: Role = ADMIN,
    ) on OBJECT | FIELD_DEFINITION
  
    enum Role {
      ADMIN
      REVIEWER
      USER
      UNKNOWN
    }
  
    type Message {
      title: String @auth(requires: ADMIN)
      private: String @auth(requires: ADMIN)
    }
  
    type Query {
      add(x: Int, y: Int): Int @auth(requires: ADMIN)
      subtract(x: Int, y: Int): Int
      messages: [Message!]!
    }
  `

    const resolvers = {
      Query: {
        add: async (_, obj) => {
          const { x, y } = obj
          return x + y
        },
        subtract: async (_, obj) => {
          const { x, y } = obj
          return x - y
        },
        messages: async () => {
          return [
            {
              title: 'one',
              private: 'private one'
            },
            {
              title: 'two',
              private: 'private two'
            }
          ]
        }
      }
    }

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
    messages {
      title
      private
    }
  }`

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      authContext (context) {
        return {
          identity: context.reply.request.headers['x-user']
        }
      },
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        return context.auth.identity === 'admin'
      },
      authDirective: 'auth'
    })

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        four: null,
        six: null,
        subtract: 0,
        messages: [
          {
            title: null,
            private: null
          },
          {
            title: null,
            private: null
          }
        ]
      },
      errors: [
        { message: 'Failed auth policy check on add', locations: [{ line: 2, column: 3 }], path: ['four'] },
        { message: 'Failed auth policy check on add', locations: [{ line: 3, column: 3 }], path: ['six'] },
        { message: 'Failed auth policy check on title', locations: [{ line: 6, column: 5 }], path: ['messages', 0, 'title'] },
        { message: 'Failed auth policy check on private', locations: [{ line: 7, column: 5 }], path: ['messages', 0, 'private'] },
        { message: 'Failed auth policy check on title', locations: [{ line: 6, column: 5 }], path: ['messages', 1, 'title'] },
        { message: 'Failed auth policy check on private', locations: [{ line: 7, column: 5 }], path: ['messages', 1, 'private'] }
      ]
    })
  })

  t.skip('should handle custom errors thrown in applyPolicy', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      authContext (context) {
        return {
          identity: context.reply.request.headers['x-user']
        }
      },
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        if (context.auth.identity !== 'admin') {
          throw new Error(`custom auth error on ${info.fieldName}`)
        }
        return true
      },
      authDirective: 'auth'
    })

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
    messages {
      title
      public
      private
    }
    adminMessages {
      title
      public
      private
    }
  }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        four: null,
        six: null,
        subtract: 0,
        messages: [
          {
            title: 'one',
            public: 'public one',
            private: null
          },
          {
            title: 'two',
            public: 'public two',
            private: null
          }
        ],
        adminMessages: null
      },
      errors: [
        { message: 'custom auth error on add', locations: [{ line: 2, column: 3 }], path: ['four'] },
        { message: 'custom auth error on add', locations: [{ line: 3, column: 3 }], path: ['six'] },
        { message: 'custom auth error on adminMessages', locations: [{ line: 10, column: 3 }], path: ['adminMessages'] },
        { message: 'custom auth error on private', locations: [{ line: 8, column: 5 }], path: ['messages', 0, 'private'] },
        { message: 'custom auth error on private', locations: [{ line: 8, column: 5 }], path: ['messages', 1, 'private'] }
      ]
    })
  })

  t.skip('should handle custom errors returned in applyPolicy', async (t) => {
    t.plan(1)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    app.register(mercuriusValidation, {
      authContext (context) {
        return {
          identity: context.reply.request.headers['x-user']
        }
      },
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        if (context.auth.identity !== 'admin') {
          return new Error(`custom auth error on ${info.fieldName}`)
        }
        return true
      },
      authDirective: 'auth'
    })

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
    messages {
      title
      public
      private
    }
    adminMessages {
      title
      public
      private
    }
  }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'user' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        four: null,
        six: null,
        subtract: 0,
        messages: [
          {
            title: 'one',
            public: 'public one',
            private: null
          },
          {
            title: 'two',
            public: 'public two',
            private: null
          }
        ],
        adminMessages: null
      },
      errors: [
        { message: 'custom auth error on add', locations: [{ line: 2, column: 3 }], path: ['four'] },
        { message: 'custom auth error on add', locations: [{ line: 3, column: 3 }], path: ['six'] },
        { message: 'custom auth error on adminMessages', locations: [{ line: 10, column: 3 }], path: ['adminMessages'] },
        { message: 'custom auth error on private', locations: [{ line: 8, column: 5 }], path: ['messages', 0, 'private'] },
        { message: 'custom auth error on private', locations: [{ line: 8, column: 5 }], path: ['messages', 1, 'private'] }
      ]
    })
  })

  t.skip('should handle when auth context is not defined', async (t) => {
    t.plan(3)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers
    })
    await app.register(mercuriusValidation, {
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        return context.other.identity === 'admin'
      },
      authDirective: 'auth'
    })

    app.graphql.addHook('preExecution', async (schema, document, context) => {
      context.other = {
        identity: context.reply.request.headers['x-user']
      }
      t.type(context.auth, 'undefined')
      t.ok('called')
    })

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
    messages {
      title
      public
      private
    }
    adminMessages {
      title
      public
      private
    }
  }`

    const response = await app.inject({
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-User': 'admin' },
      url: '/graphql',
      body: JSON.stringify({ query })
    })

    t.same(JSON.parse(response.body), {
      data: {
        four: 4,
        six: 6,
        subtract: 0,
        messages: [
          {
            title: 'one',
            public: 'public one',
            private: 'private one'
          },
          {
            title: 'two',
            public: 'public two',
            private: 'private two'
          }
        ],
        adminMessages: [
          {
            title: 'admin one',
            public: 'admin public one',
            private: 'admin private one'
          },
          {
            title: 'admin two',
            public: 'admin public two',
            private: 'admin private two'
          }
        ]
      }
    })
  })

  t.skip('should support jit', async (t) => {
    t.plan(2)

    const app = Fastify()
    t.teardown(app.close.bind(app))

    app.register(mercurius, {
      schema,
      resolvers,
      jit: 1
    })
    app.register(mercuriusValidation, {
      authContext (context) {
        return {
          identity: context.reply.request.headers['x-user']
        }
      },
      async applyPolicy (validationDirectiveAST, parent, args, context, info) {
        return context.auth.identity === 'admin'
      },
      authDirective: 'auth'
    })

    const query = `query {
    four: add(x: 2, y: 2)
    six: add(x: 3, y: 3)
    subtract(x: 3, y: 3)
    messages {
      title
      public
      private
    }
    adminMessages {
      title
      public
      private
    }
  }`

    {
      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-User': 'admin' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(response.body), {
        data: {
          four: 4,
          six: 6,
          subtract: 0,
          messages: [
            {
              title: 'one',
              public: 'public one',
              private: 'private one'
            },
            {
              title: 'two',
              public: 'public two',
              private: 'private two'
            }
          ],
          adminMessages: [
            {
              title: 'admin one',
              public: 'admin public one',
              private: 'admin private one'
            },
            {
              title: 'admin two',
              public: 'admin public two',
              private: 'admin private two'
            }
          ]
        }
      })
    }

    // Trigger JIT compilation
    {
      const response = await app.inject({
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-User': 'admin' },
        url: '/graphql',
        body: JSON.stringify({ query })
      })

      t.same(JSON.parse(response.body), {
        data: {
          four: 4,
          six: 6,
          subtract: 0,
          messages: [
            {
              title: 'one',
              public: 'public one',
              private: 'private one'
            },
            {
              title: 'two',
              public: 'public two',
              private: 'private two'
            }
          ],
          adminMessages: [
            {
              title: 'admin one',
              public: 'admin public one',
              private: 'admin private one'
            },
            {
              title: 'admin two',
              public: 'admin public two',
              private: 'admin private two'
            }
          ]
        }
      })
    }
  })
})
