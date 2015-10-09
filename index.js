import {
  graphql,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import mongoose from 'mongoose';
import {isEmpty} from 'lodash';

function defineMongoObject(config) {
  const {name, fields: origFields} = config;

  let mongoSchema = undefined;
  let mongoModel = undefined;
  const mongoTypes = () => ({
    schema: mongoSchema,
    model: mongoModel
  });

  // Generating the mongo schema and model has to happen inside this
  // 'fields' thunk, because if the fields from the passed in `config`
  // are wrapped in a thunk, unwrapping it here could lead to undefined
  // model types.
  const fields = () => {
    const fieldConfigs = typeof(origFields) === 'function' ? origFields() : origFields;
    let mongoFields = {};
    let instanceMethods = {};

    let outputFields = {};
    for (let fieldName of Object.keys(fieldConfigs)) {
      let field = Object.assign({}, fieldConfigs[fieldName]);
      const {mongo} = field;
      if (mongo === undefined) {
        continue;
      }
      if (typeof(mongo) === 'function') {
        instanceMethods[fieldName] = mongo;
        field.resolve = (obj, args, resolveInfo) => {
          const method = obj[fieldName].bind(obj);
          return method(args, resolveInfo);
        };
      } else {
        mongoFields[fieldName] = mongo;
      }
      outputFields[fieldName] = field;
    }

    mongoSchema = mongoose.Schema({mongoFields});
    if (isEmpty(mongoFields) && isEmpty(instanceMethods)) {
      console.log(`No mongo defnitions found for ${name} type.`);
    } else {
      mongoSchema = mongoose.Schema(mongoFields);
      for (let key of Object.keys(instanceMethods)) {
        mongoSchema.methods[key] = instanceMethods[key];
      }
      mongoModel = mongoose.model(name, mongoSchema);
    }
    return outputFields;
  };

  const objectType = new GraphQLObjectType({
    isTypeOf: (obj) => obj instanceof mongoModel,
    ...config,
    fields,
  });

  return {objectType, mongoTypes};
}


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

const {objectType: UserType, mongoTypes: userMongoTypes} = defineMongoObject({
  name: 'User',
  fields: () => ({
    username: {
      type: GraphQLString,
      mongo: {
        type: String,
      }
    },
    favoriteFood: {
      type: FoodType,
      mongo: {
        type: mongoose.Schema.ObjectId,
        ref: 'Food',
      }
    }
  })
});


const QueryType = new GraphQLObjectType({
  name: 'RootQuery',
  fields: {
    yusef: {
      type: UserType,
      resolve: () => yusef,
    }
  }
});

const Schema = new GraphQLSchema({
  query: QueryType
});

// need to call the 'mongoTypes' thunks after the GraphQL schema is generated
const {model: FoodModel} = foodMongoTypes();
const {model: UserModel} = userMongoTypes();

const pizza = new FoodModel({name: 'pizza'});
const yusef = new UserModel({username: 'yusef', favoriteFood: pizza});


const query = `{
  yusef {
    username
    favoriteFood {
      name
      description(isYummy: false)
    }
  }
}`;

graphql(Schema, query).then(result => {
  console.log(JSON.stringify(result, null, 2));
});
