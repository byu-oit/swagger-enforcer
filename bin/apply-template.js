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
const convertTo         = require('./convert-to');
const copy              = require('./copy');
const getSchemaType     = require('./schema-type');
const injectParameters  = require('./inject-parameters');

/**
 * Apply template and values.
 * @param {Object} schema
 * @param {Object} definitions
 * @param {Object} params
 * @param {Object} [options]
 * @param {*} [initialValue]
 * @returns {*}
 */
module.exports = function (schema, definitions, params, options, initialValue) {
    if (!definitions) definitions = {};
    if (!options) options = {};
    options = Object.assign(module.exports.defaults, options);
    const injector = typeof options.replacement === 'function'
        ? options.replacement
        : injectParameters.injectors[options.replacement];
    options.injector = function(type, template) {
        let result = injector(template, params);
        if (result !== template && type !== 'string' && convertTo.hasOwnProperty(type)) result = convertTo[type](result);
        return result;
    };

    if (options.useDefaults || options.useTemplates) {
        return arguments.length < 5
            ? applyTemplate(schema, definitions, params, options).value
            : applyTemplate(schema, definitions, params, options, initialValue).value;
    } else {
        return initialValue;
    }
};

module.exports.defaults = {
    defaultsUseParams: true,
    useDefaults: true,
    useTemplates: true,
    replacement: 'handlebar'
};

/**
 *
 * @param schema
 * @param definitions
 * @param params
 * @param options
 * @param value
 * @returns {{ applied: Boolean, value: *}}
 */
function applyTemplate(schema, definitions, params, options, value) {
    const valueNotProvided = arguments.length < 5;

    if (schema.discriminator && value.hasOwnProperty(schema.discriminator)) {
        const second = definitions[value[schema.discriminator]];
        const schemaHasAllOf = Array.isArray(schema.allOf);
        schema = copy(schema);

        const allOf = (Array.isArray(second.allOf) ? second.allOf : [ second ])
            .filter(s => s !== schema);
        (schemaHasAllOf ? schema.allOf : [ schema ]).forEach(s => {
            if (!allOf.includes(s)) allOf.push(s);
        });

        if (schemaHasAllOf) {
            schema.allOf = allOf;
        } else {
            schema = {
                type: 'object',
                allOf: allOf
            };
        }
    }

    const type = getSchemaType(schema);

    // if allOf then apply each item
    if (Array.isArray(schema.allOf)) {
        const applications = [{}];
        schema.allOf.forEach(schema => {
            const data = applyTemplate(schema, definitions, params, options, {});
            if (data.applied) applications.push(data.value);
        });
        applications.push(valueNotProvided ? {} : value);
        return {
            applied: applications.length > 2,
            value: Object.assign.apply(Object, applications)
        };
    }

    // if the value has a template and should use it then attempt to get its value
    if (valueNotProvided && options.useTemplates && schema.hasOwnProperty('x-template')) {
        let value = options.injector(schema.type, schema['x-template']);
        if (value !== schema['x-template']) {
            return {
                applied: true,
                value: value
            };
        }
    }

    // use default
    if (valueNotProvided && options.useDefaults && schema.hasOwnProperty('default')) {
        if (options.defaultsUseParams) {
            const type = typeof schema.default;
            if (value && type === 'object') {
                return applyTemplate(schema, definitions, params, options, schema.default);

            } else if (type === 'string') {
                return {
                    applied: true,
                    value: options.injector(schema.type, schema.default)
                };
            } else {
                return {
                    applied: true,
                    value: copy(schema.default)
                };
            }

        } else {
            return {
                applied: true,
                value: copy(schema.default)
            };
        }
    }

    // is an array
    if (type === 'array') {
        if (!Array.isArray(value) || !schema.items) return {
            applied: false,
            value: value
        };
        let setDefault = false;
        const result = value.map(item => {
            const data = applyTemplate(schema.items, definitions, params, options, item);
            if (data.applied) setDefault = true;
            return data.value;
        });
        return {
            applied: setDefault,
            value: setDefault ? result : value
        };

    }

    // is an object
    if (type === 'object') {

        // if the value was provided but is not an object then return the value as provided
        if (!valueNotProvided && (!value || typeof value !== 'object')) return {
            applied: false,
            value: value
        };

        // build a new object based on the provided object
        const result = valueNotProvided ? {} : Object.assign({}, value);
        const properties = schema.properties || {};
        const requires = [];
        let setDefault = false;

        Object.keys(properties)
            .forEach(property => {
                const subSchema = schema.properties[property];
                if (subSchema.required) requires.push(property);
                if ((options.useTemplates && subSchema.hasOwnProperty('x-template')) || (options.useDefaults && subSchema.hasOwnProperty('default')) || subSchema.type === 'object') {
                    const data = result.hasOwnProperty(property)
                        ? applyTemplate(subSchema, definitions, params, options, result[property])
                        : applyTemplate(subSchema, definitions, params, options);
                    if (data.applied) {
                        result[property] = data.value;
                        setDefault = true;
                    }
                }
            });

        // apply additional properties defaults
        if (schema.additionalProperties) {
            Object.keys(result)
                .forEach(property => {
                    if (!properties.hasOwnProperty(property)) {
                        const data = applyTemplate(schema.additionalProperties, definitions, params, options, result[property]);
                        if (data.applied) {
                            result[property] = data.value;
                            setDefault = true;
                        }
                    }
                });
        }

        // if missing a required then don't send back defaults (which may have caused the required error)
        const requiresLength = requires.length;
        for (let i = 0; i < requiresLength; i++) {
            if (!result.hasOwnProperty(requires[i])) {
                setDefault = false;
                break;
            }
        }

        return {
            applied: setDefault,
            value: setDefault ? result : value
        };
    }

    return {
        applied: false,
        value: value
    };
}