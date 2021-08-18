'use strict'

const { isScalarType, isInputObjectType } = require('graphql')
const {
  kApplyValidation,
  kValidationDirective,
  kGetValidationDirectiveAST
} = require('./symbols')
const { MER_VALIDATION_ERR_FAILED_POLICY_CHECK } = require('./errors')

class Validation {
  constructor ({ applyValidation, validationDirective }) {
    this[kApplyValidation] = applyValidation
    this[kValidationDirective] = validationDirective
    this.validators = new Map()
  }

  [kGetValidationDirectiveAST] (astNode) {
    if (Array.isArray(astNode.directives) && astNode.directives.length > 0) {
      const validationDirective = astNode.directives.find(
        (directive) => directive.name.value === this[kValidationDirective]
      )
      if (typeof validationDirective !== 'undefined') {
        return validationDirective
      }
    }
    return null
  }

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

  // TODO: convert to symbol
  async runPromises (promises, parent, args, context, info) {
    const results = await Promise.allSettled(promises.map(async promise => {
      const validationResult = await promise(parent, args, context, info)
      if (validationResult instanceof Error) {
        throw validationResult
      }

      if (!validationResult) {
        // TODO: create error with details
        throw new MER_VALIDATION_ERR_FAILED_POLICY_CHECK(info.fieldName)
      }
    }))

    const failedResults = results.filter(result => result.status === 'rejected')
    if (failedResults.length > 0) {
      // TODO: make an official error for this with details etc
      throw new Error(`Oh no! ${JSON.stringify(failedResults)}`)
    }
  }

  // TODO: convert to symbol
  getInputValidators (promises, inputNode, input) {
    if (typeof inputNode.astNode !== 'undefined') {
      if (isScalarType(inputNode.type)) {
        const validationDirective = this[kGetValidationDirectiveAST](inputNode.astNode)
        if (validationDirective !== null) {
          promises.push(this[kApplyValidation].bind(this, validationDirective, input))
        }
      }

      if (isInputObjectType(inputNode.type)) {
        for (const field of Object.values(inputNode.type.getFields())) {
          this.getInputValidators(promises, field, input[field.name])
        }
      }

      // TODO: support lists
      // TODO: support non-nulls
    }
  }

  // TODO: convert to symbol
  // TODO: for now do simple argument resolver to prove the concept
  makeResolver (field, resolverFn) {
    // TODO: indicate if we should override
    if (typeof field.args === 'undefined' || field.args.length === 0) {
      return undefined
    }
    const fieldArguments = field.args
    return async (parent, args, context, info) => {
      const promises = []
      for (const inputNode of fieldArguments) {
        const argValue = args[inputNode.name]
        if (typeof argValue !== 'undefined') {
          this.getInputValidators(promises, inputNode, argValue)
        }
      }

      await this.runPromises(promises, parent, args, context, info)

      // TODO: handle return type
      return resolverFn(parent, args, context, info)
    }
  }

  registerValidationHandlers (schema) {
    // Traverse schema types and override resolvers with validation protection where necessary
    const schemaTypeMap = schema.getTypeMap()
    for (const schemaType of Object.values(schemaTypeMap)) {
      // Handle fields on schema type
      if (typeof schemaType.getFields === 'function') {
        for (const [fieldName, field] of Object.entries(
          schemaType.getFields()
        )) {
          // TODO: leaving this here for now
          // if (!schemaType.name.startsWith('__') && typeof field.args !== 'undefined' && field.args.length > 0) {
          //   for (const argument of field.args) {
          //     const { type } = argument
          //     console.log(`${argument.name}String`, schemaType, field.name)
          //     const scalar = schema.getType(`${argument.name}String`)
          //     scalar.serialize = (value) => {
          //       value = type.serialize(value)

          //       return value
          //     }
          //     scalar.parseValue = (value) => {
          //       value = type.serialize(value)

          //       return type.parseValue(value)
          //     }
          //     scalar.parseLiteral = (ast) => {
          //       const value = type.parseLiteral(ast)

          //       return value
          //     }
          //     argument.type = scalar
          //   }
          // }
          if (typeof field.resolve === 'function') {
            const originalFieldResolver = field.resolve
            field.resolve = this.makeResolver(field, originalFieldResolver) ?? originalFieldResolver
          } else {
            field.resolve = this.makeResolver(field, (parent) => parent[fieldName])
          }
        }
      }
    }
  }
}

module.exports = Validation
