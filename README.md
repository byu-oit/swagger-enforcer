[![Build Status](https://travis-ci.org/byu-oit/swagger-enforcer.svg?branch=master)](https://travis-ci.org/byu-oit/swagger-enforcer)
[![Coverage Status](https://coveralls.io/repos/github/byu-oit/swagger-enforcer/badge.svg?branch=master)](https://coveralls.io/github/byu-oit/swagger-enforcer?branch=master)

# OpenAPI-Enforcer

**Supports OpenAPI 2.0 (formerly Swagger) and OpenAPI 3.0.0**

Features

- Connect middleware*
- Request parsing and validating*
- Response building, formatting, and validating*
- Schema validation

\* *Some features coming soon*

## Table of Contents

- [Examples](#examples)

## Examples

[Table of Contents](#table-of-contents)

- [Primitive schema error report](#example-primitive-schema-error-report)
- [Complex schema error report](#example-complex-schema-error-report)
- [Complex schema validate](#example-complex-schema-validate)
- [Request Parsing](#example-request-parsing)
- [Response Building](#example-response-building)
- [Connect Middleware](#example-connect-middleware)

### Example: Primitive schema error report



[Back to Examples](#examples)

### Example: Complex schema validate

```js
const Swagger = require('../index');

const swagger = new Swagger({ openapi: '3.0.0' });

const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        names: {
            type: 'array',
            items: {
                type: 'string',
                minLength: 1
            }
        },
        date: {
            type: 'string',
            format: 'date-time',
            maximum: '2000-01-01T00:00:00.000Z'
        }
    }
};

swagger.validate(schema, {
    names: [ 'Bob', 'Jan', '' ],
    date: '2010-01-01T00:00:00.000Z',
    num: 8
});

/*
OUTPUT:

Error: One or more errors found during schema validation: 
  /names/2: String length below minimum length of 1 with length of 0: ''
  /date: Expected date-time to be less than or equal to 2000-01-01T00:00:00.000Z. Received: 2010-01-01T00:00:00.000Z
  /num: Property not allowed
    at ...
*/
```

[Back to Examples](#examples)

# API

## new Enforcer ( definition ) 

Create an OpenAPI enforcer instance.

| Parameter | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| definition | An openapi document or a string representing the version to use. | `string` or `object` | | 

Returns: An instance of the OpenAPI Enforcer

**Example 1 - String Parameter**

```js
const Enforcer = require('openapi-enforcer');
const enforcer = new Enforcer('2.0');   // create an enforcer for OpenAPI version 2.0
```

**Example 2 - Object Parameter**

```js
const Enforcer = require('openapi-enforcer');
const enforcer = new Enforcer({ openapi: '3.0.0' });   // create an enforcer for OpenAPI version 3.0.0
```

## enforcer.errors ( schema, value )

Validate a value against a schema and receive a detailed report where errors exist and why.

| Parameter | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| schema | The schema to validate the value against. | `object` | |
| value | The value to validate. | Any | |

Returns: An array of strings where each item in the array describes one error that was encountered.

```js
const Enforcer = require('openapi-enforcer');

// create the enforcer instance
const enforcer = new Enforcer({ openapi: '3.0.0' });

// define a schema to validate values against
const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        names: {
            type: 'array',
            items: {
                type: 'string',
                minLength: 1
            }
        },
        date: {
            type: 'string',
            format: 'date-time',
            maximum: '2000-01-01T00:00:00.000Z'
        }
    }
};

// get any errors and log to console
const errors = enforcer.errors(schema, {
    names: [ 'Bob', 'Jan', '' ],
    date: '2010-01-01T00:00:00.000Z',
    num: 8
});
// errors ==> [
//   /names/2: String length below minimum length of 1 with length of 0: ''
//   /date: Expected date-time to be less than or equal to 2000-01-01T00:00:00.000Z. Received: 2010-01-01T00:00:00.000Z
//   /num: Property not allowed
// ]
```

## enforcer.format ( schema, value )

Format a value to match the schema. This works for primitives, arrays, and objects. Arrays and objects will be traversed and their values also formatted recursively.

| Parameter | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| schema | The schema to format to. | `object` | |
| value | The value to format. | Any | |

Returns: The formatted value.

Can format:

- arrays and objects recursively
- binary from boolean, number, string, or Buffer
- boolean from any value
- byte from boolean, number, string, or Buffer
- date from Date, string, or number
- date-time from Date, string, or number
- integer from anything that !isNaN(value)
- number from anything that !isNaN(value)
- string from string, number, boolean, object, or Date

```js
const Enforcer = require('openapi-enforcer');
const enforcer = new Enforcer('3.0.0');

const schema = {
    type: 'object',
    properties: {
        time: {
            type: 'string',
            format: 'date-time'
        },
        public: {
            type: 'boolean'
        },
        seatsAvailable: {
            type: 'integer'
        }
    }
};

const value = enforcer.format(schema, {
    time: new Date(2000, 0, 1, 11), // formatted to ISO Date
    public: 1,                      // formatted to true
    seatsAvailable: 23.7            // formatted to integer
});
// value ==> {
//   startTime: '2000-01-01T11:00:00.000Z',
//   public: true,
//   seatsAvailable: 24
// }
```

## enforcer.populate ( schema, params [, value ] )

Build a value from a schema. While traversing the schema the final populated value may be derived from the provided value in combination with the schema's `default` value, the `x-template` value, or the `x-variable` value.

| Parameter | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| schema | The schema to build from | `object` | |
| params | A map of keys to values. These values are used to help build the final value | `object` | |
| value | An initial value to start with. | Any | |

Returns: The populated value.

### What you need to know about default, x-template, and x-variable

The `default` attribute is part of the OpenAPI specification. The type of it's value must be the same as the schema type. For example, if the schema is of type string, default cannot be a number. When `default` is a string [it can behave](#) like `x-template` and substitute parameters into the string. The advantage of using `default` over `x-template` in this scenario is that the `default` value will often appear in OpenAPI documentation generators.

The `x-template` value must be a string that will have parameter replacement occur on it. Parameters in the string may use handlebars, double handlebars, or colons depending on how the Enforcer instance has been [configured](#).

The `x-variable` will perform value substitution only.

If a conflict arises between the provided value, `default`, `x-template`, or `x-variable` then the following priority is observed:

1. The provided value
2. `x-variable`
3. `x-template`
4. `default`

```js
const Enforcer = require('openapi-enforcer');
const enforcer = new Enforcer('3.0.0');

const schema = {
    type: 'object',
    properties: {
        firstName: {
            type: 'string',
            'x-variable': 'firstName'
        },
        lastName: {
            type: 'string',
            'x-variable': 'lastName'
        },
        fullName: {
            type: 'string',
            'x-template': '{firstName} {lastName}'
        },
        profileUrl: {
            type: 'string',
            default: 'https://your-domain.com/users/{id}'
        }
    }
};

const params = {
    id: 12345,
    firstName: 'Jan',
    lastName: 'Smith'
}

const value = enforcer.populate(schema, params);
// value ==> {
//   firstName: 'Jan',
//   lastName: 'Smith',
//   fullName: 'Jan Smith',
//   profileUrl: 'https://your-domain.com/users/12345'
// }
```

## enforcer.validate ( schema, value )

Validate that the value adheres to the schema or throw an `Error`. This function calls [`enforcer.errors`](#) and if any errors occur then it packages them into a single `Error` instance and throws the `Error`.

| Parameter | Description | Type | Default |
| --------- | ----------- | ---- | ------- |
| schema | The schema to build from | `object` | |
| params | A map of keys to values. These values are used to help build the final value | `object` | |
| value | An initial value to start with. | Any | |

Returns: Nothing.



# OLD DOCS


```js
const SwaggerEnforcer   = require('swagger-enforcer');

const parser        = require('json-schema-ref-parser');    // for parsing json ref
const validator     = require('swagger-parser');            // for validating swagger 2.0

module.exports = function(definition, options) {
    return parser.dereference(definition)
        .then(definition => {
            return definition.openapi
                ? definition                    // skip validation for 3.0.0 until supported
                : validator.validate(definition);
        })
        .then(definition => {
            const v = definition.openapi || definition.swagger;
            const match = /^(\d+)/.exec(v);
            const major = match[1];
            const version = tryRequire('./bin-2/versions/v' + major);
            if (!version) throw Error('The swagger definition version is either invalid or not supported: ' + v);
            version.initialize(definition);
            return new Swagger(version, definition, options);
        });
};

function tryRequire(path) {
    try {
        return require(path);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') return null;
        throw err;
    }
}
```

```js
const result = process.env.NODE_ENV === 'development' ? swagger.enforce(schema) : swagger.populate(schema);
```


# Swagger-Enforcer

Automatically validate a value against the swagger schema while you build it. Alternatively you can validate the final value.

To validate while building ([enforce](#enforcerprototypeenforce)), this package requires support of the [native Proxy interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy). For NodeJS that means version 6.0.0 and newer. If your node version is lower than that you can still validate the final value ([validate](#enforcerprototypevalidate)) but will be unable to [enforce](#enforcerprototypeenforce) while building.

## Contents

- [Examples](#examples)
- [API](#api)
- [Enforcement Options](#enforcement-options)

## Examples

#### Example 1

**Validate While Building ([enforce](#enforcerprototypeenforce))**

```js
const Enforcer = require('swagger-enforcer');

// a schema to enforce
const schema = {
    type: 'object',
    properties: {
        num: {
            type: 'number',
            minimum: 0
        },
        str: {
            type: 'string',
            enum: ['foo', 'bar', 'baz'],
            default: 'foo'
        }
    }
};

// define swagger schema definitions
const definitions = {};

// define enforcer options
const options = { useDefaults: true };

// create enforcer instance that defines which rules to enforce
const enforcer = Enforcer(schema, definitions, options);

// build an object that enforces the schema
const obj = enforcer.enforce();

console.log(obj);       // { str: 'foo' } - this is because 'str' had a default value: 
obj.num = 5;            // validates successfully and value is set
obj.str = 'abc';        // throws an error because 'abc' is not in enum
```

#### Example 2

**Validate the Final Value ([validate](#enforcerprototypevalidate))**

```js
const Enforcer = require('swagger-enforcer');

// a schema to enforce
const schema = {
    type: 'object',
    properties: {
        num: {
            type: 'number',
            minimum: 0
        },
        str: {
            type: 'string',
            enum: ['foo', 'bar', 'baz'],
            default: 'foo'
        }
    }
};

// create enforcer instance that defines which rules to enforce
const enforcer = Enforcer(schema, {}, { useDefaults: true });

// build the object
const obj = {
    num: 5,
    str: 'abc'
};

// validate the object
enforcer.validate(schema, obj);  // throws an error because 'abc' is not in enum
```


## API

- [Enforcer (Constructor)](#enforcer)
    - [Enforcer.prototype.enforce](#enforcerprototypeenforce) - Create an object with enforcement.
    - [Enforcer.prototype.errors](#enforcerprototypeerrors) - Run a full validation of an value and get back an array of Error objects.
    - [Enforcer.prototype.validate](#enforcerprototypevalidate) - Run a full validation of an value.
- [Enforcer.applyTemplate](#enforcerapplytemplate) - Create an unenforced object with templates and defaults applied.
    - [defaults](#enforcerapplytemplatedefaults)
- [Enforcer.injectParameters](#enforcerinjectparameters) - Replace string parameters.
    - [defaults](#enforcerinjectparametersdefaults) - Set injectParameter defaults
- [Enforcer.is](#enforcerisbinary) - Type checking.
    - [binary](#enforceris)
    - [boolean](#enforcerisboolean)
    - [byte](#enforcerisbyte)
    - [date](#enforcerisdate)
    - [dateTime](#enforcerisdatetime)
    - [integer](#enforcerisinteger)
    - [number](#enforcerisnumber)
- [Enforcer.release](#enforcerrelease) - Create an unenforced copy of an enforced object.
- [Enforcer.same](#enforcersame) - Check if two values are equivalent.
- [Enforcer.to](#enforcerto) - Type conversion.
    - [binary](#enforcertobinary)
    - [boolean](#enforcertoboolean)
    - [byte](#enforcertobyte)
    - [date](#enforcertodate)
    - [dateTime](#enforcertodatetime)
    - [integer](#enforcertointeger)
    - [number](#enforcertonumber)

### Enforcer

Produce an enforcer instance that can enforce a swagger schema while you build the object and/or that validates the object after it is built.

**Signature:** `Enforcer (schema [, definitions [, options ] ]) : Enforcer`

**Parameters:**

* *schema* - The swagger schema to use for enforcement of values.

* *definitions* - An object containing definitions by name. Definitions are only necessary if using discriminators.

    ```
    {
        Pet: {
            type: 'object',
            discriminator: 'petType',
            properties: {
                name: {
                    type: 'string'
                },
                petType: {
                    type: 'string'
                }
            },
            required: ['name', 'petType']
        },
        Cat: {
            type: 'object',
            allOf: [
                {
                    $ref: '#/definitions/Pet'
                },
                {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string'
                        },
                        petType: {
                            type: 'string'
                        },
                        huntingSkill: {
                            type: string
                        }
                    }                
                }
            ]
        }
    }
    ```

* *options* - [Enforcement options](#enforcement-options). Defaults to:

    ```
    {
        autoFormat: false,
        enforce: {
            enum: true,
            maxItems: true,
            minItems: false,
            uniqueItems: true,
            multipleOf: true,
            maximum: true,
            minimum: true,
            maxLength: true,
            minLength: true,
            pattern: true,
            additionalProperties: true,
            maxProperties: true,
            minProperties: false,
            required: false
        },
        useDefaults: false
    }
    ```

**Returns** - An enforcer instance with the following prototype methods: [Enforcer.prototype.enforce](#enforcerprototypeenforce) and [Enforcer.prototype.validate](#enforcerprototypevalidate).

[Back to API Table of Contents](#api)

### Enforcer.prototype.enforce

Validate an object while you build it.

This method requires that your running a version of JavaScript that supports the [native Proxy interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

**Signature:** `.enforce ( [ initial ]) : *`

**Parameters:**

* *initial* - An optional value to initialize the enforcement with.
 
**Returns** - A proxied object or array if the schema is for an object or an array. Any modifications to the object or array will automatically be run through a performance optimized validation sequence. If the schema is for a non-object or non-array then the value cannot be proxied.

**Example** - [See Example 1](#example-1)

[Back to API Table of Contents](#api)

### Enforcer.prototype.errors

Validate a value as if it were fully built. An array is returned with any errors that were encountered.

**Signature:** `.errors ( value ) : Error[]`

**Parameters:**

* *value* - An value to validate.
 
**Returns** - An array of Error objects.

[Back to API Table of Contents](#api)

### Enforcer.prototype.validate

Validate a value as if it were fully built. If validation fails then an error will be thrown.

**Signature:** `.validate ( value ) : undefined`

**Parameters:**

* *value* - An value to validate.
 
**Returns** - Undefined. If validation fails then an error will be thrown.

**Example** - [See Example 2](#example-2)

[Back to API Table of Contents](#api)

### Enforcer.applyTemplate

Build an unenforced object from a schema's `x-template` definitions, applying parameters to the templates to to generate valid values.

**Signature:** `Enforcer.applyTemplate ( schema, definitions, params [, options, [, initialValue ] ] ) : object`

**Parameters:**

* *schema* - The schema to build objects from.

* *definitions* - The swagger definitions object. This is necessary if using discriminators, otherwise it can safely be set to an empty object `{}` or `null`.

* *params* - An object defining key value pairs for parameter enforcement.

* *options* - The options to use while building the object:

    - *autoFormat* - Any value set using `x-variable` will will automatically by type cast and formatted when possible to match the schema. Defaults to `true`.

    - *defaultsUseParams* - If applying `useDefaults` is set to true and this property is set to true then parameter replacement will also be set for defaults. Defaults to `true`.
    
    - *ignoreMissingRequired* - If set to `false` and any requires are missing in the schema then that part of the template will not be stampped. Defaults to `true`
    
    - *replacement* - Set the parameter replacement style to one of `colon`, `doubleHandlebar`, `handlebar`, or a custom `Function`. Defaults to `handlebar`.

    - *useDefaults* - Set to true to use `default` property in addition to `x-template` property to generate templates. Defaults to `true`.
    
    - *useTemplates* - Set to `true` to use the `x-template` property to produce string replacements. Defaults to `true`.
    
    - *useVariables* - Set to `true` to use the `x-variable` property to place values. Defaults to `true`.

* *initialValue* - An optional value to start building the object from. If provided it must match the schema's type.
 
**Returns** - An unenforced object with the template applied.
    
**Example**

```js
const schema = {
    type: 'object',
    properties: {
        firstName: {
            type: 'string',
            'x-template': '{firstName}'
        },
        fullName: {
            type: 'string',
            'x-template': '{firstName} {lastName}'
        },
        lastName: {
            type: 'string',
            'x-template': '{lastName}'
        },
        birthday: {
            type: 'string',
            format: 'date',
            'x-variable': 'birthday'
        },
        roles: {
            type: 'array',
            items: {
                type: 'string'
            },
            default: []
        }
    }
};

const params = {
    birthday: new Date(),
    firstName: 'Bob',
    lastName: 'Smith'
};

const x = Enforcer.applyTemplate(schema, null, params);

console.log(x);         //  {
                        //      firstName: 'Bob',
                        //      fullName: 'Bob Smith',
                        //      lastName: 'Smith',
                        //      birthday: '2000-01-01'
                        //      roles: []
                        //  }
```

[Back to API Table of Contents](#api)

### Enforcer.applyTemplate.defaults

An object that has the defaults to use for the applyTemplate. The defaults can be overwritten for this object and those changes may affect any future calls to [Enforcer.applyTemplate](#enforcerapplytemplate).

```js
Enforcer.applyTemplate.defaults = {
    autoFormat: true,
    defaultsUseParams: true,
    useDefaults: true,
    useTemplates: true,
    useVariables: true,
    replacement: 'handlebar'
};
```

[Back to API Table of Contents](#api)

### Enforcer.injectParameters

A static method that will find and replace string parameters with new values.

**Signature:** `Enforcer.injectParameters( value, parameters [, options ]) : undefined`

**Parameters:**

* *value* - The value to begin traversing and looking for strings to replace.

* *parameters* - An object with keys and values that represent what to replace in each string.
 
* *options* - Configuration options:

    * *mutate* - Set to `true` to mutate the passed in object, otherwise generate a copy. Defaults to `false`.

    * *replacement* - The replacement method to use. This can be one of `colon`, `doubleHandlebar`, `handlebar`, or a custom `Function`. Defaults to `handlebar`.
    
**Returns** the value after parameter injection.
    
**Example**

```js
const o = {
    foo: '{name} is {age} years old {when}'
};

const params = {
    name: 'Bob',
    age: 25,
    when: 'today'
};

const x = Enforcer.injectParameters(o, params);

console.log(x.foo);         // 'Bob is 25 years old today'
```

[Back to API Table of Contents](#api)

### Enforcer.injectParameters.defaults

An object that has the defaults to use for the parameterInjection. The defaults can be overwritten for this object and those changes may affect any future calls to [Enforcer.injectParameters](#enforcerinjectparameters).

```js
Enforcer.injectParameters.defaults = {
    mutate: false,
    replacement: 'handlebar'
};
```

### Enforcer.is

A group of static methods that determine if a value falls into one of several categories.

- [binary](#enforcerisbinary)
- [boolean](#enforcerisboolean)
- [byte](#enforcerisbyte)
- [date](#enforcerisdate)
- [dateTime](#enforcerisdatetime)
- [integer](#enforcerisinteger)
- [number](#enforcerisnumber)
    
#### Enforcer.is.binary

Check to see if a string is an 8-bit binary string consisting only of `0` and `1`.

**Signature:** `Enforcer.is.binary( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a binary string, otherwise `false`.

```js
Enforcer.is.binary('00101000');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.boolean

Check to see if a string equals `'true'` or `'false'`.

**Signature:** `Enforcer.is.boolean( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if `'true'` or `'false'`, otherwise `false`.

```js
Enforcer.is.boolean('true');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.byte

Check to see if a string is a base64 encoded string.

**Signature:** `Enforcer.is.base64( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a base64 encoded string, otherwise `false`.

```js
Enforcer.is.byte('aGVsbG8=');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.date

Check to see if a string is a date string.

**Signature:** `Enforcer.is.date( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a string in the date format `YYYY-MM-DD`, otherwise `false`.

```js
Enforcer.is.date('2000-01-01');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.dateTime

Check to see if a string is a date-time encoded string.

**Signature:** `Enforcer.is.dateTime( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a date in ISO string format `YYYY-MM-DDTHH:mm:ss:uuuZ`, otherwise `false`.

```js
Enforcer.is.dateTime('2000-01-01T00:00:00.000Z');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.integer

Check to see if a string is an integer encoded string.

**Signature:** `Enforcer.is.integer( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if the string is an encoded integer, otherwise `false`.

```js
Enforcer.is.integer('15');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.is.number

Check to see if a string is an number encoded string.

**Signature:** `Enforcer.is.number( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if the string is an encoded number, otherwise `false`.

```js
Enforcer.is.number('15.27');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.release

Take an enforced object and get it's equivalent non-enforced object.

**Signature:** `Enforcer.release( value ) : *`

**Parameters:**

- *value* - The value to release from enforcement.

**Returns:** The released value.

```js
const Enforcer = require('swagger-enforcer');

const enforcer = Enforcer();

const schema = {
    type: 'array',
    items: {
        type: 'number'
    }
};

const array = enforcer.enforce(schema, []);

try {
    // throws an error because the item is not a string
    array.push('a');   
} catch (e) {
    console.error(e.stack);
}

// release the enforcement
const released = Enforcer.release(array);

// no error thrown
released.push('a');
```

[Back to API Table of Contents](#api)

### Enforcer.same

Check to see if two values are similar, including the evaluation of objects and arrays.

**Signature:** `Enforcer.is.same( value1, value2 ) : boolean`

**Parameters:**

- *value1* - The first value to compare.

- *value2* - The second value to compare.

**Returns:** `true` if both values are similar, otherwise `false`.

```js
Enforcer.same({ a: 1, b: 2 }, { b: 2, a: 1 });    // true
```

[Back to API Table of Contents](#api)

### Enforcer.to

A group of static methods that can be used to convert values into their acceptable swagger type equivalents.

- [binary](#enforcertobinary)
- [boolean](#enforcertoboolean)
- [byte](#enforcertobyte)
- [date](#enforcertodate)
- [dateTime](#enforcertodatetime)
- [integer](#enforcertointeger)
- [number](#enforcertonumber)
    
#### Enforcer.to.binary

Convert a value into an 8-bit binary string.

**Signature:** `Enforcer.to.binary( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, string, or buffer.

**Returns:** An 8-bit binary string.

```js
Enforcer.to.binary(1);    // '00000001'
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.boolean

Convert a value into a boolean.

**Signature:** `Enforcer.to.boolean( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be of any type.

**Returns:** A boolean.

```js
Enforcer.to.boolean('hello');    // true
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.byte

Convert a value into an base64 encoded string.

**Signature:** `Enforcer.to.byte( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, string, or buffer.

**Returns:** A base64 encoded string.

```js
Enforcer.to.byte('hello');    // 'aGVsbG8='
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.date

Convert a value into a date encoded string.

**Signature:** `Enforcer.to.date( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a Date, number, or string.

**Returns:** A date encoded string of the format `YYYY-MM-DD`.

```js
Enforcer.to.date(new Date(2000, 0, 1, 0, 0, 0, 0));    // '2000-01-01'
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.dateTime

Convert a value into a date encoded string.

**Signature:** `Enforcer.to.dateTime( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a Date, number, or string.

**Returns:** A date encoded string of the format `YYYY-MM-DDTHH:mm:ss:uuuZ`.

```js
Enforcer.to.dateTime(new Date(2000, 0, 1, 0, 0, 0, 0));    // '2000-01-01T00:00:00.000Z'
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.integer

Convert a value into an integer.

**Signature:** `Enforcer.to.integer( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, or numeric string.

**Returns:** A number that is an integer.

```js
Enforcer.to.integer('15');    // 15
```

[Back to API Table of Contents](#api)
    
#### Enforcer.to.number

Convert a value into an number.

**Signature:** `Enforcer.to.number( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, or numeric string.

**Returns:** A number.

```js
Enforcer.to.number('1.23');    // 1.23
```

[Back to API Table of Contents](#api)

## Enforcement Options

The following object shows the defaults for enforcement:

```
{
    autoFormat: false,
    enforce: {
        enum: true,
        maxItems: true,
        minItems: false,
        uniqueItems: true,
        multipleOf: true,
        maximum: true,
        minimum: true,
        maxLength: true,
        minLength: true,
        pattern: true,
        additionalProperties: true,
        maxProperties: true,
        minProperties: false,
        required: false
    },
    useDefaults: false
}
```

Below is an explanation of each option:

* *autoFormat* - Whether to attempt to convert any values being set to their appropriate types. For example, if a schema expects a string of format `date-time` and this option is set to `true` then you can set the schema using a `Date` object and that object will automatically be converted to a string in `date-time` format. The advantage of using this is that it means you can skip to explicit use of the [conversion to api](#enforcerto) but the disadvantage is that it may obscure some errors if the conversion shouldn't have happened. Defaults to `false`.
  
* *enforce* - An object specifying the validation rules to enforce while building or validating a schema. If this value is set to `true` then all enforcement properties will be set to `true`. Conversely, if this value is set to `false` then all enforcement properties will be set to `false`. Some properties default to being disabled (`false`) because they would make it hard to build an object that is under active enforcement.

    **General Enforcement**
    
    * *enum* - Enforce that any values added match an item in the enum. Defaults to `true`.

    **Array Enforcement**
    
    * *maxItems* - Enforce that the array is not populated above its maxItems threshold. Defaults to `true`.
    
    * *minItems* - Enforce that the array is never smaller than its minItems threshold. Defaults to `false`.
    
    * *uniqueItems* - Enforce that each item in the array is always unique. Enabling this option may significantly increase processing time (more so for nested objects and arrays). Defaults to `true`.

    **Number and Integer Enforcement** 

    * *multipleOf* - Enforce multipleOf validation for numbers and integers. Defaults to `true`.
    
    * *maximum* - Enforce maximum validation for numbers and integers. Defaults to `true`.
    
    * *minimum* - Enforce minimum validation for numbers and integers. Defaults to `true`.

    **String Enforcement** 

    * *maxLength* - Enforce maxLength validation. Defaults to `true`.
    
    * *minLength* - Enforce minLength validation for numbers and integers. Defaults to `true`.
    
    * *pattern* - Enforce pattern matching. Defaults to `true`.

    **Object Enforcement** 
    
    * *additionalProperties* - Enforce additional property validation. Defaults to `true`.

    * *maxProperties* - Enforce maxProperties validation. Defaults to `true`.
    
    * *minProperties* - Enforce minProperties validation for numbers and integers. Defaults to `false`.
    
    * *required* - Enforce that required properties are set. Defaults to `false`.

* *useDefaults* - Whether to use default values to build out the swagger response object automatically, as much as possible. Defaults to `false`.