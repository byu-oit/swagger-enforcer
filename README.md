[![Build Status](https://travis-ci.org/byu-oit-appdev/swagger-enforcer.svg?branch=master)](https://travis-ci.org/byu-oit-appdev/swagger-enforcer)
[![Coverage Status](https://coveralls.io/repos/github/byu-oit-appdev/swagger-enforcer/badge.svg?branch=master)](https://coveralls.io/github/byu-oit-appdev/swagger-enforcer?branch=master)

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
- [Enforcer.injectParameters](#enforcer-injectparameters) - Replace string parameters.
- [Enforcer.is](#enforcerisbinary) - Type checking.
    - [binary](#enforceris)
    - [boolean](#enforcerisboolean)
    - [byte](#enforcerisbyte)
    - [date](#enforcerisdate)
    - [dateTime](#enforcerisdatetime)
    - [integer](#enforcerisinteger)
    - [number](#enforcerisnumber)
- [Enforcer.release](#enforcerrelease') - Create an unenforced copy of an enforced object.
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

### Enforcer.injectParameters

A static method that will find and replace string parameters with new values.

**Signature:** `Enforcer.injectParameters( value, parameters [, options ]) : undefined`

**Parameters:**

* *value* - The value to begin traversing and looking for strings to replace.

* *parameters* - An object with keys and values that represent what to replace in each string.
 
* *options* - Configuration options:

    * *replacement* - The replacement method to use. This can be one of `colon`, `doubleHandlebar`, `handlebar`, or a custom `Function`. Defaults to `handlebar`.
    
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