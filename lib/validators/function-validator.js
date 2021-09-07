const { MER_VALIDATION_ERR_FAILED_VALIDATION } = require('../errors')

class FunctionValidator {
  constructor () {
    this.validators = new Map()
  }

  makeResolver (type, field, resolverFn) {
    return async (parent, args, context, info) => {
      const results = await Promise.allSettled(Object.entries(args).map(([argumentName, argument]) => {
        const validate = this.validators.get(`${type}.${field}.${argumentName}`)
        if (typeof validate !== 'function') {
          // TODO: error
          throw new Error(`Validator not found for key '${type}.${field}.${argumentName}'`)
        }

        return validate(argument)
      }))

      const errors = results.filter(result => result.status === 'rejected').map(result => result.reason)
      if (errors.length > 0) {
        // TODO: logging?
        // TODO: format error properly
        throw new MER_VALIDATION_ERR_FAILED_VALIDATION(`Failed Validation on arguments for field '${type}.${field}'`, errors)
      }

      return resolverFn(parent, args, context, info)
    }
  }

  registerValidationPolicy (schema, validationPolicy) {
    for (const [typeName, typeSchema] of Object.entries(validationPolicy)) {
      const schemaType = schema.getType(typeName)
      if (typeof schemaType === 'undefined') {
        // TODO: error
        throw new Error('TODO')
      }
      for (const [fieldName, fieldSchema] of Object.entries(typeSchema)) {
        const schemaTypeField = schemaType.getFields()[fieldName]
        if (typeof schemaTypeField === 'undefined') {
          // TODO: error
          throw new Error('TODO')
        }
        let override = false
        if (typeof schemaTypeField.args !== 'undefined') {
          for (const [argumentName, argumentFn] of Object.entries(fieldSchema)) {
            const schemaArgument = schemaTypeField.args.find(argument => argument.name === argumentName)
            if (typeof schemaArgument === 'undefined') {
              // TODO: error
              throw new Error('TODO')
            }
            if (typeof argumentFn === 'function') {
              override = true
              // TODO: create some sort of validator function that handles different user fn definitions
              this.validators.set(`${typeName}.${fieldName}.${argumentName}`, argumentFn)
            }
          }
        }
        if (override) {
          // Overwrite field resolver
          if (typeof schemaTypeField.resolve === 'function') {
            const originalFieldResolver = schemaTypeField.resolve
            schemaTypeField.resolve = this.makeResolver(typeName, fieldName, originalFieldResolver)
          } else {
            schemaTypeField.resolve = this.makeResolver(typeName, fieldName, (parent) => parent[fieldName])
          }
        }
      }
    }
  }
}

module.exports = FunctionValidator
