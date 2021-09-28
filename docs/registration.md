# Registration

The `mercurius-validation` plugin must be registered **after** Mercurius is registered.

```js
'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('mercurius-validation')

const app = Fastify()

const schema = `
  directive @validation(
    requires: Role = ADMIN,
  ) on OBJECT | FIELD_DEFINITION

  enum Role {
    ADMIN
    REVIEWER
    USER
    UNKNOWN
  }

  type Query {
    add(x: Int, y: Int): Int @validation(requires: USER)
  }
`

const resolvers = {
  Query: {
    add: async (_, { x, y }) => x + y
  }
}

app.register(mercurius, {
  schema,
  resolvers
})

// After initial setup, register Mercurius validation
app.register(mercuriusValidation, {
  validationContext (context) {
    return {
      identity: context.reply.request.headers['x-user']
    }
  },
  async applyPolicy (validationDirectiveAST, parent, args, context, info) {
    return context.validation.identity === 'admin'
  },
  validationDirective: 'validation'
})

app.listen(3000)
```
