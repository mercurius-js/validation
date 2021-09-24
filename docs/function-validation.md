# Function validation

You can setup Mercurius validation to run custom functions on arguments when defining in-band validation schemas. It supports the following validation definitions:

- Validation on GraphQL field arguments

When defining validations for the above, a function must be of the shape:

```js
async (metadata, argumentValue, parent, args, context, info) => {
  // Function definition that throws an error upon validation failure
}
```

This is enabled by default and is applied whenever you define a matching function on a GraphQL argument:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: async (metadata, argumentValue, parent, args, context, info) => {
          // Function definition that throws an error upon validation failure
        }
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

You can define function validation on the `Query.message.id` argument as follows:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: async (metadata, argumentValue) => {
          // Function definition that throws an error upon validation failure
        }
      }
    }
  }
})
```

For example, if we wanted to check the ID input using a custom function:

```js
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id: async (metadata, argumentValue) => {
          if (argumentValue.length < 1) {
            const error = new Error('Kaboom')
            error.data = `Input data: '${argumentValue}'`
            throw error
          }
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
            "data": "kaboom data"
          }
        ]
      }
    }
  ]
}
```
