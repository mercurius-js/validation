'use strict'

const { isInputObjectType, valueFromASTUntyped } = require('graphql')
const JSONSchemaValidator = require('./json-schema-validator')
const { validationDirective } = require('../directive')
const { kOpts } = require('../symbols')

class DirectiveValidator {
  constructor (opts) {
    this[kOpts] = opts
    this.validationDirective = validationDirective.name
    this.jsonSchemaValidator = new JSONSchemaValidator(opts)
  }

  getValidationDirectiveAST (astNode) {
    if (Array.isArray(astNode.directives) && astNode.directives.length > 0) {
      const validationDirective = astNode.directives.find(
        (directive) => directive.name.value === this.validationDirective
      )
      if (typeof validationDirective !== 'undefined') {
        return validationDirective
      }
    }
    return null
  }

  setFieldValidationSchema (validationSchema, typeName, fieldName, fieldValidation) {
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

  setArgumentValidationSchema (validationSchema, typeName, fieldName, argumentName, argumentValidation) {
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

  buildValidationSchemaFromDirective (directiveAST) {
    const validationSchema = {}
    for (const argument of directiveAST.arguments) {
      validationSchema[argument.name.value] = valueFromASTUntyped(argument.value)
    }
    return validationSchema
  }

  buildValidationSchema (graphQLSchema) {
    let validationSchema = {}
    for (const [typeName, type] of Object.entries(graphQLSchema.getTypeMap())) {
      if (!typeName.startsWith('__') && typeof type.getFields === 'function') {
        for (const [fieldName, field] of Object.entries(type.getFields())) {
          if (typeof field.args !== 'undefined' && Object.keys(field.args).length > 0) {
            for (const argument of field.args) {
              const directiveAST = this.getValidationDirectiveAST(argument.astNode)
              if (directiveAST !== null) {
                const argumentValidationSchema = this.buildValidationSchemaFromDirective(directiveAST)
                validationSchema = this.setArgumentValidationSchema(
                  validationSchema,
                  typeName,
                  fieldName,
                  argument.name,
                  argumentValidationSchema
                )
              }
            }
          } else if (isInputObjectType(type)) {
            const directiveAST = this.getValidationDirectiveAST(field.astNode)
            if (directiveAST !== null) {
              const fieldValidationSchema = this.buildValidationSchemaFromDirective(directiveAST)
              validationSchema = this.setFieldValidationSchema(
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
    // If the schema includes the validation directive, set up the JSON Schema validation
    if (graphQLSchema.getDirectives().some(directive => directive.name === this.validationDirective)) {
      const validationSchema = this.buildValidationSchema(graphQLSchema)
      this.jsonSchemaValidator.registerValidationSchema(graphQLSchema, validationSchema)
    }
  }
}

module.exports = DirectiveValidator
