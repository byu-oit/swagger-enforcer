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
const canProxy      = require('../bin/can-proxy');
const expect        = require('chai').expect;
const enforcer      = require('../bin/enforcer');
const schemas       = require('../bin/schemas');

describe('enforcer', () => {
    const options = schemas.enforcer.normalize();

    describe('enforce', () => {

        describe('no proxying', () => {

            before(() => canProxy.proxiable = false);
            afterEach(() => canProxy.reset());

            it('does not support active enforcement', () => {
                expect(code(() => enforcer({}, {}, options).enforce({}))).to.equal('ESEPROX');
            });

            it('force positive', () => {
                const p = global.Proxy;
                global.Proxy = function() { };
                canProxy.reset();
                expect(canProxy.proxiable).to.be.true;
                global.Proxy = p;
            });

            it('force negative', () => {
                const p = global.Proxy;
                global.Proxy = function() { throw Error('Not supported') };
                canProxy.reset();
                expect(canProxy.proxiable).to.be.false;
                global.Proxy = p;
            });

        });

        if (canProxy.proxiable) {

            describe('defaults', () => {

                it('primitive without default', () => {
                    expect(enforcer({}, {}, options).enforce()).to.be.undefined;
                });

                it('has default', () => {
                    const options = schemas.enforcer.normalize({ useDefaults: true });
                    const schema = { default: 'abc' };
                    expect(enforcer(schema, {}, options).enforce()).to.equal('abc');
                });

            });

            describe('array', () => {
                const schema = {
                    type: 'array',
                    items: {
                        type: 'number'
                    }
                };

                it('no initial value', () => {
                    const schema = { type: 'array' };
                    expect(() => enforcer(schema, {}, options).enforce()).not.to.throw(Error);
                });

                describe('schemaless items', () => {
                    const schema = { type: 'array' };

                    it('mixed', () => {
                        expect(() => enforcer(schema, {}, options).enforce(['a', true, 1, null])).not.to.throw(Error);
                    });

                });

                describe('initialize to value', () => {

                    it('valid', () => {
                        expect(() => enforcer(schema, {}, options).enforce([1, 2, 3])).not.to.throw(Error);
                    });

                    it('not an array', () => {
                        expect(code(() => enforcer(schema, {}, options).enforce({}))).to.equal('ESETYPE');
                    });

                    it('invalid items', () => {
                        const c = code(() => enforcer(schema, {}, options).enforce(['1']));
                        expect(c).to.equal('ESETYPE');
                    });

                });

                it('set property', () => {
                    const ar = enforcer(schema, {}, options).enforce([]);
                    ar.foo = 'bar';
                    expect(ar.foo).to.equal('bar');
                });

                describe('set by index', () => {

                    it('valid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar[0] = 1;
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar[0] = '1')).to.equal('ESETYPE');
                    });

                    it('valid past current length', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar[1] = 1;
                        expect(ar[1]).to.equal(1);
                    });

                    it('invalid past max length', () => {
                        const schema = { type: 'array', maxItems: 1 };
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar[1] = 1)).to.equal('ESELEN');
                    });

                    it('schemaless items', () => {
                        const schema = { type: 'array' };
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar[0] = 1;
                        expect(ar[0]).to.equal(1);
                    });

                });

                describe('concat', () => {

                    it('valid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        const ar2 = ar.concat(1);
                        expect(ar2[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar.concat('1'))).to.equal('ESETYPE');
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        const ar2 = ar.concat(1);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('copyWithin', () => {

                    it('makes copy within', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        ar.copyWithin(2, 0);
                        expect(ar).to.deep.equal([1, 2, 1, 2]);
                    });

                    it('returns original proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.copyWithin(2, 0);
                        expect(ar).to.equal(ar2);
                    });

                });

                describe('fill', () => {

                    it('fills with value', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        ar.fill(10, 1, 3);
                        expect(ar).to.deep.equal([1, 10, 10, 4]);
                    });

                    it('returns original proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.fill(10, 1, 3);
                        expect(ar).to.equal(ar2);
                    });

                    it('fills without item schema', () => {
                        const schema = { type: 'array' };
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        ar.fill('a', 1, 3);
                        expect(ar).to.deep.equal([1, 'a', 'a', 4]);
                    });

                });

                describe('filter', () => {

                    it('returns filtered', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.filter(v => v % 2 === 0);
                        expect(ar2).to.deep.equal([2, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.filter(v => v % 2 === 0);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('map', () => {

                    it('returns mapped', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.map(v => v * 2);
                        expect(ar2).to.deep.equal([2, 4, 6, 8]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.map(v => v * 2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('pop', () => {
                    const schema = { type: 'array', minItems: 1 };
                    const options = schemas.enforcer.normalize({ enforce: { minItems: true } });

                    it('can pop above min items', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        const x = ar.pop();
                        expect(ar).to.deep.equal([1]);
                        expect(x).to.equal(2);
                    });

                    it('cannot pop at min items', () => {
                        const ar = enforcer(schema, {}, options).enforce([1]);
                        expect(code(() => ar.pop())).to.equal('ESELEN');
                    });

                });

                describe('push', () => {

                    it('valid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.push(1);
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar.push('1'))).to.equal('ESETYPE');
                    });

                    it('returns new length', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(ar.push(1)).to.equal(1);
                    });

                    it('cannot push at max items', () => {
                        const schema = { type: 'array', maxItems: 0 };
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar.push(1))).to.equal('ESELEN');
                    });

                });

                describe('shift', () => {
                    const schema = { type: 'array', minItems: 1 };
                    const options = schemas.enforcer.normalize({ enforce: { minItems: true } });

                    it('can shift above min items', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        const x = ar.shift();
                        expect(ar).to.deep.equal([2]);
                        expect(x).to.equal(1);
                    });

                    it('cannot shift at min items', () => {
                        const ar = enforcer(schema, {}, options).enforce([1]);
                        expect(code(() => ar.shift())).to.equal('ESELEN');
                    });

                });

                describe('slice', () => {

                    it('returns slice', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.slice(2);
                        expect(ar2).to.deep.equal([3, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.slice(2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('splice', () => {

                    it('returns removed values', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.splice(2, 2);
                        expect(ar2).to.deep.equal([3, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2, 3, 4]);
                        const ar2 = ar.splice(2, 2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                    it('valid new values', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        ar.splice(1, 0, 3, 4);
                        expect(ar).to.deep.equal([1, 3, 4, 2]);
                    });

                    it('invalid new values', () => {
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        expect(code(() => ar.splice(1, 0, '3'))).to.equal('ESETYPE');
                    });

                    it('cannot remove below min items', () => {
                        const schema = { type: 'array', minItems: 1 };
                        const options = schemas.enforcer.normalize({ enforce: { minItems: true } });
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        expect(code(() => ar.splice(1, 2))).to.equal('ESELEN');
                    });

                    it('cannot add above max items', () => {
                        const schema = { type: 'array', maxItems: 3 };
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        expect(code(() => ar.splice(1, 0, 3, 4))).to.equal('ESELEN');
                    });

                    it('can add and remove within min and max items', () => {
                        const schema = { type: 'array', minItems: 2, maxItems: 2 };
                        const options = schemas.enforcer.normalize({ enforce: { minItems: true } });
                        const ar = enforcer(schema, {}, options).enforce([1, 2]);
                        const x = ar.splice(0, 2, 3, 4);
                        expect(ar).to.deep.equal([3, 4]);
                        expect(x).to.deep.equal([1, 2]);
                    });

                });

                describe('unshift', () => {

                    it('valid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.unshift(1);
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar.unshift('1'))).to.equal('ESETYPE');
                    });

                    it('returns new length', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(ar.unshift(1)).to.equal(1);
                    });

                    it('cannot unshift at max items', () => {
                        const schema = { type: 'array', maxItems: 0 };
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(code(() => ar.unshift(1))).to.equal('ESELEN');
                    });

                });

                describe('unique items', () => {
                    const options = schemas.enforcer.normalize({ enforce: { uniqueItems: true } });
                    const schema = {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'number'
                        }
                    };

                    it('init unique', () => {
                        expect(code(() => enforcer(schema, {}, options).enforce([1, 2, 1]))).to.equal('ESEUNIQ');
                    });

                    it('can add unique', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('cannot add duplicate', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.push(1);
                        expect(() => ar.push(1)).to.throw(Error);
                    });

                    it('can add again a popped item', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.push(1);
                        ar.pop();
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('can add again a shifted item', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.push(1);
                        ar.shift();
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('can add again a removed spliced item', () => {
                        const ar = enforcer(schema, {}, options).enforce([]);
                        ar.push(1);
                        ar.splice(0, 1);
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                });

                describe('nested array', () => {
                    const schema = {
                        type: 'array',
                        items: {
                            type: 'array',
                            items: {
                                type: 'number'
                            }
                        }
                    };

                    it('enforces init value', () => {
                        expect(code(() => enforcer(schema, {}, options).enforce([['a']]))).to.equal('ESETYPE');
                    });

                    it('enforces push value', () => {
                        const ar = enforcer(schema, {}, options).enforce([[]]);
                        ar.push([1]);
                        expect(code(() => ar.push(['a']))).to.equal('ESETYPE');
                    });

                    it('proxies inner init', () => {
                        const ar = enforcer(schema, {}, options).enforce([[]]);
                        const ar2 = ar[0];
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                    it('proxies inner value', () => {
                        const ar = enforcer(schema, {}, options).enforce([[]]);
                        ar.push([1]);
                        const ar2 = ar[1];
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });
                });

            });

            describe('object', () => {

                it('no initial value', () => {
                    const schema = { type: 'object' };
                    expect(() => enforcer(schema, {}, options).enforce(schema)).not.to.throw(Error);
                });

                it('not a valid object', () => {
                    const schema = { type: 'object' };
                    expect(code(() => enforcer(schema, {}, options).enforce([]))).to.equal('ESETYPE');
                });

                describe('proxy', () => {

                    it('top level is proxied', () => {
                        const schema = { type: 'object' };
                        const o = enforcer(schema, {}, options).enforce();
                        expect(o.__swaggerResponseType__).to.equal('object');
                    });

                    it('nested is proxied', () => {
                        const schema = {
                            type: 'object',
                            properties: { foo: { type: 'object' } }
                        };
                        const o = enforcer(schema, {}, options).enforce();
                        o.foo = {};
                        expect(o.foo.__swaggerResponseType__).to.equal('object');
                    });

                });

                describe('min and max properties', () => {
                    const options = schemas.enforcer.normalize({ enforce: { maxProperties: true, minProperties: true } });

                    it('can delete above minProperties', () => {
                        const schema = { type: 'object', minProperties: 1 };
                        const o = enforcer(schema, {}, options).enforce({ foo: 1, bar: 2 });
                        expect(() => delete o.bar).not.to.throw(Error);
                    });

                    it('cannot delete below minProperties', () => {
                        const schema = { type: 'object', minProperties: 1 };
                        const o = enforcer(schema, {}, options).enforce({ foo: 1 });
                        expect(code(() => delete o.foo)).to.equal('ESELEN');
                    });

                    it('cannot add above maxProperties', () => {
                        const schema = { type: 'object', maxProperties: 1 };
                        const o = enforcer(schema, {}, options).enforce({ foo: 1 });
                        expect(code(() => o.bar = 5)).to.equal('ESELEN');
                    });

                    it('can set at maxProperties', () => {
                        const schema = { type: 'object', maxProperties: 1 };
                        const o = enforcer(schema, {}, options).enforce({ foo: 1 });
                        expect(() => o.foo = 2).not.to.throw(Error);
                        expect(o.foo).to.equal(2);
                    });

                });

                describe('specific vs additional properties', () => {
                    const schema = {
                        type: 'object',
                        properties: { foo: { type: 'string' } },
                        additionalProperties: { type: 'number' }
                    };

                    it('valid specific property', () => {
                        const o = enforcer(schema, {}, options).enforce();
                        expect(() => o.foo = 'abc').not.to.throw(Error);
                    });

                    it('invalid specific property', () => {
                        const o = enforcer(schema, {}, options).enforce();
                        expect(code(() => o.foo = 123)).to.equal('ESETYPE');
                    });

                    it('valid additional property', () => {
                        const o = enforcer(schema, {}, options).enforce();
                        expect(() => o.bar = 123).not.to.throw(Error);
                    });

                    it('invalid additional property', () => {
                        const o = enforcer(schema, {}, options).enforce();
                        expect(code(() => o.baz = 'abc')).to.equal('ESETYPE');
                    });

                });

                describe('required properties', () => {
                    const options = schemas.enforcer.normalize({ enforce: { required: true }});

                    it('top level omitted', () => {
                        const schema = {
                            type: 'object',
                            properties: {
                                foo: { type: 'string' }
                            },
                            required: ['foo']
                        };
                        expect(code(() => enforcer(schema, {}, options).enforce({}))).to.equal('ESEREQ');
                    });

                    it('nested top level omitted', () => {
                        const schema = {
                            type: 'object',
                            properties: {
                                foo: {
                                    type: 'object',
                                    properties: {
                                        bar: { type: 'string' }
                                    },
                                    required: ['bar']
                                }
                            }
                        };

                        const o = enforcer(schema, {}, options).enforce();
                        expect(code(() => o.foo = {})).to.equal('ESEREQ');
                    });

                    it('additionalProperties', () => {
                        const schema = {
                            type: 'object',
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' }
                                },
                                required: ['id']
                            }
                        };

                        const o = enforcer(schema, {}, options).enforce();
                        o.abc = { id: 'abc' };
                        expect(code(() => o.def = {})).to.equal('ESEREQ');
                    });

                    it('cannot delete required property', () => {
                        const schema = {
                            type: 'object',
                            properties: {
                                foo: { type: 'number' }
                            },
                            required: ['foo']
                        };
                        const o = enforcer(schema, {}, options).enforce({ foo: 1 });
                        expect(code(() => delete o.foo)).to.equal('ESEREQ');
                    });

                    it('set all of', () => {
                        const schema = { allOf: [
                            { properties: { foo: { type: 'string' } }, required: ['foo'] },
                            { properties: { foo: { type: 'string', maxLength: 20 } } }
                        ]};
                        const o = enforcer(schema, {}, options).enforce({ foo: 'a' });
                        o.foo = 'b';
                    });

                    it('delete all of', () => {
                        const schema = { allOf: [
                            { properties: { foo: { type: 'string' } }, required: ['foo'] },
                            { properties: { foo: { type: 'string', maxLength: 20 } } }
                        ]};
                        const o = enforcer(schema, {}, options).enforce({ foo: 'a' });
                        expect(code(() => delete o.foo)).to.equal('ESEREQ');
                    });

                });

                describe('schemaless', () => {
                    const schema = { type: 'object' };

                    it('array', () => {
                        expect(() => enforcer(schema, {}, options).enforce({ a: [] })).not.to.throw(Error);
                    });

                    it('string', () => {
                        expect(() => enforcer(schema, {}, options).enforce({ a: 'hello' })).not.to.throw(Error);
                    });

                    it('boolean', () => {
                        expect(() => enforcer(schema, {}, options).enforce({ a: true })).not.to.throw(Error);
                    });

                    it('non serializable value', () => {
                        expect(code(() => enforcer(schema, {}, options).enforce({ a: function() {} }))).to.equal('ESETYPE');
                    });

                });

                describe('property has defined type', () => {

                    it('string valid', () => {
                        const schema = { type: 'object', properties: { foo: { type: 'string' } } };
                        expect(() => enforcer(schema, {}, options).enforce({ foo: 'hello' })).not.to.throw(Error);
                    });

                    it('string invalid', () => {
                        const schema = { type: 'object', properties: { foo: { type: 'string' } } };
                        expect(code(() => enforcer(schema, {}, options).enforce({ foo: 1 }))).to.equal('ESETYPE');
                    });

                    it('unknown property', () => {
                        const schema = { type: 'object', properties: {} };
                        expect(code(() => enforcer(schema, {}, options).enforce({ foo: 'hello' }))).to.equal('ESENPER');
                    });

                    it('additional property valid', () => {
                        const schema = { type: 'object', additionalProperties: { type: 'string' } };
                        expect(() => enforcer(schema, {}, options).enforce({ foo: 'hello' })).not.to.throw(Error);
                    });

                    it('additional property invalid', () => {
                        const schema = { type: 'object', additionalProperties: { type: 'string' } };
                        expect(code(() => enforcer(schema, {}, options).enforce({ foo: 1 }))).to.equal('ESETYPE');
                    });

                });

            });

            describe('number', () => {

                it('valid below maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(() => enforcer(schema, {}, options).enforce(5)).not.to.throw(Error);
                });

                it('valid at maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(() => enforcer(schema, {}, options).enforce(10)).not.to.throw(Error);
                });

                it('invalid above maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(code(() => enforcer(schema, {}, options).enforce(15))).to.equal('ESENMAX');
                });

                it('invalid above exclusive maximum', () => {
                    const schema = { type: 'number', maximum: 10, exclusiveMaximum: true };
                    expect(code(() => enforcer(schema, {}, options).enforce(15))).to.equal('ESENMAX');
                });

                it('invalid at exclusive maximum', () => {
                    const schema = { type: 'number', maximum: 10, exclusiveMaximum: true };
                    expect(code(() => enforcer(schema, {}, options).enforce(10))).to.equal('ESENMAX');
                });

                it('valid above minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(() => enforcer(schema, {}, options).enforce(15)).not.to.throw(Error);
                });

                it('valid at minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(() => enforcer(schema, {}, options).enforce(10)).not.to.throw(Error);
                });

                it('invalid below minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(code(() => enforcer(schema, {}, options).enforce(5))).to.equal('ESENMIN');
                });

                it('invalid below exclusive minimum', () => {
                    const schema = { type: 'number', minimum: 10, exclusiveMinimum: true };
                    expect(code(() => enforcer(schema, {}, options).enforce(5))).to.equal('ESENMIN');
                });

                it('invalid at exclusive minimum', () => {
                    const schema = { type: 'number', minimum: 10, exclusiveMinimum: true };
                    expect(code(() => enforcer(schema, {}, options).enforce(10))).to.equal('ESENMIN');
                });

                it('valid multiple of', () => {
                    const schema = { type: 'number', multipleOf: 10 };
                    expect(() => enforcer(schema, {}, options).enforce(20)).not.to.throw(Error);
                });

                it('invalid multiple of', () => {
                    const schema = { type: 'number', multipleOf: 10 };
                    expect(code(() => enforcer(schema, {}, options).enforce(5))).to.equal('ESENMULT');
                });

                it('valid integer', () => {
                    const schema = { type: 'integer' };
                    expect(() => enforcer(schema, {}, options).enforce(5)).not.to.throw(Error);
                });

                it('invalid integer', () => {
                    const schema = { type: 'integer' };
                    expect(code(() => enforcer(schema, {}, options).enforce(5.5))).to.equal('ESETYPE');
                });

            });

            describe('binary', () => {
                const schema = { type: 'string', format: 'binary' };

                it('is binary', () => {
                    expect(() => enforcer(schema, {}, options).enforce('00001111')).not.to.throw(Error);
                });

                it('not 8-bits', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('01'))).to.equal('ESEFRMT');
                });

                it('not 0 or 1', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('abc'))).to.equal('ESEFRMT');
                });

            });

            describe('boolean', () => {
                const schema = { type: 'boolean' };

                it('is boolean', () => {
                    expect(() => enforcer(schema, {}, options).enforce(true)).not.to.throw(Error);
                });

                it('not boolean', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('true'))).to.equal('ESETYPE');
                });

            });

            describe('byte', () => {
                const schema = { type: 'string', format: 'byte' };

                it('is byte', () => {
                    expect(() => enforcer(schema, {}, options).enforce('ab==')).not.to.throw(Error);
                });

                it('not length of 4', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('ab'))).to.equal('ESEFRMT');
                });

                it('invalid characters', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('~'))).to.equal('ESEFRMT');
                });

            });

            describe('date', () => {
                const schema = { type: 'string', format: 'date' };

                it('is valid date', () => {
                    expect(() => enforcer(schema, {}, options).enforce('2000-01-01')).not.to.throw(Error);
                });

                it('invalid date', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('2000-01-40'))).to.equal('ESEDATE');
                });

                it('invalid characters', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('abc'))).to.equal('ESEFRMT');
                });

            });

            describe('date-time', () => {
                const schema = { type: 'string', format: 'date-time' };

                it('is valid date-time', () => {
                    expect(() => enforcer(schema, {}, options).enforce('2000-01-01T00:00:00.000Z')).not.to.throw(Error);
                });

                it('invalid date-time hour', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('2000-01-01T30:00:00.000Z'))).to.equal('ESEDATE');
                });

                it('invalid date-time minute', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('2000-01-01T00:90:00.000Z'))).to.equal('ESEDATE');
                });

                it('invalid date-time second', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('2000-01-01T00:00:90.000Z'))).to.equal('ESEDATE');
                });

                it('invalid characters', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('abc'))).to.equal('ESEFRMT');
                });

            });

            describe('string', () => {

                it('valid max length', () => {
                    const schema = { type: 'string', maxLength: 3 };
                    expect(() => enforcer(schema, {}, options).enforce('abc')).not.to.throw(Error);
                });

                it('invalid max length', () => {
                    const schema = { type: 'string', maxLength: 3 };
                    expect(code(() => enforcer(schema, {}, options).enforce('abcd'))).to.equal('ESESMAX');
                });

                it('valid min length', () => {
                    const schema = { type: 'string', minLength: 3 };
                    expect(() => enforcer(schema, {}, options).enforce('abc')).not.to.throw(Error);
                });

                it('invalid min length', () => {
                    const schema = { type: 'string', minLength: 3 };
                    expect(code(() => enforcer(schema, {}, options).enforce('a'))).to.equal('ESESMIN');
                });

                it('valid pattern', () => {
                    const schema = { type: 'string', pattern: '^[abc]$' };
                    expect(() => enforcer(schema, {}, options).enforce('a')).not.to.throw(Error);
                });

                it('invalid pattern', () => {
                    const schema = { type: 'string', pattern: '^[abc]$' };
                    expect(code(() => enforcer(schema, {}, options).enforce('d'))).to.equal('ESESPAT');
                });

            });

            describe('enum', () => {
                const schema = { enum: ['a']};

                it('found', () => {
                    expect(() => enforcer(schema, {}, options).enforce('a')).not.to.throw(Error);
                });

                it('not found', () => {
                    expect(code(() => enforcer(schema, {}, options).enforce('b'))).to.equal('ESEENUM');
                });

            });

        }

        if (canProxy.proxiable) {

            describe('auto format', () => {
                const options = schemas.enforcer.normalize({autoFormat: true});

                it('object', () => {
                    const v = enforcer({type: 'object'}, {}, options).enforce({});
                    expect(v).to.deep.equal({});
                });

                it('boolean', () => {
                    const v = enforcer({type: 'boolean'}, {}, options).enforce('');
                    expect(v).to.equal(false);
                });

                it('integer', () => {
                    const v = enforcer({type: 'integer'}, {}, options).enforce('1.2');
                    expect(v).to.equal(1);
                });

                it('number', () => {
                    const v = enforcer({type: 'number'}, {}, options).enforce('1.2');
                    expect(v).to.equal(1.2);
                });

                it('binary', () => {
                    const v = enforcer({type: 'string', format: 'binary'}, {}, options).enforce(1);
                    expect(v).to.equal('00000001');
                });

                it('byte', () => {
                    const v = enforcer({type: 'string', format: 'byte'}, {}, options).enforce(true);
                    expect(v).to.equal('AQ==');
                });

                it('date', () => {
                    const str = '2000-01-01T00:00:00.000Z';
                    const date = new Date(str);
                    const v = enforcer({type: 'string', format: 'date'}, {}, options).enforce(date);
                    expect(v).to.equal(str.substr(0, 10));
                });

                it('dateTime', () => {
                    const str = '2000-01-01T00:00:00.000Z';
                    const date = new Date(str);
                    const v = enforcer({type: 'string', format: 'date-time'}, {}, options).enforce(date);
                    expect(v).to.equal(str);
                });

            });

        }

        describe('construct', () => {

            it('schema must be an object', () => {
                expect(() => enforcer('hello')).to.throw(Error);
            });

            it('definition must be an object', () => {
                expect(() => enforcer({}, 'hello')).to.throw(Error);
            });

            it('options must be an object', () => {
                expect(() => enforcer({}, {}, 'hello')).to.throw(Error);
            });

            it('schema missing throws an error', () => {
                expect(() => enforcer()).to.throw(Error);
            });

            it('definitions not provided does not throw error', () => {
                expect(() => enforcer({})).not.to.throw(Error);
            });

            it('options not provided does not throw error', () => {
                expect(() => enforcer({}, {})).not.to.throw(Error);
            });

        });

    });

    describe('validate', () => {

        it('validate all', () => {
            const options = { enforce: true };
            const schema = { type: 'number', maximum: 10 };
            expect(code(() => enforcer(schema, {}, options).validate(15))).to.equal('ESENMAX');
        });

        it('validate all multiple errors', () => {
            const options = { enforce: true };
            const schema = { type: 'number', maximum: 10, multipleOf: 2 };
            expect(code(() => enforcer(schema, {}, options).validate(15))).to.equal('ESEMLTI');
        });

        it('don\'t validate all', () => {
            const options = { enforce: false };
            const schema = { type: 'number', maximum: 10 };
            expect(() => enforcer(schema, {}, options).validate(15)).not.to.throw(Error);
        });

    });

    describe('errors', () => {

        it('validate all', () => {
            const options = { enforce: true };
            const schema = { type: 'number', maximum: 10 };
            const errors = enforcer(schema, {}, options).errors(15);
            expect(errors.length).to.equal(1);
            expect(errors[0].code).to.equal('ESENMAX');
        });

        it('validate all multiple errors', () => {
            const options = { enforce: true };
            const schema = { type: 'number', maximum: 10, multipleOf: 2 };
            const errors = enforcer(schema, {}, options).errors(15);
            expect(errors.length).to.equal(2);
        });

        it('don\'t validate all', () => {
            const options = { enforce: false };
            const schema = { type: 'number', maximum: 10 };
            const errors = enforcer(schema, {}, options).errors(15);
            expect(errors.length).to.equal(0);
        });

    });

    describe('object composition', () => {
        const definitions = {};
        definitions.Animal = {
            type: 'object',
            discriminator: 'classification',
            properties: {
                classification: { type: 'string' },
                warmBlooded: { type: 'boolean' }
            },
            required: ['classification', 'warmBlooded' ]
        };
        definitions.Feral = {
            allOf: [
                definitions.Animal,
                {
                    type: 'object',
                    properties: {
                        claws: { type: 'boolean' }
                    }
                }
            ]
        };
        definitions.Pet = {
            allOf: [
                definitions.Animal,
                {
                    type: 'object',
                    discriminator: 'petType',
                    properties: {
                        name: { type: 'string' },
                        petType: { type: 'string' }
                    },
                    required: ['name', 'petType' ]
                }
            ]
        };
        definitions.Cat = {
            allOf: [
                definitions.Pet,
                {
                    type: 'object',
                    properties: {
                        huntingSkill: { type: 'string', default: 'lazy', enum: ['lazy', 'fun', 'mean'] }
                    },
                    required: ['huntingSkill']
                }
            ]
        };
        definitions.Dog = {
            allOf: [
                definitions.Pet,
                {
                    type: 'object',
                    properties: {
                        packSize: { type: 'integer', default: 0, minimum: 0 }
                    },
                    required: ['packSize']
                }
            ]
        };

        // TODO: working here - all of and discriptor tests needed

        describe('animal', () => {

            it('valid animal', () => {
                const value = {
                    classification: 'Feral',
                    warmBlooded: true,
                    claws: true
                };
                const errors = enforcer(definitions.Animal, definitions, options).errors(value);
                expect(errors.length).to.equal(0);
            });

            it('invalid discriminator', () => {
                const value = {
                    classification: 'foo',
                    warmBlooded: true
                };
                const errors = enforcer(definitions.Animal, definitions, options).errors(value);
                expect(errors.length).to.equal(1);
            });

            it('missing required property', () => {
                const value = {
                    warmBlooded: true
                };
                const errors = enforcer(definitions.Animal, definitions, options).errors(value);
                expect(errors.length).to.equal(1);
                expect(errors[0].code).to.equal('ESEHTNC');
            });

            it('valid two layer discriminator', () => {
                const value = {
                    classification: 'Pet',
                    petType: 'Cat',
                    warmBlooded: true,
                    name: 'Mittens',
                    huntingSkill: 'mean'
                };
                const errors = enforcer(definitions.Animal, definitions, options).errors(value);
                expect(errors.length).to.equal(0);
            });

        });

    });

});

function code(callback) {
    try {
        callback();
    } catch (e) {
        return e.code;
    }
    throw Error('Expected an error to be thrown but was not.');
}