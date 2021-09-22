import { expectType } from 'tsd'
import fastify from 'fastify'
import { GraphQLDirective, GraphQLResolveInfo } from 'graphql'
import { MercuriusContext } from 'mercurius'
import mercuriusValidation, { MercuriusValidationHandler, MercuriusValidationHandlerMetadata, MercuriusValidationOptions } from '../..'

// Validate GraphQL definitions
expectType<string>(mercuriusValidation.graphQLTypeDefs)
expectType<GraphQLDirective>(mercuriusValidation.graphQLDirective)

const app = fastify()

// Register without options
app.register(mercuriusValidation)
app.register(mercuriusValidation, {})

// Register with AJV options
app.register(mercuriusValidation, {
  coerceTypes: false
})

// Use different modes
app.register(mercuriusValidation, { mode: 'JTD' })
app.register(mercuriusValidation, { mode: 'JSONSchema' })

// Register JSON Schema definitions
app.register(mercuriusValidation, {
  mode: 'JSONSchema',
  schema: {
    Filters: {
      text: { minLength: 1 }
    },
    Query: {
      message: {
        id: {
          minLength: 1
        }
      }
    }
  }
})

// Register JTD definitions
app.register(mercuriusValidation, {
  mode: 'JTD',
  schema: {
    Filters: {
      text: { enum: ['hello', 'there'] }
    },
    Query: {
      message: {
        id: {
          type: 'uint8'
        }
      }
    }
  }
})

// Register Function definitions
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        async id (metadata, value, parent, args, context, info) {
          expectType<MercuriusValidationHandlerMetadata>(metadata)
          expectType<any>(value)
          expectType<any>(parent)
          expectType<any>(args)
          expectType<MercuriusContext>(context)
          expectType<GraphQLResolveInfo>(info)
        }
      }
    }
  }
})

// Using options as object without generics
interface CustomParent {
  parent: Record<string, any>;
}
interface CustomArgs {
  arg: Record<string, any>;
}
interface CustomContext extends MercuriusContext {
  hello?: string;
}
const validationOptions: MercuriusValidationOptions = {
  schema: {
    Query: {
      message: {
        async id (
          metadata,
          value,
          parent: CustomParent,
          args: CustomArgs,
          context: CustomContext,
          info
        ) {
          expectType<MercuriusValidationHandlerMetadata>(metadata)
          expectType<any>(value)
          expectType<CustomParent>(parent)
          expectType<CustomArgs>(args)
          expectType<CustomContext>(context)
          expectType<string | undefined>(context?.hello)
          expectType<GraphQLResolveInfo>(info)
        }
      }
    }
  }
}
app.register(mercuriusValidation, validationOptions)

// Using options as input object with generics
const authOptionsWithGenerics: MercuriusValidationOptions<CustomParent, CustomArgs, CustomContext> = {
  schema: {
    Query: {
      message: {
        async id (metadata, value, parent, args, context, info) {
          expectType<MercuriusValidationHandlerMetadata>(metadata)
          expectType<any>(value)
          expectType<CustomParent>(parent)
          expectType<CustomArgs>(args)
          expectType<CustomContext>(context)
          expectType<string | undefined>(context?.hello)
          expectType<GraphQLResolveInfo>(info)
        }
      }
    }
  }
}
app.register(mercuriusValidation, authOptionsWithGenerics)

// Creating functions using handler types
const id: MercuriusValidationHandler<{}, {}, CustomContext> =
  async (metadata, value, parent, args, context, info) => {
    expectType<MercuriusValidationHandlerMetadata>(metadata)
    expectType<any>(value)
    expectType<{}>(parent)
    expectType<{}>(args)
    expectType<CustomContext>(context)
    expectType<GraphQLResolveInfo>(info)
    expectType<string | undefined>(context?.hello)
  }
app.register(mercuriusValidation, {
  schema: {
    Query: {
      message: {
        id
      }
    }
  }
})
