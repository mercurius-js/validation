const Ajv = require('ajv/dist/jtd')
const { isInputObjectType } = require('graphql')

const { MER_VALIDATION_ERR_FAILED_VALIDATION } = require('../errors')

class JTDValidator {
  constructor () {
    this.validationSchemas = []

    // TODO: override options
    // TODO: add symbol
    this.ajv = new Ajv({ verbose: true })
  }

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
      optionalProperties: {}
    }
    for (const argument of schemaTypeField.args) {
      // TODO: move to helper function
      const argumentValidation = fieldValidation !== null ? fieldValidation[argument.name] || null : null
      // TODO: support functions
      let argumentValidationSchema = {}
      if (isInputObjectType(argument.type)) {
        argumentValidationSchema = { ...argumentValidationSchema, ref: argument.type.name }
      }
      if (argumentValidation !== null) {
        argumentValidationSchema = { ...argumentValidationSchema, ...argumentValidation }
      }
      fieldInputValidationSchema.optionalProperties[argument.name] = argumentValidationSchema
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
      $id: `https://mercurius.dev/validation/${typeName}/${fieldName}`
    }
    if (isInputObjectType(schemaTypeField.type)) {
      fieldValidationSchema = { ...fieldValidationSchema, ref: schemaTypeField.type.name }
    }
    if (fieldValidation !== null) {
      fieldValidationSchema = { ...fieldValidationSchema, ...fieldValidation }
    }

    if (fieldValidationSchema.type !== 'undefined') {
      this.validationSchemas.push(fieldValidationSchema)
      return fieldValidationSchema
    }
  }

  registerValidationPolicy (schema, validationPolicy) {
    // Traverse schema types and override resolvers with validation protection where necessary
    const definitions = {}
    for (const [typeName, schemaType] of Object.entries(schema.getTypeMap())) {
      const typeValidation = validationPolicy[typeName] || null
      const typeValidationSchema = {
        $id: `https://mercurius.dev/validation/${typeName}`,
        optionalProperties: {}
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
            const { $id, ...fieldValidationSchema } = this.getInputTypeFieldValidationSchema(typeName, fieldName, schemaTypeField, fieldValidation)
            if (typeof fieldValidationSchema !== 'undefined') {
              typeValidationSchema.optionalProperties[fieldName] = fieldValidationSchema
            }
          }
        }

        // TODO: handle all types?
        if (isInputObjectType(schemaType)) {
          this.validationSchemas.push(typeValidationSchema)
          definitions[typeName] = { optionalProperties: typeValidationSchema.optionalProperties }
        }
      }
    }

    for (const { $id, ...validationSchema } of this.validationSchemas) {
      this.ajv.addSchema({ ...validationSchema, definitions: { ...validationSchema.definitions, ...definitions } }, $id)
      // Force first compilation
      this.ajv.getSchema($id)
    }

    // TODO: Maybe have an option to override these settings if we don't want verbose mode on?
  }
}

module.exports = JTDValidator
