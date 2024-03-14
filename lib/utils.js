'use strict'

const { isNonNullType, getNamedType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean } = require('graphql')
const { MER_VALIDATION_ERR_INVALID_OPTS } = require('./errors')

/**
 * Perform basic validation on the validation options.
 */
function validateOpts (opts) {
  if (typeof opts.mode !== 'undefined' && typeof opts.mode !== 'string') {
    throw new MER_VALIDATION_ERR_INVALID_OPTS('opts.mode must be a string.')
  }

  if (typeof opts.directiveValidation !== 'undefined' && typeof opts.directiveValidation !== 'boolean') {
    throw new MER_VALIDATION_ERR_INVALID_OPTS('opts.directiveValidation must be a boolean.')
  }

  if (typeof opts.schema !== 'undefined') {
    if (typeof opts.schema !== 'object' || opts.schema === null) {
      throw new MER_VALIDATION_ERR_INVALID_OPTS('opts.schema must be an object.')
    }

    for (const [typeName, type] of Object.entries(opts.schema)) {
      if (typeof type !== 'object' || type === null) {
        throw new MER_VALIDATION_ERR_INVALID_OPTS(`opts.schema.${typeName} must be an object.`)
      }

      for (const [fieldName, field] of Object.entries(type)) {
        if (typeof field !== 'object' || field === null) {
          throw new MER_VALIDATION_ERR_INVALID_OPTS(`opts.schema.${typeName}.${fieldName} cannot be a function. Only field arguments currently support functional validators.`)
        }
      }
    }
  }
  return opts
}

function inferJSONSchemaType (type, isNonNull) {
  if (type === GraphQLString) {
    return isNonNull ? { type: 'string' } : { type: ['string', 'null'] }
  }
  if (type === GraphQLInt) {
    return isNonNull ? { type: 'integer' } : { type: ['integer', 'null'] }
  }
  if (type === GraphQLFloat) {
    return isNonNull ? { type: 'number' } : { type: ['number', 'null'] }
  }
  if (type === GraphQLBoolean) {
    return isNonNull ? { type: 'boolean' } : { type: ['boolean', 'null'] }
  }
  return {}
}

function getTypeInfo (graphQLType) {
  const isNonNull = isNonNullType(graphQLType.type)
  const type = isNonNull ? graphQLType.type.ofType : graphQLType.type
  return [type, getNamedType(type), isNonNull]
}

module.exports = {
  validateOpts,
  getTypeInfo,
  inferJSONSchemaType
}
