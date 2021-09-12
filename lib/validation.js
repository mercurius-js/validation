'use strict'

const { FunctionValidator, JSONSchemaValidator, JTDValidator, DirectiveValidator } = require('./validators')

class Validation {
  constructor (app, opts) {
    this.validationSchema = opts.schema ?? {}

    this.directiveValidator = new DirectiveValidator(opts)

    if (opts.mode === 'JTD') {
      this.schemaValidator = new JTDValidator(opts)
    } else {
      this.schemaValidator = new JSONSchemaValidator(opts)
    }

    this.functionValidator = new FunctionValidator(app, opts)
  }

  // We are just considering inputs and functions on arguments. We are not considering:
  //  - Functions on input type fields
  //  - Validation on field responses
  registerValidationSchema (graphQLSchema) {
    // We register policies in the reverse order of intended operation
    this.directiveValidator.registerValidationSchema(graphQLSchema)
    this.functionValidator.registerValidationSchema(graphQLSchema, this.validationSchema)
    this.schemaValidator.registerValidationSchema(graphQLSchema, this.validationSchema)
  }
}

module.exports = Validation
