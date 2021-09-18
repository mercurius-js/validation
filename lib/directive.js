'use strict'

const { GraphQLDirective, DirectiveLocation, GraphQLString, GraphQLSchema, printSchema, GraphQLBoolean, GraphQLInt } = require('graphql')
const Ajv = require('ajv')

function buildConstraintDirective () {
  const ajv = new Ajv()

  const locations = [
    DirectiveLocation.ARGUMENT_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION
  ]

  const args = {}
  // We only support the following JSON Schema types at the moment
  const typeMapper = {
    boolean: GraphQLBoolean,
    string: GraphQLString,
    number: GraphQLInt
    // TODO: array of strings/numbers - maybe after v1
  }

  const allowedKeywords = {
    type: 'type.html',
    maxLength: 'string.html#length',
    minLength: 'string.html#length',
    format: 'string.html#format',
    pattern: 'string.html#pattern',
    maximum: 'numeric.html#range',
    minimum: 'numeric.html#range',
    exclusiveMaximum: 'numeric.html#range',
    exclusiveMinimum: 'numeric.html#range',
    multipleOf: 'numeric.html#multiples',
    maxProperties: 'object.html#size',
    minProperties: 'object.html#size',
    maxItems: 'array.html#length',
    minItems: 'array.html#length',
    uniqueItems: 'array.html#uniqueness'
  }

  const allowedSchemaTypes = Object.keys(typeMapper)
  for (const { keyword, definition } of Object.values(ajv.RULES.all)) {
    const [filteredSchemaType] = definition.schemaType.filter(type => allowedSchemaTypes.includes(type))
    const type = typeMapper[filteredSchemaType]
    const allowedKeywordDocs = allowedKeywords[keyword]
    if (typeof allowedKeywordDocs === 'string' && typeof type !== 'undefined') {
      const [associatedType] = definition.type
      let associatedTypeDescription = ''
      if (typeof associatedType !== 'undefined') {
        associatedTypeDescription = ` for '${definition.type[0]}' types`
      }
      const docsReference = `https://json-schema.org/understanding-json-schema/reference/${allowedKeywordDocs}`
      const description = `JSON Schema '${keyword}' keyword${associatedTypeDescription}. Reference: ${docsReference}.`
      args[keyword] = {
        description,
        type
      }
    }
  }

  const directive = new GraphQLDirective({
    name: 'constraint',
    args,
    locations,
    description: 'JSON Schema constraint directive.'
  })

  const schema = new GraphQLSchema({
    directives: [directive]
  })

  return [directive, schema, printSchema(schema)]
}

const [validationDirective, validationTypes, validationTypeDefs] = buildConstraintDirective()

module.exports = {
  validationDirective,
  validationTypes,
  validationTypeDefs
}
