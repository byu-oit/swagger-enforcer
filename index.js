'use strict';
const Swagger       = require('./bin-2/swagger');

exports.v2 = function(definition, options) {
    return new Swagger(2, definition, options);
};

exports.v3 = function(definition, options) {
    throw Error('Swagger v3 not yet implemented');
};

/*
const enforcer              = require('./bin/enforcer');
enforcer.applyTemplate      = require('./bin/apply-template');
enforcer.injectParameters   = require('./bin/inject-parameters');
enforcer.is                 = require('./bin/is');
enforcer.release            = require('./bin/release');
enforcer.same               = require('./bin/same');
enforcer.to                 = require('./bin/convert-to');

module.exports = enforcer;*/
