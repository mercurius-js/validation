# Directive validation

- [Using the GraphQL definitions within your schema](#using-the-graphql-definitions-within-your-schema)
- [GraphQL argument validation](#graphql-argument-validation)
- [GraphQL Input Object type field validation](#graphql-input-object-type-field-validation)
- [GraphQL Input Object type validation](#graphql-input-object-type-validation)
- [Additional AJV options](#additional-ajv-options)
- [Turning off directive validation](#turning-off-directive-validation)
- [Unsupported JSON Schema keywords](#unsupported-json-schema-keywords)

By default, Mercurius validation supports `@constraint` Directives out of the box. It is defined as follows:

```gql
directive @constraint(
  maximum: Int
  minimum: Int
  exclusiveMaximum: Int
  exclusiveMinimum: Int
  multipleOf: Int
  maxLength: Int
  minLength: Int
  pattern: String
  maxProperties: Int
  minProperties: Int
  required: [String!]
  maxItems: Int
  minItems: Int
  uniqueItems: Boolean
  type: [String!]
  format: String
  schema: String
) on ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION | INPUT_OBJECT
```

Every argument of the constraint directive is corresponds with its JSON Schema keyword equivalent and exhibits the same behavior. You can find the JSON Schema documentation [here](https://json-schema.org/understanding-json-schema/). At the moment, we have restricted to primitive types only, but we plan to support more keywords in the future.

You can define this constraint at the following locations:

- `ARGUMENT_DEFINITION`
- `INPUT_FIELD_DEFINITION`
- `INPUT_OBJECT`

For example:

```gql
type Query {
  message(id: ID @constraint(type: "string", minLength: 1)): String
}
```

To get up and running, you can even register the plugin without options (it also works alongside JSON Schema, JTD and function validators).

```js
app.register(mercuriusValidation)
```

## Using the GraphQL definitions within your schema

`mercurius-validation` provides `GraphQLDirective` and type definitions to allow one to use the `@constraint` directive within a GraphQL schema.

For string-based schema definitions, you can use as follows:

```js
'use strict'

const mercuriusValidation = require('mercurius-validation')

const schema = `
  ${mercuriusValidation.graphQLTypeDefs}

  type Message {
    id: ID!
    text: String
  }

  input Filters {
    id: ID
    text: String @constraint(minLength: 1)
  }

  type Query {
    message(id: ID @constraint(type: "string", minLength: 1)): Message
    messages(filters: Filters): [Message]
  }
`
```

For executable schema definitions, you can use as follows:

```js
'use strict'

const { parse, GraphQLSchema } = require('graphql')
const mercuriusValidation = require('mercurius-validation')

// Define your executable schema as normal
const graphQLSchemaToExtend = new GraphQLSchema({ ... })

const schema = extendSchema(graphQLSchemaToExtend, parse(mercuriusValidation.graphQLTypeDefs))
```

## GraphQL argument validation

If we wanted to make sure the `id` argument had a minimum length of 1, we would define as follows:

```gql
type Query {
  message(id: ID @constraint(type: "string", minLength: 1)): String
}
```

Upon failure(s), an example GraphQL response will look like:

```json
{
  "data": {
    "message": null
  },
  "errors": [
    {
      "message": "Failed Validation on arguments for field 'Query.message'",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "message"
      ],
      "extensions": {
        "code": "MER_VALIDATION_ERR_FAILED_VALIDATION",
        "name": "ValidationError",
        "details": [
          {
            "instancePath": "/id",
            "schemaPath": "#/properties/id/minLength",
            "keyword": "minLength",
            "params": {
              "limit": 1
            },
            "message": "must NOT have fewer than 1 characters",
            "schema": 1,
            "parentSchema": {
              "type": "string",
              "minLength": 1,
              "$id": "https://mercurius.dev/validation/Query/message/id"
            },
            "data": ""
          }
        ]
      }
    }
  ]
}
```

## GraphQL Input Object type field validation

We would define the schema as follows if we wanted to check the length of the `text` field on the `Filters` input object type:

```gql
input Filters {
  text: String @constraint(minLength: 1)
}

type Query {
  messages(filters: Filters): String
}
```

Upon failure(s), an example GraphQL response will look like:

```json
{
  "data": {
    "messages": null
  },
  "errors": [
    {
      "message": "Failed Validation on arguments for field 'Query.messages'",
      "locations": [{
        "line": 2,
        "column": 7
      }],
      "path": [
        "messages"
      ],
      "extensions": {
        "code": "MER_VALIDATION_ERR_FAILED_VALIDATION",
        "name": "ValidationError",
        "details": [
          {
            "instancePath": "/filters/text",
            "schemaPath": "https://mercurius.dev/validation/Filters/properties/text/minLength",
            "keyword": "minLength",
            "params": {
              "limit": 1
            },
            "message": "must NOT have fewer than 1 characters",
            "schema": 1,
            "parentSchema": {
              "$id": "https://mercurius.dev/validation/Filters/text",
              "type": "string",
              "minLength": 1
            },
            "data": ""
          }
        ]
      }
    }
  ]
}
```

## GraphQL Input Object type validation

We would define the schema as follows if we wanted to check the number of properties on the `Filters` input object type:

```gql
input Filters @constraint(minProperties: 1) {
  text: String
}

type Query {
  messages(filters: Filters): String
}
```

Upon failure(s), an example GraphQL response will look like:

```json
{
  "data": {
    "messages": null
  },
  "errors": [
    {
      "message": "Failed Validation on arguments for field 'Query.messages'",
      "locations": [{
        "line": 2,
        "column": 7
      }],
      "path": [
        "messages"
      ],
      "extensions": {
        "code": "MER_VALIDATION_ERR_FAILED_VALIDATION",
        "name": "ValidationError",
        "details": [
          {
            "instancePath": "/filters",
            "schemaPath": "https://mercurius.dev/validation/Filters/minProperties",
            "keyword": "minProperties",
            "params": {
              "limit": 1
            },
            "message": "must NOT have fewer than 1 items",
            "schema": 1,
            "parentSchema": {
              "minProperties": 1,
              "$id": "https://mercurius.dev/validation/Filters",
              "type": "object",
              "properties": {
                "text": {
                  "type": "string",
                  "$id": "https://mercurius.dev/validation/Filters/text"
                }
              }
            },
            "data": {}
          }
        ]
      }
    }
  ]
}
```

## Additional AJV options

If you need to provide additional AJV options, such providing custom formats, we can provide these at plugin registration:

We would define the schema as follows if we wanted to ensure the `id` argument was in a `base64` format:

```gql
type Query {
  message(id: ID @constraint(type: "string", minLength: 1, format: "base64")): String
}
```

When run, this would produce the following validation error when an input is not base64:

```json
{
  "data": {
    "message": null
  },
  "errors": [
    {
      "message": "Failed Validation on arguments for field 'Query.message'",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "message"
      ],
      "extensions": {
        "code": "MER_VALIDATION_ERR_FAILED_VALIDATION",
        "name": "ValidationError",
        "details": [
          {
            "instancePath": "/id",
            "schemaPath": "#/properties/id/format",
            "keyword": "format",
            "params": {
              "format": "base64"
            },
            "message": "must match format \"base64\"",
            "schema": "base64",
            "parentSchema": {
              "type": "string",
              "format": "base64",
              "$id": "https://mercurius.dev/validation/Query/message/id"
            },
            "data": "not-base-64"
          }
        ]
      }
    }
  ]
}
```

## Turning off directive validation

If you don't want to run directive validation within the plugin, you can turn it off during plugin registration:

```js
app.register(mercuriusValidation, {
  directiveValidation: false
  // Additional options here
})
```

## Unsupported JSON Schema keywords

If we do not yet support a JSON Schema keyword, you can use the `schema` argument as a workaround.

For example, if we wanted to use the `items` keyword, we would define the schema as follows:

```gql
type Message {
  id: ID
  text: String
}

type Query {
  messages(ids: [ID] @constraint(schema: "{\"items\":{\"type\":\"integer\"}}")): [Message]
}
```

We would get the following GraphQL response upon an error(s):

```json
{
  "data": {
    "messages": null
  },
  "errors": [
    {
      "message": "Failed Validation on arguments for field 'Query.messages'",
      "locations": [
        {
          "line": 2,
          "column": 7
        }
      ],
      "path": [
        "messages"
      ],
      "extensions": {
        "code": "MER_VALIDATION_ERR_FAILED_VALIDATION",
        "name": "ValidationError",
        "details": [
          {
            "instancePath": "/ids/0",
            "schemaPath": "#/properties/ids/items/type",
            "keyword": "type",
            "params": {
              "type": "integer"
            },
            "message": "must be integer",
            "schema": "integer",
            "parentSchema": {
              "type": "integer"
            },
            "data": "1.1"
          }
        ]
      }
    }
  ]
}
```
