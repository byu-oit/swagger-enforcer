/**
 *  @license
 *    Copyright 2017 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const util      = require('../util');

exports.defaults = {

    enforce: {
        // numbers
        multipleOf: true,
        maximum: true,
        minimum: true,

        // strings
        maxLength: true,
        minLength: true,
        pattern: true,

        // arrays
        maxItems: true,
        minItems: false,        // defaults to false because you're likely building the array and the initial number of items may be too low
        uniqueItems: true,

        // objects
        additionalProperties: true,
        maxProperties: true,
        minProperties: false,   // defaults to false because you're likely building the object and the initial number of properties may be too low
        required: false,        // defaults to false because as you're building you may not have added all properties

        // general
        enum: true
    },

    populate: {
        defaults: true,
        format: false,          // setting this value may hide some errors as values are auto formatted to their correct type
        templates: true,
        variables: true
    },

    request: {
        purge: true,            // any provided request data (in query or form data) that is not specified in the swagger will be ignored
        strict: true            // the request can only supply data (in query or form data) in the spec or an error is thrown
    },

    validate: {
        // numbers
        multipleOf: true,
        maximum: true,
        minimum: true,

        // strings
        maxLength: true,
        minLength: true,
        pattern: true,

        // arrays
        maxItems: true,
        minItems: true,
        uniqueItems: true,

        // objects
        additionalProperties: true,
        maxProperties: true,
        minProperties: true,
        required: true,

        // general
        enum: true
    }

};

exports.request = function(context, request, path, store) {
    const errors = [];

    const options = store.defaults.request;
    const purge = options.purge;
    const strict = options.strict;
    const schema = path.schema;
    const consumes = store.definition.consumes || schema.consumes || [];

    const formData = {};
    const header = {};
    const path = {};
    const query = {};
    const result = {
        formData: formData,
        header: header,
        path: path,
        query: query
    };

    // map parameters to object map for faster lookup
    const parameters = { formData: {}, header: {}, path: {}, query: {} };
    schema.parameters.forEach(param => {
        param.in === 'body'
            ? parameters.body = param
            : parameters[param.in][param.name] = param;
    });

    //////////////////////////////////
    //                              //
    //   STEP 1: PARSE PARAMETERS   //
    //                              //
    //////////////////////////////////

    // parse body or formData (mutually exclusive)
    if (parameters.body) {
        result.body = parseSchema(errors, 'Error in body at ', parameters.body, request.body);
    } else {
        // TODO: parse form data?
    }

    // iterate through header
    Object.keys(request.header).forEach(name => {
        const schema = parameters.header[name];
        const value = request.header[name];
        if (schema && schema.in === 'header') {
            header[name] = parse(errors, 'Error in header at /' + name, schema, value)
        } else {
            header[name] = value;
        }
    });

    // iterate through path parameters
    Object.keys(path.params).forEach(name => {
        const schema = parameters.path[name];
        const value = path.params[name];
        if (schema && schema.in === 'path') {
            path[name] = parse(errors, 'Error in path parameter at /' + name, schema, value)
        } else {
            path[name] = value;
        }
    });

    // iterate through query parameters
    request.query.forEach(item => {
        const name = item.name;
        const schema = parameters.query[name];
        const value = item.value;

        if (schema && schema.in === 'query') {
            if (schema.type === 'array' && schema.collectionFormat === 'multi') {
                if (!query[name]) query[name] = [];
                query[name].push(parse(errors, 'Error in query parameter at /' + name, schema.items, value));
            } else {
                query[name] = parse(errors, 'Error in query parameter at /' + name, schema, value);
            }

        } else if (strict) {
            errors.push('Query parameter not allowed: ' + name);

        } else if (!purge) {
            result[name] = item.value;
        }
    });



    //////////////////////////////////////
    //                                  //
    //   STEP 2: VALIDATE PARAMETERS    //
    //                                  //
    //////////////////////////////////////

    return result;
};

// TODO: rework this to use validate.js logic
function parse(errors, prefix, schema, value) {
    const errorsLength = errors.length;
    let length;
    let result;
    switch (schema.type) {
        case 'array':
            switch (schema.collectionFormat) {
                case 'ssv':
                    result = value.split(' ');
                    break;
                case 'tsv':
                    result = value.split('\t');
                    break;
                case 'pipes':
                    result = value.split('|');
                    break;
                case 'csv':
                default:
                    result = value.split(',');
                    break;
            }
            validateArray(errors, prefix, schema.items, result);
            return result.map((v, i) => parse(errors, prefix + '/' + i, schema.items, v));

        case 'boolean':
            if (value === 'false') return false;
            return !!value;

        case 'integer':
            result = +value;
            const rounded = Math.round(result);
            if (isNaN(result) || rounded !== result) errors.push(prefix + ': Expected an integer. Received: ' + util.smart(value));
            validateNumber(errors, prefix, schema, result);
            return result;

        case 'number':
            result = +value;
            validateNumber(errors, prefix, schema, result);
            return result;

        case 'string':
            switch (schema.format) {
                case 'byte':
                    if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) errors.push(prefix + ': Expected a base64 string. Received: ' + util.smart(value));
                    validateEnum(errors, prefix, schema, value);
                    return new Buffer(value, 'base64');

                case 'binary':
                    if (!/^(?:[01]{8})+$/.test(value)) errors.push(prefix + ': Expected a binary string. Received: ' + util.smart(value));
                    validateEnum(errors, prefix, schema, value);
                    return new Buffer(value, 'binary');

                case 'date':
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(prefix + ': Expected a full-date string as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + util.smart(value));
                    validateEnum(errors, prefix, schema, value);
                    return new Date(value + 'T00:00:00.000Z');

                case 'date-time':
                    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) errors.push(prefix + ': Expected a date-time as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + util.smart(value));
                    validateEnum(errors, prefix, schema, value);
                    return new Date(value);

                default:
                    validateEnum(errors, prefix, schema, value);
                    validateString(errors, prefix, schema, value);
                    return value;
            }
            break;
    }
}

function parseSchema(errors, schema, value) {

}

function validateArray(errors, prefix, schema, value) {
    const length = value.length;

    if (schema.maxItems < length) errors.push(prefix + ': Array length above maximum length of ' + schema.maxItems + ' with ' + length + ' items.');
    if (schema.minItems > length) errors.push(prefix + ': Array length below minimum length of ' + schema.minItems + ' with ' + length + ' items.');
    if (schema.uniqueItems) {
        const singles = [];
        value.forEach((item, index) => {
            const length = singles.length;
            let found;
            for (let i = 0; i < length; i++) {
                if (util.same(item, singles[i])) {
                    errors.push(prefix + ': Array values must be unique. Value is not unique at index ' + index + ': ' + item);
                    found = true;
                    break;
                }
            }
            if (!found) singles.push(item);
        });
    }

    return errors;
}