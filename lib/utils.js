'use strict'

const { isNonNullType, getNamedType, GraphQLString, GraphQLInt, GraphQLFloat } = require('graphql')
const { MER_VALIDATION_ERR_INVALID_OPTS } = require('./errors')

/**
 * Perform basic validation on the validation options.
 */
function validateOpts (opts) {
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

function inferJSONSchemaType (type) {
  if (type === GraphQLString) {
    return { type: 'string' }
  }
  if (type === GraphQLInt) {
    return { type: 'integer' }
  }
  if (type === GraphQLFloat) {
    return { type: 'number' }
  }
  return {}
}

function getTypeInfo (graphQLType) {
  const type = isNonNullType(graphQLType.type) ? graphQLType.type.ofType : graphQLType.type
  return [type, getNamedType(type)]
}

module.exports = {
  validateOpts,
  getTypeInfo,
  inferJSONSchemaType
}
