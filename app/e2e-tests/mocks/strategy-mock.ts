import passport = require('passport');
import {User} from '../../entities/user';
import {Request} from 'express';

export class StrategyMock extends passport.Strategy {
  private passAuthentication: boolean;
  private user: User;

  constructor(options: {passAuthentication: boolean; user: User}) {
    super();
    this.name = 'google-web';
    this.passAuthentication = options.passAuthentication;
    this.user = options.user;
  }

  authenticate(req: Request) {
    // If we specified authentication to pass
    if (this.passAuthentication) {
      this.success(this.user);
    } else {
      this.fail('Unauthorized');
    }
  }
}
