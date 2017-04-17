# Swagger-Enforcer

Automatically validate a value against the swagger schema while you build it. Alternatively you can validate the final value.

To validate while building, this package requires support of the [native Proxy interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy). For NodeJS that means version 6.0.0 and newer. If your node version is lower than that you can still validate the final object.

## Contents

- [Examples](#examples)
- [API](#api)
- [Enforcement Options](#enforcement-options)

## Examples

**Validate While Building**

```js
const Enforcer = require('swagger-enforcer');

// create enforcer instance
const enforcer = Enforcer({ useDefaults: true });

// the schema to enforce
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

// build an object that enforces the schema
const obj = enforcer.enforce(schema);

console.log(obj);       // because 'str' had a default value: { str: 'foo' }
obj.num = 5;            // validates successfully and value is set
obj.str = 'abc';        // throws an error because 'abc' is not in enum
```

**Validate the Final Object**

```js
const Enforcer = require('swagger-enforcer');

// create enforcer instance
const enforcer = Enforcer({ useDefaults: true });

// the schema to enforce
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
    - [Enforcer.prototype.enforce](#enforcer-prototype-enforce)
    - [Enforcer.prototype.validate](#enforcer-prototype-validate)
- [Enforcer.injectParameters](#enforcer-injectparameters)
- [Enforcer.is](#enforcer-is-binary) (type checking)
    - [binary](#enforcer-is-binary)
    - [boolean](#enforcer-is-boolean)
    - [byte](#enforcer-is-byte)
    - [date](#enforcer-is-date)
    - [dateTime](#enforcer-is-datetime)
    - [integer](#enforcer-is-integer)
    - [number](#enforcer-is-number)
- [Enforcer.release](#enforcer-release')
- [Enforcer.same](#enforcer-same)
- [Enforcer.to](#enforcer-to-binary) (type conversion)
    - [binary](#enforcer-to-binary)
    - [boolean](#enforcer-to-boolean)
    - [byte](#enforcer-to-byte)
    - [date](#enforcer-to-date)
    - [dateTime](#enforcer-to-datetime)
    - [integer](#enforcer-to-integer)
    - [number](#enforcer-to-number)

### Enforcer

Produce an enforcer instance that can enforce a swagger schema while you build the object and/or that validates the object after it is built.

**Signature:** `Enforcer ([ options ]) : Enforcer`

**Parameters:**

* *options* - [Enforcement options](#enforcement-options). Defaults to:

    ```
    {
        autoFormat: true,
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
        useDefaults: false,
        validateAll: true
    }
    ```

**Returns** - An enforcer instance with the following prototype methods: [Enforcer.prototype.enforce](#enforcer-prototype-enforce) and [Enforcer.prototype.validate](#enforcer-prototype-validate).

[Back to API Table of Contents](#api)

### Enforcer.prototype.enforce

Validate an object while you build it.

**Signature:** `.enforce ( schema [, initial ]) : *`

**Parameters:**

* *schema* - The swagger schema to enforce.

* *initial* - An optional value to initialize the enforcement with.
 
**Returns** - A proxied object or array if the schema is for an object or an array. Any modifications to the object or array will automatically be run through a performance optimized validation. If the schema is for a non-object or non-array then the value cannot be proxied.

[Back to API Table of Contents](#api)

### Enforcer.prototype.validate

Validate an object as if it were fully built. If validation fails then an error will be thrown.

**Signature:** `.validate ( schema, value) : undefined`

**Parameters:**

* *schema* - The swagger schema to enforce.

* *initial* - An optional value to initialize the enforcement with.
 
**Returns** - Undefined. If validation fails then an error will be thrown.

[Back to API Table of Contents](#api)

### Enforcer.injectParameters

A static method that will find and replace string parameters with new values.

**Signature:** `Enforcer.injectParameters( value, parameters [, options ]) : undefined`

**Parameters:**

* *value* - The value to begin traversing and looking for strings to replace.

* *parameters* - An objects with keys and values that represent what to replace in each string.
 
* *options* - Configuration options:

    * *replacement* - The replacement method to use. This can be one of `colon`, `doubleHandlebar`, `handlebar`, or a custom `Function`. Defaults to `handlebar`.

[Back to API Table of Contents](#api)
    
### Enforcer.is.binary

Check to see if a string is an 8-bit binary string consisting only of `0` and `1`.

**Signature:** `Enforcer.is.binary( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a binary string, otherwise `false`.

```js
Enforcer.is.binary('00101000');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.boolean

Check to see if a string equals `'true'` or `'false'`.

**Signature:** `Enforcer.is.boolean( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if `'true'` or `'false'`, otherwise `false`.

```js
Enforcer.is.boolean('true');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.byte

Check to see if a string is a base64 encoded string.

**Signature:** `Enforcer.is.base64( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a base64 encoded string, otherwise `false`.

```js
Enforcer.is.byte('aGVsbG8=');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.date

Check to see if a string is a date string.

**Signature:** `Enforcer.is.date( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a string in the date format `YYYY-MM-DD`, otherwise `false`.

```js
Enforcer.is.date('2000-01-01');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.dateTime

Check to see if a string is a date-time encoded string.

**Signature:** `Enforcer.is.dateTime( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if a date in ISO string format `YYYY-MM-DDTHH:mm:ss:uuuZ`, otherwise `false`.

```js
Enforcer.is.dateTime('2000-01-01T00:00:00.000Z');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.integer

Check to see if a string is an integer encoded string.

**Signature:** `Enforcer.is.integer( value ) : boolean`

**Parameters:**

- *value* - The value to test.

**Returns:** `true` if the string is an encoded integer, otherwise `false`.

```js
Enforcer.is.integer('15');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.is.number

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
const obj = enforcer.enforce(schema);
const released = Enforcer.release(obj);
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
    
### Enforcer.to.binary

Convert a value into an 8-bit binary string.

**Signature:** `Enforcer.to.binary( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, string, or buffer.

**Returns:** An 8-bit binary string.

```js
Enforcer.to.binary(1);    // '00000001'
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.boolean

Convert a value into a boolean.

**Signature:** `Enforcer.to.boolean( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be of any type.

**Returns:** A boolean.

```js
Enforcer.to.byte('hello');    // true
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.byte

Convert a value into an base64 encoded string.

**Signature:** `Enforcer.to.byte( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, string, or buffer.

**Returns:** A base64 encoded string.

```js
Enforcer.to.byte('hello');    // 'aGVsbG8='
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.date

Convert a value into a date encoded string.

**Signature:** `Enforcer.to.date( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a Date, number, or string.

**Returns:** A date encoded string of the format `YYYY-MM-DD`.

```js
Enforcer.to.date(new Date(2000, 0, 0, 0, 0, 0, 0));    // '2000-01-01'
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.dateTime

Convert a value into a date encoded string.

**Signature:** `Enforcer.to.dateTime( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a Date, number, or string.

**Returns:** A date encoded string of the format `YYYY-MM-DDTHH:mm:ss:uuuZ`.

```js
Enforcer.to.dateTime(new Date(2000, 0, 0, 0, 0, 0, 0));    // '2000-01-01T00:00:00.000Z'
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.integer

Convert a value into an integer.

**Signature:** `Enforcer.to.integer( value ) : string`

**Parameters:**

- *value* - The value to convert. The value can be a boolean, number, or numeric string.

**Returns:** A number that is an integer.

```js
Enforcer.to.integer('15');    // 15
```

[Back to API Table of Contents](#api)
    
### Enforcer.to.number

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

* *autoFormat* - Whether to attempt to convert any values being set to their appropriate types. For example, if a schema expects a string of format `date-time` and this option is set to `true` then you can set the schema using a `Date` object and that object will automatically be converted to a string in `date-time` format. The advantage of using this is that it means you don't need to explicitly use the [conversion to api](#) but the disadvantage is that it may obscure some errors if the conversion shouldn't have happened.
  
* *enforce* - The validation rules to enforce while building the response object.

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
    
    * *required* - Enforce pattern matching. If enabled then any objects being set into the response must already have required values. Defaults to `false`.

* *useDefaults* - Whether to use default values to build out the swagger response object automatically, as much as possible. Defaults to `false`.

* *validateAll* - When `true`, enable all all enforcement rules if validating the final object. Defaults to `true`. 