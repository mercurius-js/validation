'use strict'

const t = require('tap')
const { errors } = require('..')

t.test('errors', t => {
  t.plan(1)

  t.test('MER_VALIDATION_ERR_FAILED_VALIDATION', t => {
    t.plan(1)

    t.test('toString', t => {
      t.plan(1)

      t.test('should print a validation error to string', t => {
        t.plan(1)

        const error = new errors.MER_VALIDATION_ERR_FAILED_VALIDATION('some message', [])

        t.same(error.toString(), 'ValidationError [MER_VALIDATION_ERR_FAILED_VALIDATION]: some message')
      })
    })
  })
})
