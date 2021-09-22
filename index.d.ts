import { FastifyPluginAsync } from 'fastify'
import { GraphQLResolveInfo } from 'graphql'
import { MercuriusContext } from 'mercurius'
import { Options, SchemaObject } from 'ajv'

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

export type MercuriusValidationArgument<TParent = any, TArgs = any, TContext = MercuriusContext> = |
  SchemaObject |
  MercuriusValidationHandler<TParent, TArgs, TContext>;

export type MercuriusValidationField<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationArgument<TParent, TArgs, TContext>> | SchemaObject

export type MercuriusValidationType<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationField<TParent, TArgs, TContext>> & {
  __typeValidation?: SchemaObject
}

export type MercuriusValidationSchema<TParent = any, TArgs = any, TContext = MercuriusContext> = Record<string, MercuriusValidationType<TParent, TArgs, TContext>>

export type MercuriusValidationMode = 'JSONSchema' | 'JTD'

export interface MercuriusValidationOptions<TParent = any, TArgs = any, TContext = MercuriusContext> extends Options {
  mode?: MercuriusValidationMode;
  schema?: MercuriusValidationSchema<TParent, TArgs, TContext>;
}

/** Mercurius Validation is a plugin for `mercurius` that adds configurable validation support. */
declare const mercuriusValidation: FastifyPluginAsync<MercuriusValidationOptions>

export default mercuriusValidation
