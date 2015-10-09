# mongoql
experiment in generating GraphQL types and mongoose schemas from the same config

This is a proof-of-concept of an alternative approach to integrating GraphQL and MongoDB (via mongoose) than the one
provided by graffiti-mongoose.  Instead of translating existing mongoose schemas into a GraphQLSchema, a
`defineMongoObject` function generates both a `GraphQLObjectType` and mongoose Schema and Model classes from the same
config.

Ex:

```javascript
const {objectType: FoodType, mongoTypes: foodMongoTypes} = defineMongoObject({
  name: 'Food',
  fields: () => ({
    name: {
      type: GraphQLString,
      mongo: {
        type: String,
      }
    },
    description: {
      type: GraphQLString,
      args: {
        isYummy: {
          type: GraphQLBoolean,
          defaultValue: true,
        },
      },
      mongo: function ({isYummy}) {
        const desc = isYummy ? 'delicious' : 'disgusting';
        return `${this.name} is ${desc}!`;
      },
    }
  })
});
```

In the above, `objectType` is the `GraphQLObjectType`, and `mongoTypes` is a function which should be invoked after the
GraphQL schema is generated. It will return an object of the shape `{schema: mongoose.Schema, model: mongoose.Model}`.

Each GraphQL field definition can optionally accept a `mongo` property, which, if its type is `function` will be defined
as an instance method on the schema, otherwise it will be treated as a mongoose field config.
