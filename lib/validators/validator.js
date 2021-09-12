'use strict'

const { MER_VALIDATION_ERR_FAILED_VALIDATION } = require('../errors')
const { kOpts, kAjv, kMakeResolver, kOverrideFieldResolver } = require('../symbols')

class Validator {
  constructor (opts) {
    this[kOpts] = opts
  }

  [kOverrideFieldResolver] (typeName, schemaTypeField) {
    // Overwrite field resolver
    const fieldName = schemaTypeField.name
    if (typeof schemaTypeField.resolve === 'function') {
      const originalFieldResolver = schemaTypeField.resolve
      schemaTypeField.resolve = this[kMakeResolver](typeName, fieldName, originalFieldResolver)
    } else {
      schemaTypeField.resolve = this[kMakeResolver](typeName, fieldName, (parent) => parent[fieldName])
    }
  }

  [kMakeResolver] (type, field, resolverFn) {
    return async (parent, args, context, info) => {
      const errors = []
      const validate = this[kAjv].getSchema(`https://mercurius.dev/validation/${type}/${field}`)
      const valid = validate(args)
      if (!valid) {
        errors.push(...validate.errors)
      }

      if (errors.length > 0) {
        throw new MER_VALIDATION_ERR_FAILED_VALIDATION(`Failed Validation on arguments for field '${type}.${field}'`, errors)
      }

      return resolverFn(parent, args, context, info)
    }
  }
}

module.exports = Validator
