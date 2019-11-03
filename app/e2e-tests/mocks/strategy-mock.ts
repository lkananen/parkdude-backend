import passport = require('passport');
import {Request} from 'express';
import {getOrCreateUser} from '../../services/user.service';

export class StrategyMock extends passport.Strategy {
  private passAuthentication: boolean;
  private email: string;
  private username: string;

  constructor(options: {passAuthentication: boolean; email: string; username?: string}) {
    super();
    this.name = 'google-web';
    this.passAuthentication = options.passAuthentication;
    this.email = options.email;
    this.username = options.username? options.username : 'Test Tester';
  }

  async authenticate(req: Request) {
    // If we specified authentication to pass
    if (this.passAuthentication) {
      const user = await getOrCreateUser({email: this.email, name: this.username});
      this.success(user);
    } else {
      this.fail('Unauthorized');
    }
  }
}
