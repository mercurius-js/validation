'use strict'

const { isInputObjectType, valueFromASTUntyped } = require('graphql')
const JSONSchemaValidator = require('./json-schema-validator')
const { validationDirective } = require('../directive')
const {
  kOpts,
  kGetValidationDirectiveAST,
  kValidationDirective,
  kJsonSchemaValidator,
  kBuildValidationSchema,
  kSetFieldValidationSchema,
  kSetArgumentValidationSchema,
  kSetInputObjectTypeValidationSchema,
  kBuildValidationSchemaFromDirective
} = require('../symbols')

class DirectiveValidator {
  constructor (opts) {
    this[kValidationDirective] = validationDirective.name
    this[kOpts] = opts
  }

  [kGetValidationDirectiveAST] (astNode) {
    if (typeof astNode !== 'undefined' && Array.isArray(astNode.directives) && astNode.directives.length > 0) {
      const validationDirective = astNode.directives.find(
        (directive) => directive.name.value === this[kValidationDirective]
      )
      if (typeof validationDirective !== 'undefined') {
        return validationDirective
      }
    }
    return null
  }

  [kSetInputObjectTypeValidationSchema] (validationSchema, typeName, typeValidation) {
    // This is never going to be defined because it is always the first check for a type
    validationSchema[typeName] = { __typeValidation: typeValidation }
    return validationSchema
  }

  [kSetFieldValidationSchema] (validationSchema, typeName, fieldName, fieldValidation) {
    const typeValidationSchema = validationSchema[typeName]
    if (typeof typeValidationSchema === 'object') {
      typeValidationSchema[fieldName] = fieldValidation
    } else {
      validationSchema[typeName] = {
        [fieldName]: fieldValidation
      }
    }
    return validationSchema
  }

  [kSetArgumentValidationSchema] (validationSchema, typeName, fieldName, argumentName, argumentValidation) {
    const typeValidationSchema = validationSchema[typeName]
    if (typeof typeValidationSchema === 'object') {
      const fieldValidationSchema = typeValidationSchema[fieldName]
      if (typeof fieldValidationSchema === 'object') {
        fieldValidationSchema[argumentName] = argumentValidation
      } else {
        typeValidationSchema[fieldName] = { [argumentName]: argumentValidation }
      }
    } else {
      validationSchema[typeName] = {
        [fieldName]: { [argumentName]: argumentValidation }
      }
    }
    return validationSchema
  }

  [kBuildValidationSchemaFromDirective] (directiveAST) {
    let validationSchema = {}
    for (const argument of directiveAST.arguments) {
      // If custom schema argument, merge with existing validationSchema
      const value = valueFromASTUntyped(argument.value)
      if (argument.name.value === 'schema') {
        validationSchema = { ...validationSchema, ...JSON.parse(value) }
      } else {
        validationSchema[argument.name.value] = value
      }
    }
    return validationSchema
  }

  [kBuildValidationSchema] (graphQLSchema) {
    let validationSchema = {}
    for (const [typeName, type] of Object.entries(graphQLSchema.getTypeMap())) {
      if (!typeName.startsWith('__') && typeof type.getFields === 'function') {
        if (isInputObjectType(type)) {
          const inputObjectTypeDirectiveAST = this[kGetValidationDirectiveAST](type.astNode)
          if (inputObjectTypeDirectiveAST !== null) {
            const typeValidationSchema = this[kBuildValidationSchemaFromDirective](inputObjectTypeDirectiveAST)
            validationSchema = this[kSetInputObjectTypeValidationSchema](validationSchema, typeName, typeValidationSchema)
          }
        }
        for (const [fieldName, field] of Object.entries(type.getFields())) {
          if (typeof field.args !== 'undefined' && Object.keys(field.args).length > 0) {
            for (const argument of field.args) {
              const argumentDirectiveAST = this[kGetValidationDirectiveAST](argument.astNode)
              if (argumentDirectiveAST !== null) {
                const argumentValidationSchema = this[kBuildValidationSchemaFromDirective](argumentDirectiveAST)
                validationSchema = this[kSetArgumentValidationSchema](
                  validationSchema,
                  typeName,
                  fieldName,
                  argument.name,
                  argumentValidationSchema
                )
              }
            }
          } else if (isInputObjectType(type)) {
            const fieldDirectiveAST = this[kGetValidationDirectiveAST](field.astNode)
            if (fieldDirectiveAST !== null) {
              const fieldValidationSchema = this[kBuildValidationSchemaFromDirective](fieldDirectiveAST)
              validationSchema = this[kSetFieldValidationSchema](
                validationSchema,
                typeName,
                fieldName,
                fieldValidationSchema
              )
            }
          }
        }
      }
    }
    return validationSchema
  }

  registerValidationSchema (graphQLSchema) {
    // Instantiated here to make sure it is reset after a gateway schema refresh
    this[kJsonSchemaValidator] = new JSONSchemaValidator(this[kOpts])

    // If the schema includes the validation directive, set up the JSON Schema validation
    if (graphQLSchema.getDirectives().some(directive => directive.name === this[kValidationDirective])) {
      const validationSchema = this[kBuildValidationSchema](graphQLSchema)
      this[kJsonSchemaValidator].registerValidationSchema(graphQLSchema, validationSchema)
    }
  }
}

module.exports = DirectiveValidator
