# mercurius-validation

![CI workflow](https://github.com/mercurius-js/validation/workflows/CI%20workflow/badge.svg)

Mercurius Validation is a plugin for [Mercurius](https://mercurius.dev) that adds configurable validation support.

Features:

- Supports JSON Schema.
- Supports JTD.
- Supports Custom Function validation on field arguments.
- Supports validation through `constraint` directives in your schema. This plugin will apply JSON Schema validation policies based on the matching directives.
- Provides SDL type definitions for the GraphQL directive.
- Works in both normal and gateway mode.
- In addition to the argument metadata and value, custom functions have access to the same GraphQL information that any GraphQL resolver has access to.
- Define custom errors.
- GraphQL spec compliant.

## Docs

- [Install](#install)
- [Quick Start](#quick-start)
- [Examples](#examples)
- [Benchmarks](#benchmarks)
- [API](docs/api/options.md)

## Install

```bash
npm i fastify mercurius mercurius-validation
```

## Quick Start

```js
'use strict'

const Fastify = require('fastify')
const mercurius = require('mercurius')
const mercuriusValidation = require('mercurius-validation')

const schema = `
  type Message {
    id: ID!
    text: String
  }

  input Filters {
    id: ID
    text: String
  }

  type Query {
    message(id: ID): Message
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

const app = Fastify()

app.register(mercurius, {
  schema,
  resolvers
})

app.register(mercuriusValidation, {
  schema: {
    Filters: {
      text: { type: 'string', minLength: 1 }
    },
    Query: {
      message: {
        id: { type: 'string', minLength: 1 }
      }
    }
  }
})

app.listen(3000)
```

## Benchmarks

### Normal GraphQL Server Mode | Without Validation

Last run: `2021-09-18`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 6 ms │ 6 ms │ 13 ms │ 19 ms │ 6.83 ms │ 2.62 ms │ 64 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬──────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min    │
├───────────┼────────┼────────┼─────────┼─────────┼──────────┼─────────┼────────┤
│ Req/Sec   │ 8015   │ 8015   │ 14431   │ 14911   │ 13649.28 │ 1899.44 │ 8013   │
├───────────┼────────┼────────┼─────────┼─────────┼──────────┼─────────┼────────┤
│ Bytes/Sec │ 3.5 MB │ 3.5 MB │ 6.31 MB │ 6.52 MB │ 5.96 MB  │ 830 kB  │ 3.5 MB │
└───────────┴────────┴────────┴─────────┴─────────┴──────────┴─────────┴────────┘

Req/Bytes counts sampled once per second.

150k requests in 11.04s, 65.6 MB read
```

### Normal GraphQL Server Mode | With Validation

Last run: `2021-09-18`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg    │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼────────┼─────────┼───────┤
│ Latency │ 6 ms │ 6 ms │ 13 ms │ 19 ms │ 6.8 ms │ 2.86 ms │ 84 ms │
└─────────┴──────┴──────┴───────┴───────┴────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 7531    │ 7531    │ 14783   │ 15071   │ 13784.19 │ 2108.74 │ 7531    │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 3.29 MB │ 3.29 MB │ 6.46 MB │ 6.59 MB │ 6.02 MB  │ 921 kB  │ 3.29 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

152k requests in 11.04s, 66.3 MB read
```

### Gateway GraphQL Server Mode | Without Validation

Last run: `2021-09-18`

```text

```

### Gateway GraphQL Server Mode | With Validation

Last run: `2021-09-18`

```text

```

## Examples

Check [GitHub repo](https://github.com/mercurius-js/validation/tree/master/examples) for more examples.

## License

MIT
