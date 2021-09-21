'use strict'

const { FunctionValidator, JSONSchemaValidator, JTDValidator, DirectiveValidator } = require('./validators')
const { kValidationSchema, kDirectiveValidator, kSchemaValidator, kFunctionValidator } = require('./symbols')

class Validation {
  constructor (app, { schema, mode, ...opts }) {
    this[kValidationSchema] = schema || {}

    this[kDirectiveValidator] = new DirectiveValidator(opts)

    if (mode === 'JTD') {
      this[kSchemaValidator] = new JTDValidator(opts)
    } else {
      this[kSchemaValidator] = new JSONSchemaValidator(opts)
    }

    this[kFunctionValidator] = new FunctionValidator(app, opts)
  }

  // We are just considering inputs and functions on arguments. We are not considering:
  //  - Functions on input type fields
  //  - Validation on field responses
  registerValidationSchema (graphQLSchema) {
    // We register policies in the reverse order of intended operation
    this[kDirectiveValidator].registerValidationSchema(graphQLSchema)
    this[kFunctionValidator].registerValidationSchema(graphQLSchema, this[kValidationSchema])
    this[kSchemaValidator].registerValidationSchema(graphQLSchema, this[kValidationSchema])
  }
}

module.exports = Validation
