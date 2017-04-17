'use strict';

const enforcer              = require('./bin/enforcer');
enforcer.injectParameters   = require('./bin/inject-parameters');
enforcer.is                 = require('./bin/is');
enforcer.same               = require('./bin/same');
enforcer.to                 = require('./bin/convert-to');