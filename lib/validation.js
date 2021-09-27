'use strict'

const { FunctionValidator, JSONSchemaValidator, JTDValidator, DirectiveValidator } = require('./validators')
const { kValidationSchema, kDirectiveValidator, kSchemaValidator, kFunctionValidator } = require('./symbols')

class Validation {
  constructor (app, { schema, mode = 'JSONSchema', directiveValidation = true, ...opts }) {
    this[kValidationSchema] = schema || {}

    // By default, we turn on directive validation
    if (directiveValidation) {
      this[kDirectiveValidator] = new DirectiveValidator(opts)
    } else {
      this[kDirectiveValidator] = null
    }

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
    if (this[kDirectiveValidator] !== null) {
      this[kDirectiveValidator].registerValidationSchema(graphQLSchema)
    }
    this[kFunctionValidator].registerValidationSchema(graphQLSchema, this[kValidationSchema])
    this[kSchemaValidator].registerValidationSchema(graphQLSchema, this[kValidationSchema])
  }
}

module.exports = Validation
