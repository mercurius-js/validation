import { FastifyInstance } from 'fastify'
import { GraphQLDirective, GraphQLResolveInfo } from 'graphql'
import { MercuriusContext } from 'mercurius'
import { Options, SchemaObject } from 'ajv'

/**
 * GraphQL metadata associated with the argument validation.
 */
export interface MercuriusValidationHandlerMetadata {
  /**
   * The name of the associated GraphQL type.
   */
  type: string;
  /**
   * The name of the associated GraphQL field.
   */
  field: string;
  /**
   * The name of the associated GraphQL argument.
   */
  argument: string;
}

/**
 * The validation function to run when an argument is selected by the GraphQL operation.
 * Thrown errors will be caught and handled by `mercurius-validation`.
 */
export type MercuriusValidationHandler<TParent = any, TArgs = any, TContext = MercuriusContext> = (
  metadata: MercuriusValidationHandlerMetadata,
  value: any,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<void>;

/**
 * Mercurius Validation argument definition. Accepts JSON Schema, JTD or custom function.
 */
export type MercuriusValidationArgument<TParent = any, TArgs = any, TContext = MercuriusContext> = |
  SchemaObject |
  MercuriusValidationHandler<TParent, TArgs, TContext>;

/**
 * Mercurius Validation field definition. Accepts argument definition, JSON Schema or JTD.
 */
export type MercuriusValidationField<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationArgument<TParent, TArgs, TContext>> | SchemaObject

/**
 * Mercurius Validation type definition. Accepts field definition and/or type validation definition.
 */
export type MercuriusValidationType<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationField<TParent, TArgs, TContext>> & {
  /**
   * Define a validation schema here to validate the GraphQL input object type.
   */
  __typeValidation?: SchemaObject
}

/**
 * Mercurius Validation schema. Each key corresponds to a GraphQL type name.
 */
export type MercuriusValidationSchema<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationType<TParent, TArgs, TContext>>

/**
 * The modes of operation available when interpreting Mercurius validation schemas.
 */
export type MercuriusValidationMode = 'JSONSchema' | 'JTD'

/**
 * Mercurius validation options.
 */
export interface MercuriusValidationOptions<TParent = any, TArgs = any, TContext = MercuriusContext> extends Options {
  /**
   * The mode of operation to use when interpreting Mercurius validation schemas (default: `"JSONSchema"`).
   */
  mode?: MercuriusValidationMode;
  /**
   * The validation schema definition for the Mercurius GraphQL server.
   */
  schema?: MercuriusValidationSchema<TParent, TArgs, TContext>;
  /**
   * Turn directive validation on or off (default: `true`).
   */
  directiveValidation?: boolean;
}

export default MercuriusValidation

/** Mercurius Validation is a plugin for `mercurius` that adds configurable validation support. */
declare function MercuriusValidation (
  instance: FastifyInstance,
  opts: MercuriusValidationOptions
): void;

declare namespace MercuriusValidation {
  export const graphQLTypeDefs: string
  export const graphQLDirective: GraphQLDirective
}
