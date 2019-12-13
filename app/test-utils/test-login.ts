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
  await User.delete({});

  // Add user to database
  const user = User.create({
    name: 'Tester',
    email: TEST_USER_EMAIL,
    role: UserRole.ADMIN
  });
  await user.save();

  await loginWithEmail(agent, user.email);

  return agent;
}

export async function createAppWithNormalSession() {
  const app = await createApp();
  const agent = request.agent(app);

  // Clear existing users
  await User.delete({});

  // Add user to database
  const user = User.create({
    name: 'Tester',
    email: TEST_USER_EMAIL,
    role: UserRole.VERIFIED
  });
  await user.save();

  await loginWithEmail(agent, user.email);

  return agent;
}

/**
 * Creates login session for the user. Session cookies are added to agent.
 */
export async function loginWithEmail(agent: request.SuperTest<request.Test>,
  email: string, name?: string, passAuth?: boolean) {
  mockLogin(email, name, passAuth);
  await agent.get('/api/auth/google/callback');
}

function mockLogin(email: string, username?: string, passAuth?: boolean) {
  passport.use('google-web', new StrategyMock({
    passAuthentication: passAuth === undefined? true : passAuth,
    email,
    username
  }));
}
