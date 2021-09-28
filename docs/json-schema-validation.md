# JSON Schema validation

By default, Mercurius validation runs in JSON Schema mode when defining in-band validation schemas. It supports the following validation definitions:

- Validation on GraphQL field arguments
- Validation on Input Object type fields
- Validation on Input Object types

When defining validations for each of the above, any valid JSON Schema keyword is supported.

## GraphQL argument validation

For the following GraphQL schema:

```gql
type Query {
  message(id: ID): String
}
```

You can define JSON Schema validation on the `Query.message.id` argument as follows:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: { ... } // Any valid JSON Schema definition
      }
    }
  }
})
```

For example, if we wanted to check the minimum length of the ID input:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: { type: 'string', minLength: 1 }
      }
    }
  }
})
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

For the following GraphQL schema:

```gql
input Filters {
  text: String
}

type Query {
  messages(filters: Filters): String
}
```

You can define JSON Schema validation on the `Filters.text` input object type field as follows:

```js
app.register(mercuriusValidation, {
  schema: {
    Filters: {
      text: { ... } // Any valid JSON Schema definition
    }
  }
})
```

For example, if we wanted to check the minimum length of the text input:

```js
app.register(mercuriusValidation, {
  schema: {
    Filters: {
      text: { type: 'string', minLength: 1 }
    }
  }
})
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

For the following GraphQL schema:

```gql
input Filters {
  text: String
}

type Query {
  messages(filters: Filters): String
}
```

You can define JSON Schema validation on the `Filters` input object type using the reserved `__typeValidation` field as follows:

```js
app.register(mercuriusValidation, {
  schema: {
    Filters: {
      __typeValidation: { ... } // Any valid JSON Schema definition
    }
  }
})
```

For example, if we wanted to check the minimum number of properties of the Filters input object type:

```js
app.register(mercuriusValidation, {
  schema: {
    Filters: {
      __typeValidation: { minProperties: 1 }
    }
  }
})
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

For the schema:

```gql
type Query {
  message(id: ID): String
}
```

For registering a new `"base64"` format:

```js
app.register(mercuriusValidation, {
  formats: {
    base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  },
  schema: {
    Query: {
      message: {
        id: { type: 'string', format: 'base64' }
      }
    }
  }
})
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

## Custom errors

Within the plugin, we have also included the `ajv-errors` package. This adds the `errorMessage` keyword. You can use this to augment the error messages of your individual schemas.

For the schema:

```gql
type Query {
  message(id: ID): String
}
```

For registering a new `"base64"` format and custom error:

```js
app.register(mercuriusValidation, {
  formats: {
    base64: /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
  },
  schema: {
    Query: {
      message: {
        id: { type: 'string', format: 'base64', errorMessage: 'Input is not valid base64.' }
      }
    }
  }
})
```

An error would produce the following:

```json
{
  "data": {
    "message": null
  },
  errors: [
    {
      "message": "Failed Validation on arguments for field 'Query.message'",
      "locations": [
        {
          "line": 2,
          "column": 7
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
            "schemaPath": "#/properties/id/errorMessage",
            "keyword": "errorMessage",
            "params": {
              "errors": [
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
                    "errorMessage": {
                      "format": "Input must be in base64 format."
                    },
                    "$id": "https://mercurius.dev/validation/Query/message/id"
                  },
                  "data": "not-base-64",
                  "emUsed": true
                }
              ]
            },
            "message": "Input must be in base64 format.",
            "schema": {
              "format": "Input must be in base64 format."
            },
            "parentSchema": {
              "type": "string",
              "format": "base64",
              "errorMessage": {
                "format": "Input must be in base64 format."
              },
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

## Type inference

For some GraphQL primitives, we can infer the JSON Schema type:

- `GraphQLString` <=> `{ type: 'string' }`
- `GraphQLInt` <=> `{ type: 'integer' }`
- `GraphQLFloat` <=> `{ type: 'number' }`

In these cases, we don't necessarily need to specify this type when building the JSON schema.

For the schema:

```gql
type Query {
  message(id: String): String
}
```

Registration:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: { minLength: 1 }
      }
    }
  }
})
```

## Caveats

The use of the `$ref` keyword is not advised because we use this through the plugin to build up the GraphQL type validation. However, we have not prevented use of this keyword since it may be useful in some situations.
