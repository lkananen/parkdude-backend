const passport = require('passport');
import {User, UserRole} from '../../entities/user';
const util = require('util');

export function StrategyMock(this: any, options: any, verifyFunction: object) {
  this.name = 'google-web';
  this.passAuthentication = options.passAuthentication;
  this.email = options.email;
  this.verifyFunction = verifyFunction;
}

util.inherits(StrategyMock, passport.Strategy);

StrategyMock.prototype.authenticate = function authenticate(req: any) {
  // If we specified authentication to pass
  if (this.passAuthentication) {
    // Jump back to the given mock verify function in passport-mock
    this.verifyFunction(this.email, (err: any, user: User) => {
      if (err) {
        this.fail(err);
      } else {
        this.success(user);
      }
    });
  } else {
    this.fail('Unauthorized');
  }
};

module.exports = StrategyMock;
