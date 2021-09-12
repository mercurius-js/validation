'use strict'

module.exports = {
  kApp: Symbol('app instance'),
  kOpts: Symbol('opts'),
  kAjv: Symbol('ajv instance'),
  kValidators: Symbol('validators'),
  kMakeResolver: Symbol('make resolver'),
  kOverrideFieldResolver: Symbol('override field resolver'),
  kValidationSchema: Symbol('validation schema'),
  kBuildValidationSchema: Symbol('build validation schema'),
  kBuildValidationSchemaFromDirective: Symbol('build validation schema from directive'),
  kSetArgumentValidationSchema: Symbol('set argument validation schema'),
  kSetFieldValidationSchema: Symbol('set field validation schema'),
  kJsonSchemaValidator: Symbol('json schema validator'),
  kValidationDirective: Symbol('validation directive'),
  kGetValidationDirectiveAST: Symbol('get validation directive ast'),
  kDirectiveValidator: Symbol('directive validator'),
  kSchemaValidator: Symbol('schema validator'),
  kFunctionValidator: Symbol('function validator'),
  kBuildArgumentsSchema: Symbol('build arguments validation schema'),
  kBuildInputTypeFieldSchema: Symbol('build input type field validation schema')
}
