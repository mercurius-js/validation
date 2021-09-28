'use strict'

const {
  GraphQLDirective,
  DirectiveLocation,
  GraphQLString,
  GraphQLSchema,
  printSchema,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} = require('graphql')
const Ajv = require('ajv')

function buildConstraintDirective () {
  const ajv = new Ajv()

  const locations = [
    DirectiveLocation.ARGUMENT_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION,
    DirectiveLocation.INPUT_OBJECT
  ]

  const args = {}
  // We only support the following JSON Schema types at the moment
  const typeMapper = {
    boolean: GraphQLBoolean, // Type: Boolean
    string: GraphQLString, // Type: String
    number: GraphQLInt, // Type: Int
    array: new GraphQLList(new GraphQLNonNull(GraphQLString)), // Type: [String!]
    'string.array': new GraphQLList(new GraphQLNonNull(GraphQLString)) // Type: [String!]
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
    required: 'object.html#required-properties',
    maxItems: 'array.html#length',
    minItems: 'array.html#length',
    uniqueItems: 'array.html#uniqueness'
  }

  for (const { keyword, definition } of Object.values(ajv.RULES.all)) {
    const parsedSchemaType = definition.schemaType.join('.')
    const type = typeMapper[parsedSchemaType]
    const allowedKeywordDocs = allowedKeywords[keyword]
    if (typeof allowedKeywordDocs === 'string' && typeof type !== 'undefined') {
      const [associatedType] = definition.type
      let associatedTypeDescription = ''
      if (typeof associatedType !== 'undefined') {
        associatedTypeDescription = ` for '${associatedType}' types`
      }
      const docsReference = `https://json-schema.org/understanding-json-schema/reference/${allowedKeywordDocs}`
      const description = `JSON Schema '${keyword}' keyword${associatedTypeDescription}. Reference: ${docsReference}.`
      args[keyword] = {
        description,
        type
      }
    }
  }

  // Add schema argument to pass custom schemas not yet supported by the directive definitions.
  args.schema = {
    type: GraphQLString,
    description: 'The "schema" argument is used to pass custom JSON Schemas with keywords and definitions that are not yet supported by the directive definitions.'
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

  return [directive, printSchema(schema)]
}

const [validationDirective, validationTypeDefs] = buildConstraintDirective()

module.exports = {
  validationDirective,
  validationTypeDefs
}
