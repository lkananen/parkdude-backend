import {User, UserRole} from '../entities/user';
import {getUser, fetchUsers, getOrCreateUser} from './user.service';
import {closeConnection} from '../test-utils/teardown';
import {createConnection} from 'typeorm';

describe('User service', () => {
  let user1: User;
  let user2: User;

  beforeAll(async () => {
    await createConnection();
    user1 = await User.create({
      name: 'user1',
      email: 'test@example.com',
      role: UserRole.UNVERIFIED
    }).save();

    user2 = await User.create({
      name: 'user2',
      email: 'test2@example.com',
      role: UserRole.UNVERIFIED
    }).save();
  });

  afterAll(async () => {
    await User.delete({});
    await closeConnection();
  });

  test('getUser should get user by email', async () => {
    expect(await getUser({email: user1.email})).toEqual(user1);
  });

  test('fetchUsers should get all users', async () => {
    expect(await fetchUsers()).toEqual([user1, user2]);
  });

  test('getOrCreateUser creates a new user if no match', async () => {
    const name = 'newuser';
    const email = 'new@gmail.com';
    const newuser = await getOrCreateUser({email, name});
    expect(newuser).toHaveProperty('name', name);
    expect(newuser).toHaveProperty('email', email);
    expect(newuser).toHaveProperty('id');
    expect(await fetchUsers()).toHaveLength(3);
  });
});
