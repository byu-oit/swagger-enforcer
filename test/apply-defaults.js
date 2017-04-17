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
const applyDefaults     = require('../bin/apply-defaults');
const expect            = require('chai').expect;
const schemas           = require('../bin/schemas');

describe('apply defaults', () => {

    describe('defaults', () => {
        const options = schemas.enforcer.normalize({ useDefaults: true });

        it('string', () => {
            const schema = { default: 'abc' };
            const v = applyDefaults(schema, options);
            expect(v).to.equal('abc');
        });

        it('object', () => {
            const schema = {
                type: 'object',
                properties: {
                    foo: {
                        type: 'string',
                        enum: ['bar']
                    }
                },
                default: {
                    foo: 'bar'
                }
            };
            const o = applyDefaults(schema, options);
            expect(o.foo).to.equal('bar');
        });

        it('object via property', () => {
            const schema = {
                type: 'object',
                properties: {
                    foo: {
                        type: 'string',
                        default: 'bar'
                    }
                }
            };
            const o = applyDefaults(schema, options);
            expect(o.foo).to.equal('bar');
        });

        it('array', () => {
            const schema = {
                type: 'array',
                items: {
                    type: 'number'
                },
                default: [1, 2, 3]
            };
            const ar = applyDefaults(schema, options);
            expect(ar).to.deep.equal([1,2,3]);
        });

        it('array with content', () => {
            const schema = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        a: {
                            default: 1
                        }
                    }
                }
            };
            const ar = applyDefaults(schema, options, [{}, { b: 2 }]);
            expect(ar).to.deep.equal([{ a: 1 }, { a: 1, b: 2 }]);
        });

        it('partial object', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        default: 0
                    }
                }
            };
            const o = applyDefaults(schema, options);
            expect(o).to.deep.equal({ age: 0 });
        });

        it('partial object with initial', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        default: 0
                    }
                }
            };
            const o = applyDefaults(schema, options, { name: 'Bob' });
            expect(o).to.deep.equal({ name: 'Bob', age: 0 });
        });

        it('object with required property', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        required: true
                    },
                    age: {
                        type: 'integer',
                        default: 0
                    }
                }
            };
            const o = applyDefaults(schema, options, { name: 'Bob' });
            expect(o).to.deep.equal({ name: 'Bob', age: 0 });
        });

        it('object missing required property', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        required: true
                    },
                    age: {
                        type: 'integer',
                        default: 0
                    }
                }
            };
            const o = applyDefaults(schema, options, {});
            expect(o).to.deep.equal({});
        });

        it('nested object', () => {
            const schema = {
                type: 'object',
                properties: {
                    obj1: {
                        type: 'object',
                        properties: {
                            a: { default: 1 }
                        }
                    }
                }
            };
            const o = applyDefaults(schema, options);
            expect(o).to.deep.equal({ obj1: { a: 1 }});
        });

        describe('mixed nested defaults', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        default: 0
                    },
                    obj1: {
                        type: 'object',
                        properties: {
                            a: {
                                type: 'number',
                                default: 0
                            },
                            b: {
                                type: 'number',
                                required: true
                            }
                        }
                    },
                    obj2: {
                        type: 'object',
                        properties: {
                            a: {
                                type: 'number',
                                default: 0
                            },
                            b: {
                                type: 'number',
                                required: true
                            }
                        },
                        default: {}
                    },
                    list1: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                a: {
                                    type: 'number',
                                    default: 0
                                },
                                b: {
                                    type: 'number',
                                    required: true
                                }
                            }
                        },
                        default: []
                    },
                    list2: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                a: {
                                    type: 'number',
                                    default: 0
                                },
                                b: {
                                    type: 'number',
                                    required: true
                                }
                            }
                        }
                    }
                },
                additionalProperties: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            default: 'untitled'
                        }
                    }
                }
            };

            it('can add partial object', () => {
                const input = { name: 'Bob' };
                const o = applyDefaults(schema, options, input);
                expect(o.name).to.equal('Bob');
                expect(o.age).to.equal(0);
                expect(o.list1).to.deep.equal([]);
                expect(o).to.not.haveOwnProperty('list2');
            });

        });

    });

});