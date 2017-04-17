'use strict';

const enforcer              = require('./bin/enforcer');
enforcer.injectParameters   = require('./bin/inject-parameters');
enforcer.is                 = require('./bin/is');
enforcer.release            = require('./bin/release');
enforcer.same               = require('./bin/same');
enforcer.to                 = require('./bin/convert-to');