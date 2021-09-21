# JSON Schema validation

By default, Mercurius validation runs in JSON Schema mode when defining in-band validation schemas. It supports the following validation definitions:

- Validation on GraphQL field arguments
- Validation on Input Object type fields
- Validation on Input Object types

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

For example:

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

## GraphQL Input Object type validation

## Formats

## Type inference
