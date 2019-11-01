import {User, UserRole} from '../entities/user';
import {passport} from '../middlewares/passport';

import request = require('supertest');
import {createApp} from '../app';
import {StrategyMock} from '../e2e-tests/mocks/strategy-mock';

export const TEST_USER_EMAIL = 'tester@example.com';

export async function createAppWithAdminSession() {
  const app = await createApp();
  const agent = request.agent(app);

  // Clear existing users
  await User.clear();

  // Add user to database
  const user = User.create({
    name: 'Tester',
    email: TEST_USER_EMAIL,
    role: UserRole.ADMIN
  });
  await user.save();

  await loginWithUser(agent, user);

  return agent;
}

/**
 * Creates login session for the user. Session cookies are added to agent.
 */
export async function loginWithUser(agent: request.SuperTest<request.Test>, user: User) {
  mockLogin(user);
  await agent.get('/api/auth/google/callback');
}

function mockLogin(user: User) {
  passport.use('google-web', new StrategyMock({
    passAuthentication: true,
    user
  }));
}
