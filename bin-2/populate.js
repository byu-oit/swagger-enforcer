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
const util          = require('./util');

exports.injector = {
    colon: buildInjector(() => /:([_$a-z][_$a-z0-9]*)/ig),
    doubleHandlebar: buildInjector(() => /{{([_$a-z][_$a-z0-9]*)}}/ig),
    handlebar: buildInjector(() => /{([_$a-z][_$a-z0-9]*)}/ig)
};

exports.populate = function(v, schema, map, value) {
    const type = util.schemaType(schema);

    // if a discriminator exists then get its parent's allOf
    if (!schema.allOf && schema.discriminator && value.hasOwnProperty(schema.discriminator)) {
        const second = v.schemas[value[schema.discriminator]];
        const allOf = (Array.isArray(second.allOf) ? second.allOf : [ second ])
            .filter(s => s !== schema);

        const schemaCopy = Object.assign({}, schema);
        delete schemaCopy.discriminator;
        allOf.push(schemaCopy);

        schema = {
            type: 'object',
            allOf: allOf
        };
    }

    // if allOf then apply each item
    if (Array.isArray(schema.allOf)) {
        const applications = [{}];
        schema.allOf.forEach(schema => {
            const data = exports.populate(v, schema, map, value);
            if (data.applied) applications.push(data.value);
        });
        return {
            applied: applications.length > 2,
            value: Object.assign.apply(Object, applications)
        };
    }

    // is an array
    if (type === 'array') {
        if (!Array.isArray(value) || !schema.items) return {
            applied: false,
            value: value
        };
        let setDefault = false;
        const result = value.map(item => {
            const data = exports.populate(v, schema.items, map, item);
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
        if ((!value || typeof value !== 'object')) return {
            applied: false,
            value: value
        };

        working here

        // build a new object based on the provided object
        const result = valueNotProvided ? {} : Object.assign({}, value);
        const properties = schema.properties || {};
        const requires = schema.required || [];
        let setDefault = false;

        Object.keys(properties)
            .forEach(property => {
                const subSchema = schema.properties[property];

                //if (subSchema.required) requires.push(property);
                if ((options.useTemplates && subSchema.hasOwnProperty('x-template')) ||
                    (options.useVariables && subSchema.hasOwnProperty('x-variable')) ||
                    (options.useDefaults && subSchema.hasOwnProperty('default')) ||
                    getSchemaType(subSchema) === 'object') {

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
        if (!options.ignoreMissingRequired) {
            const requiresLength = requires.length;
            for (let i = 0; i < requiresLength; i++) {
                if (!result.hasOwnProperty(requires[i])) {
                    setDefault = false;
                    break;
                }
            }
        }

        return {
            applied: setDefault,
            value: setDefault ? result : value
        };
    }

};


/**
 * Accepts a function that returns a regular expression. Uses the regular expression to extract parameter names from strings.
 * @param {function} rxGenerator
 * @returns {function}
 */
function buildInjector(rxGenerator) {
    return function(value, data) {
        const rx = rxGenerator();
        let match;
        let result = '';
        let offset = 0;
        while (match = rx.exec(value)) {
            const property = match[1];
            result += value.substring(offset, match.index) + (data.hasOwnProperty(property) ? data[property] : match[0]);
            offset = match.index + match[0].length;
        }
        return result + value.substr(offset);
    };
}

function injectMutate(value, parameters, replacement) {
    const valueType = typeof value;

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            if (typeof item === 'string') {
                const v = replacement(item, parameters);
                if (v !== item) value[index] = v;
            } else {
                injectMutate(item, parameters, replacement);
            }
        });
        return value;

    } else if (value && valueType === 'object') {
        const keys = Object.keys(value);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const item = value[key];
            if (typeof item === 'string') {
                const v = replacement(item, parameters);
                if (v !== item) value[key] = v;
            } else {
                injectMutate(item, parameters, replacement);
            }
        }
        return value;

    } else if (valueType === 'string') {
        return replacement(value, parameters);

    } else {
        return value;
    }
}

function injectCopy(value, parameters, replacement) {
    const valueType = typeof value;

    if (Array.isArray(value)) {
        return value.map(item => injectCopy(item, parameters, replacement));

    } else if (value && valueType === 'object') {
        const result = {};
        const keys = Object.keys(value);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            result[key] = injectCopy(value[key], parameters, replacement);
        }
        return result;

    } else if (valueType === 'string') {
        return replacement(value, parameters);

    } else {
        return value;
    }
}