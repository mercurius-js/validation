# JTD validation

You can setup Mercurius validation to run in JTD mode when defining in-band validation schemas. It supports the following validation definitions:

- Validation on GraphQL field arguments
- Validation on Input Object type fields
- Validation on Input Object types

When defining validations for each of the above, any valid JTD keyword is supported.

To enable JTD mode, set the following at registration:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Query: {
      message: {
        id: { ... } // Any valid JTD definition
      }
    }
  }
})
```

## GraphQL argument validation

For the following GraphQL schema:

```gql
type Query {
  message(id: ID): String
}
```

You can define JTD validation on the `Query.message.id` argument as follows:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Query: {
      message: {
        id: { ... } // Any valid JTD definition
      }
    }
  }
})
```

For example, if we wanted to check the ID input was a `int16` type:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Query: {
      message: {
        id: { type: 'int16' }
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
            "schemaPath": "/optionalProperties/id/type",
            "keyword": "type",
            "params": {
              "type": "int16",
              "nullable": false
            },
            "message": "must be int16",
            "schema": "int16",
            "parentSchema": {
              "type": "int16"
            },
            "data": 32768
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

You can define JTD validation on the `Filters.text` input object type field as follows:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Filters: {
      text: { ... } // Any valid JTD definition
    }
  }
})
```

For example, if we wanted to check the values text input were an enum:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Filters: {
      text: { enum: ['hello', 'there'] }
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
            "schemaPath": "/definitions/Filters/optionalProperties/text/enum",
            "keyword": "enum",
            "params": {
              "allowedValues": [
                "hello",
                "there"
              ]
            },
            "message": "must be equal to one of the allowed values",
            "schema": [
              "hello",
              "there"
            ],
            "parentSchema": {
              "enum": [
                "hello",
                "there"
              ]
            },
            "data": "wrong"
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

You can define JTD validation on the `Filters` input object type using the reserved `__typeValidation` field as follows:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Filters: {
      __typeValidation: { ... } // Any valid JTD definition
    }
  }
})
```

For example, if we wanted to check the Filters input object type values are all `unit8`:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Filters: {
      __typeValidation: {
        values: {
          type: 'uint8'
        }
      }
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
            "instancePath": "/filters/id",
            "schemaPath": "/definitions/Filters/values/type",
            "keyword": "type",
            "params": {
              "type": "uint8",
              "nullable": false
            },
            "message": "must be uint8",
            "schema": "uint8",
            "parentSchema": {
              "type": "uint8"
            },
            "data": "256"
          }
        ]
      }
    }
  ]
}
```

## Additional AJV options

If you need to provide additional AJV options, such setting `allErrors` to `false`, we can provide these at plugin registration:

For the schema:

```gql
type Query {
  message(id: ID): String
}
```

Registration:

```js
app.register(mercuriusValidation, {
  mode: 'JTD',
  allErrors: false,
  schema: {
    Query: {
      message: {
        id: { type: 'int16' }
      }
    }
  }
})
```
