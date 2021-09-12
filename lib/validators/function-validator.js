'use strict'

const { MER_VALIDATION_ERR_FAILED_VALIDATION } = require('../errors')
const { kOpts } = require('../symbols')

class FunctionValidator {
  constructor (app, opts) {
    this.app = app
    this.validators = new Map()
    this[kOpts] = opts
  }

  makeResolver (type, field, resolverFn) {
    return async (parent, args, context, info) => {
      const results = await Promise.allSettled(Object.entries(args).map(([argument, argumentValue]) => {
        const validate = this.validators.get(`${type}.${field}.${argument}`)
        return validate?.({ type, field, argument }, argumentValue, parent, args, context, info)
      }))

      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason)
      if (errors.length > 0) {
        throw new MER_VALIDATION_ERR_FAILED_VALIDATION(`Failed Validation on arguments for field '${type}.${field}'`, errors)
      }

      return resolverFn(parent, args, context, info)
    }
  }

  registerValidationSchema (schema, validationSchema) {
    for (const [typeName, typeSchema] of Object.entries(validationSchema)) {
      const schemaType = schema.getType(typeName)
      if (typeof schemaType !== 'undefined') {
        for (const [fieldName, fieldSchema] of Object.entries(typeSchema)) {
          const schemaTypeField = schemaType.getFields()[fieldName]
          if (typeof schemaTypeField !== 'undefined') {
            let override = false
            if (typeof schemaTypeField.args !== 'undefined') {
              for (const [argumentName, argumentFn] of Object.entries(fieldSchema)) {
                const schemaArgument = schemaTypeField.args.find(argument => argument.name === argumentName)
                if (typeof schemaArgument !== 'undefined') {
                  if (typeof argumentFn === 'function') {
                    override = true
                    // TODO: create parent validator function that handles different user fn definitions
                    this.validators.set(`${typeName}.${fieldName}.${argumentName}`, argumentFn)
                  }
                } else {
                  this.app.log.warn(`No GraphQL schema argument with key '${typeName}.${fieldName}.${argumentName}' found. Validation function will not be run.`)
                }
              }
            }
            // Overwrite field resolver.
            // Because we are only considering running validator on arguments
            // This types will always have a resolve function
            if (override && typeof schemaTypeField.resolve === 'function') {
              const originalFieldResolver = schemaTypeField.resolve
              schemaTypeField.resolve = this.makeResolver(typeName, fieldName, originalFieldResolver)
            }
          } else {
            this.app.log.warn(`No GraphQL schema field with key '${typeName}.${fieldName}' found. Validation functions will not be run.`)
          }
        }
      } else {
        this.app.log.warn(`No GraphQL schema type with key '${typeName}' found. Validation functions will not be run.`)
      }
    }
  }
}

module.exports = FunctionValidator
