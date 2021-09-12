'use strict'

module.exports = {
  // TODO: clean up unused symbols
  kValidate: Symbol('validate'),
  kApplyValidation: Symbol('apply validation'),
  kValidationDirective: Symbol('validation directive'),
  kGetValidationDirectiveAST: Symbol('get validation directive ast'),
  kMakeProtectedScalarType: Symbol('make protected scalar type'),
  kOverrideProtectedType: Symbol('override protected type'),
  kOpts: Symbol('opts'),
  kAjv: Symbol('ajv instance'),
  kMakeResolver: Symbol('make resolver'),
  kOverrideFieldResolver: Symbol('override field resolver')
}
