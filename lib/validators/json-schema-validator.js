'use strict'

const Ajv = require('ajv')
const { isInputObjectType } = require('graphql')
const { MER_VALIDATION_ERR_FAILED_VALIDATION, MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED } = require('../errors')

class JSONSchemaValidator {
  constructor () {
    this.validationSchemas = []
  }

  // [kGetValidationDirectiveAST] (astNode) {
  //   if (Array.isArray(astNode.directives) && astNode.directives.length > 0) {
  //     const validationDirective = astNode.directives.find(
  //       (directive) => directive.name.value === this[kValidationDirective]
  //     )
  //     if (typeof validationDirective !== 'undefined') {
  //       return validationDirective
  //     }
  //   }
  //   return null
  // }

  // [kValidate] (validationDirectiveAST, parent, args, context, info) {
  //   const validationResult = this[kApplyValidation](validationDirectiveAST, parent, args, context, info)
  //   if (validationResult instanceof Error) {
  //     throw validationResult
  //   }
  //   if (!validationResult) {
  //     throw new MER_VALIDATION_ERR_FAILED_POLICY_CHECK(field.name)
  //   }
  // }

  // [kOverrideProtectedType] (schemaType, node) {
  //   const validationDirective = this[kGetValidationDirectiveAST](node.astNode)
  //   if (validationDirective !== null) {
  //     if (isScalarType(node.type)) {
  //       node.type = this[kMakeProtectedScalarType](validationDirective, schemaType, node, node.type)
  //     }
  //   }
  // }

  // // TODO: convert to symbol
  // getInputValidators (promises, inputNode, input) {
  //   if (typeof inputNode.astNode !== 'undefined') {
  //     if (isScalarType(inputNode.type)) {
  //       const validationDirective = this[kGetValidationDirectiveAST](inputNode.astNode)
  //       if (validationDirective !== null) {
  //         promises.push(this[kApplyValidation].bind(this, validationDirective, input))
  //       }
  //     }

  //     if (isInputObjectType(inputNode.type)) {
  //       for (const field of Object.values(inputNode.type.getFields())) {
  //         this.getInputValidators(promises, field, input[field.name])
  //       }
  //     }

  //     // TODO: support lists
  //     // TODO: support non-nulls
  //   }
  // }

  makeResolver (type, field, resolverFn) {
    return async (parent, args, context, info) => {
      // TODO: skip if no args
      const errors = []
      const validate = this.ajv.getSchema(`https://mercurius.dev/validation/${type}/${field}`)
      const valid = validate(args)
      if (!valid) {
        errors.push(...validate.errors)
      }

      // TODO: handle functions
      // for (const [argumentName, argument] of Object.entries(args)) {
      //   // TODO: see if we can make this generic? By maybe getting from a map instead
      //   if (typeof validate !== 'function') {
      //     // TODO: error
      //     throw new Error(`Validator not found for key '${type}.${field}.${argumentName}'`)
      //   }
      // }

      if (errors.length > 0) {
        // TODO: error
        // TODO: logging?
        throw new MER_VALIDATION_ERR_FAILED_VALIDATION(`Failed Validation on arguments for field '${type}.${field}'`, errors)
      }

      return resolverFn(parent, args, context, info)
    }
  }

  registerArgumentValidation (typeName, fieldName, schemaTypeField, fieldValidation) {
    // Set up field validation schema
    // TODO: JTD
    const fieldInputValidationSchema = {
      $id: `https://mercurius.dev/validation/${typeName}/${fieldName}`,
      type: 'object',
      properties: {}
    }
    for (const argument of schemaTypeField.args) {
      // TODO: move to helper function
      const argumentValidation = fieldValidation !== null ? fieldValidation[argument.name] || null : null
      // TODO: support functions
      let argumentValidationSchema = {
        // TODO: type
        $id: `https://mercurius.dev/validation/${typeName}/${fieldName}/${argument.name}`
      }
      if (isInputObjectType(argument.type)) {
        argumentValidationSchema = { ...argumentValidationSchema, $ref: `https://mercurius.dev/validation/${argument.type.name}` }
      }
      if (argumentValidation !== null) {
        argumentValidationSchema = { ...argumentValidationSchema, ...argumentValidation }
      }
      fieldInputValidationSchema.properties[argument.name] = argumentValidationSchema
    }
    this.validationSchemas.push(fieldInputValidationSchema)

    // Overwrite field resolver
    if (typeof schemaTypeField.resolve === 'function') {
      const originalFieldResolver = schemaTypeField.resolve
      schemaTypeField.resolve = this.makeResolver(typeName, fieldName, originalFieldResolver)
    } else {
      schemaTypeField.resolve = this.makeResolver(typeName, fieldName, (parent) => parent[fieldName])
    }
  }

  getInputTypeFieldValidationSchema (typeName, fieldName, schemaTypeField, fieldValidation) {
    let fieldValidationSchema = {
      // TODO: type
      $id: `https://mercurius.dev/validation/${typeName}/${fieldName}`
    }
    if (isInputObjectType(schemaTypeField.type)) {
      fieldValidationSchema = { ...fieldValidationSchema, type: 'object', $ref: `https://mercurius.dev/validation/${schemaTypeField.type.name}` }
    }
    if (fieldValidation !== null) {
      fieldValidationSchema = { ...fieldValidationSchema, ...fieldValidation }
    }
    // Only consider fields where we have inferred the type to avoid any AJV errors
    if (fieldValidation !== null && typeof fieldValidationSchema.type === 'undefined') {
      throw new MER_VALIDATION_ERR_FIELD_TYPE_UNDEFINED(fieldValidationSchema.$id)
    }

    if (fieldValidationSchema.type !== 'undefined') {
      this.validationSchemas.push(fieldValidationSchema)
      return fieldValidationSchema
    }
  }

  // TODO: We are just considering inputs and functions on arguments.
  // We are not considering:
  //  - Functions on input type fields (for V1)
  //  - Validation on responses (for V1)
  registerValidationPolicy (schema, validationPolicy) {
    // Traverse schema types and override resolvers with validation protection where necessary
    for (const [typeName, schemaType] of Object.entries(schema.getTypeMap())) {
      const typeValidation = validationPolicy[typeName] || null
      const typeValidationSchema = {
        $id: `https://mercurius.dev/validation/${typeName}`,
        type: 'object',
        properties: {}
      }

      if (!typeName.startsWith('__') && typeof schemaType.getFields === 'function') {
        for (const [fieldName, schemaTypeField] of Object.entries(schemaType.getFields())) {
          const fieldValidation = typeValidation !== null ? typeValidation[fieldName] || null : null
          // TODO: see if we can use functions as well
          // If the field has arguments
          if (typeof schemaTypeField.args !== 'undefined') {
            this.registerArgumentValidation(typeName, fieldName, schemaTypeField, fieldValidation)
          // If the field parent type is an input type
          } else if (isInputObjectType(schemaType)) {
            const fieldValidationSchema = this.getInputTypeFieldValidationSchema(typeName, fieldName, schemaTypeField, fieldValidation)
            if (typeof fieldValidationSchema !== 'undefined') {
              typeValidationSchema.properties[fieldName] = fieldValidationSchema
            }
          }
        }

        // TODO: handle all types?
        if (isInputObjectType(schemaType)) {
          this.validationSchemas.push(typeValidationSchema)
        }
      }
    }

    // TODO: Maybe have an option to override these settings if we don't want verbose mode on?
    this.ajv = new Ajv({ verbose: true, schemas: this.validationSchemas })
  }
}

module.exports = JSONSchemaValidator
