/**
 *  @license
 *    Copyright 2016 Brigham Young University
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

module.exports = PreppedSchema;

function PreppedSchema(schema, options) {
    if (!schema || typeof schema !== 'object') throw Error("Invalid schema provided. Must be a non-null object.");
    if (!options || typeof options !== 'object') throw Error("Invalid options provided. Must be a non-null object.");
    if (schema && schema.constructor === PreppedSchema) return schema;
    const enforce = options.enforce;
    const prepped = this;

    // copy schema properties
    Object.assign(this, schema);

    // update type
    this.type = getSchemaType(schema);

    // delete unenforced properties from the schema
    [
        'enum',
        'multipleOf', 'maximum', 'minimum',
        'maxLength', 'minLength', 'pattern',
        'maxItems', 'minItems', 'uniqueItems',
        'additionalProperties', 'maxProperties', 'minProperties', 'required'
    ].forEach(key => {
        if (!enforce[key] || !prepped.hasOwnProperty(key)) delete prepped[key]
    });

    if (this.type === 'array') {

        // if array items have a schema then prep that too
        if (this.items) this.items = new PreppedSchema(this.items, options);
    }

    if (this.type === 'object') {

        if (Array.isArray(this.allOf)) {
            this.allOf.forEach(schema => prepObjectSchema(schema, options));
        } else {
            prepObjectSchema(this, options);
        }
    }
}

function getSchemaType(schema) {
    if (schema.type) return schema.type;
    if (schema.items) return 'array';
    if (schema.properties || schema.additionalProperties || schema.allOf) return 'object';
    return undefined;
}

function prepObjectSchema(schema, options) {
    // get property keys if any
    schema.propertyKeys = schema.properties ? Object.keys(schema.properties) : [];

    // convert any defined properties to prepped schemas
    schema.propertyKeys.forEach(key => {
        schema.properties[key] = new PreppedSchema(schema.properties[key], options);
    });

    // look for additionalProperties
    if (schema.additionalProperties) schema.additionalProperties = new PreppedSchema(schema.additionalProperties, options);
}