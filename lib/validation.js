'use strict'

const { FunctionValidator, JSONSchemaValidator, JTDValidator } = require('./validators')

class Validation {
  constructor ({ validationSchemaMode }) {
    if (validationSchemaMode === 'JTD') {
      this.schemaValidator = new JTDValidator()
    } else {
      this.schemaValidator = new JSONSchemaValidator()
    }

    this.functionValidator = new FunctionValidator()
  }

  // TODO: validate the policy to make sure it matches up with the schema correctly (this will make a lot of future logic simpler)

  // TODO: We are just considering inputs and functions on arguments.
  // We are not considering:
  //  - Functions on input type fields (for V1)
  //  - Validation on responses (for V1)
  registerValidationPolicy (schema, validationPolicy) {
    // We register policies in the reverse order of intended operation
    this.functionValidator.registerValidationPolicy(schema, validationPolicy)
    this.schemaValidator.registerValidationPolicy(schema, validationPolicy)
  }
}

module.exports = Validation
