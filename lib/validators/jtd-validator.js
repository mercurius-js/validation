'use strict'

const Ajv = require('ajv/dist/jtd')
const { isInputObjectType, isListType } = require('graphql')
const Validator = require('./validator')
const { kAjv, kOpts, kOverrideFieldResolver, kBuildValidationSchema, kBuildArgumentsSchema, kBuildInputTypeFieldSchema } = require('../symbols')
const { getTypeInfo } = require('../utils')

class JTDValidator extends Validator {
  [kBuildValidationSchema] (type, namedType, typeValidation, id) {
    let builtValidationSchema = {}
    if (id !== null) {
      builtValidationSchema = { $id: id }
    }

    if (isInputObjectType(namedType)) {
      if (isListType(type)) {
        const elements = { ...builtValidationSchema.elements, ref: namedType.name }
        builtValidationSchema = { ...builtValidationSchema, elements }
      } else {
        builtValidationSchema = { ...builtValidationSchema, ref: namedType.name }
      }
    }

    if (typeValidation !== null) {
      builtValidationSchema = { ...builtValidationSchema, ...typeValidation }
    }

    return builtValidationSchema
  }

  [kBuildArgumentsSchema] (typeName, fieldName, schemaTypeField, fieldValidation) {
    // Set up field arguments validation schema
    const fieldInputValidationSchema = {
      $id: `https://mercurius.dev/validation/${typeName}/${fieldName}`,
      optionalProperties: {}
    }

    for (const argument of schemaTypeField.args) {
      const argumentValidation = fieldValidation !== null ? fieldValidation[argument.name] || null : null
      const [argumentType, namedArgumentType] = getTypeInfo(argument)

      const argumentValidationSchema = this[kBuildValidationSchema](argumentType, namedArgumentType, argumentValidation, null)

      fieldInputValidationSchema.optionalProperties[argument.name] = argumentValidationSchema
    }
    this[kOverrideFieldResolver](typeName, schemaTypeField)

    return fieldInputValidationSchema
  }

  [kBuildInputTypeFieldSchema] (typeName, fieldName, schemaTypeField, fieldValidation) {
    const id = `https://mercurius.dev/validation/${typeName}/${fieldName}`
    const [fieldType, namedFieldType] = getTypeInfo(schemaTypeField)
    const { $id, ...validationSchema } = this[kBuildValidationSchema](fieldType, namedFieldType, fieldValidation, id)

    if (Object.keys(validationSchema).length === 0) {
      return null
    }
    return validationSchema
  }

  registerValidationSchema (schema, validationSchema) {
    // Instantiated here to make sure it is reset after a gateway schema refresh
    this[kAjv] = new Ajv({
      verbose: true,
      allErrors: true,
      // AJV does not yet support type coercion for JTD schemas: https://github.com/ajv-validator/ajv/issues/1724
      // coerceTypes: true,
      ...this[kOpts]
    })

    // Traverse schema types and override resolvers with validation protection where necessary
    const definitions = {}
    const schemasToRegister = []

    // Process each type within the schema
    for (const [typeName, schemaType] of Object.entries(schema.getTypeMap())) {
      const typeValidation = validationSchema[typeName] || null
      const typeValidationSchema = {
        $id: `https://mercurius.dev/validation/${typeName}`,
        optionalProperties: {},
        additionalProperties: true
      }

      // Process each field for the type
      if (!typeName.startsWith('__') && typeof schemaType.getFields === 'function') {
        // Handle any input object type validation
        if (isInputObjectType(schemaType) && typeValidation !== null && typeof typeValidation.__typeValidation !== 'undefined') {
          schemasToRegister.push(typeValidation.__typeValidation)
          definitions[typeName] = typeValidation.__typeValidation
        // Otherwise handle fields as normal
        } else {
          for (const [fieldName, schemaTypeField] of Object.entries(schemaType.getFields())) {
            const fieldValidation = typeValidation !== null ? typeValidation[fieldName] || null : null

            // If the field has arguments, register argument validation
            if (typeof schemaTypeField.args !== 'undefined' && Object.keys(schemaTypeField.args).length > 0) {
              const argumentsSchema = this[kBuildArgumentsSchema](typeName, fieldName, schemaTypeField, fieldValidation)
              schemasToRegister.push(argumentsSchema)
              // If the field parent type is an input type, register input object type field validation
            } else if (isInputObjectType(schemaType)) {
              const fieldValidationSchema = this[kBuildInputTypeFieldSchema](typeName, fieldName, schemaTypeField, fieldValidation)
              if (fieldValidationSchema !== null) {
                typeValidationSchema.optionalProperties[fieldName] = fieldValidationSchema
              }
            }
          }

          if (isInputObjectType(schemaType)) {
            schemasToRegister.push(typeValidationSchema)
            const { $id, ...typeValidationSchemaWithoutId } = typeValidationSchema
            definitions[typeName] = typeValidationSchemaWithoutId
          }
        }
      }
    }

    for (const { $id, ...validationSchema } of schemasToRegister) {
      this[kAjv].addSchema({ ...validationSchema, definitions: { ...validationSchema.definitions, ...definitions } }, $id)
      // Force first compilation to improve performance
      this[kAjv].getSchema($id)
    }
  }
}

module.exports = JTDValidator
