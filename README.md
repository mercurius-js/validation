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
- [JSON Schema Validation](docs/json-schema-validation.md)
- [JTD Validation](docs/jtd-validation.md)
- [Function Validation](docs/function-validation.md)
- [Directive Validation](docs/directive-validation.md)

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

Last run: `2021-09-27`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 4 ms │ 5 ms │ 8 ms  │ 14 ms │ 5.33 ms │ 2.28 ms │ 63 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬────────┬────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%     │ 97.5%   │ Avg     │ Stdev   │ Min     │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 9831   │ 9831   │ 18111   │ 19023   │ 17069.1 │ 2470.46 │ 9827    │
├───────────┼────────┼────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 4.3 MB │ 4.3 MB │ 7.91 MB │ 8.31 MB │ 7.46 MB │ 1.08 MB │ 4.29 MB │
└───────────┴────────┴────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

188k requests in 11.03s, 82 MB read
```

### Normal GraphQL Server Mode | With Validation

Last run: `2021-09-27`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼───────┤
│ Latency │ 4 ms │ 5 ms │ 8 ms  │ 15 ms │ 5.48 ms │ 2.07 ms │ 55 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴───────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 9399    │ 9399    │ 17215   │ 18943   │ 16704.73 │ 2427.11 │ 9398    │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 4.11 MB │ 4.11 MB │ 7.52 MB │ 8.27 MB │ 7.3 MB   │ 1.06 MB │ 4.11 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.

184k requests in 11.03s, 80.3 MB read
```

### Gateway GraphQL Server Mode | Without Validation

Last run: `2021-09-27`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬───────┬───────┬───────┬────────┬──────────┬──────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%    │ Avg      │ Stdev    │ Max    │
├─────────┼───────┼───────┼───────┼────────┼──────────┼──────────┼────────┤
│ Latency │ 32 ms │ 38 ms │ 71 ms │ 100 ms │ 40.55 ms │ 13.79 ms │ 237 ms │
└─────────┴───────┴───────┴───────┴────────┴──────────┴──────────┴────────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Req/Sec   │ 1079   │ 1079   │ 2577   │ 2853   │ 2434.28 │ 493.75 │ 1079   │
├───────────┼────────┼────────┼────────┼────────┼─────────┼────────┼────────┤
│ Bytes/Sec │ 378 kB │ 378 kB │ 902 kB │ 998 kB │ 852 kB  │ 173 kB │ 378 kB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴────────┴────────┘

Req/Bytes counts sampled once per second.

27k requests in 11.03s, 9.37 MB read
```

### Gateway GraphQL Server Mode | With Validation

Last run: `2021-09-27`

```text
Running 10s test @ http://localhost:3000/graphql
100 connections

┌─────────┬───────┬───────┬───────┬────────┬──────────┬──────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%    │ Avg      │ Stdev    │ Max    │
├─────────┼───────┼───────┼───────┼────────┼──────────┼──────────┼────────┤
│ Latency │ 32 ms │ 35 ms │ 70 ms │ 103 ms │ 37.97 ms │ 13.33 ms │ 216 ms │
└─────────┴───────┴───────┴───────┴────────┴──────────┴──────────┴────────┘
┌───────────┬────────┬────────┬────────┬─────────┬────────┬────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%   │ Avg    │ Stdev  │ Min    │
├───────────┼────────┼────────┼────────┼─────────┼────────┼────────┼────────┤
│ Req/Sec   │ 1153   │ 1153   │ 2711   │ 2969    │ 2597.4 │ 521.83 │ 1153   │
├───────────┼────────┼────────┼────────┼─────────┼────────┼────────┼────────┤
│ Bytes/Sec │ 404 kB │ 404 kB │ 949 kB │ 1.04 MB │ 909 kB │ 183 kB │ 404 kB │
└───────────┴────────┴────────┴────────┴─────────┴────────┴────────┴────────┘

Req/Bytes counts sampled once per second.

26k requests in 10.03s, 9.09 MB read
```

## Examples

Check [GitHub repo](https://github.com/mercurius-js/validation/tree/master/examples) for more examples.

## License

MIT
