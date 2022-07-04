'use strict'

const createError = require('@fastify/error')

class ValidationError extends Error {
  constructor (message, details) {
    super(message)
    this.name = 'ValidationError'
    this.code = 'MER_VALIDATION_ERR_FAILED_VALIDATION'
    this.extensions = {
      name: this.name,
      code: this.code,
      details
    }
    this.statusCode = 400
    ValidationError.prototype[Symbol.toStringTag] = 'Error'
    ValidationError.prototype.toString = function () {
      return `${this.name} [${this.code}]: ${this.message}`
    }
  }
}

const errors = {
  /**
   * Options validation errors
   */
  MER_VALIDATION_ERR_INVALID_OPTS: createError(
    'MER_VALIDATION_ERR_INVALID_OPTS',
    'Invalid options: %s'
  ),
  /**
   * Registration errors
   */
  MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED: createError(
    'MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED',
    'Type of field must be defined: %s'
  ),
  /**
   * Validation errors
   */
  MER_VALIDATION_ERR_FAILED_VALIDATION: ValidationError
}

module.exports = errors
