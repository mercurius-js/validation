'use strict'

const createError = require('fastify-error')

const errors = {
  /**
   * Options validation errors
   */
  MER_VALIDATION_ERR_INVALID_OPTS: createError(
    'MER_VALIDATION_ERR_INVALID_OPTS',
    'Invalid options: %s'
  ),
  /**
   * Validation errors
   */
  MER_VALIDATION_ERR_FAILED_POLICY_CHECK: createError(
    'MER_VALIDATION_ERR_FAILED_POLICY_CHECK',
    'Failed validation check on %s'
  )
}

module.exports = errors
