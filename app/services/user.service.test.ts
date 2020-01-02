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

    // Passwords are not selected by default, so set them as undefined for equals to match
    user1.password = undefined;
    user2.password = undefined;
    // Needed for equals to match
    user1.requestCount = 0;
    user2.requestCount = 0;
    (user1 as any).__ownedParkingSpots__ = [];
    (user2 as any).__ownedParkingSpots__ = [];
  });

  afterAll(async () => {
    await User.delete({});
    await closeConnection();
  });

  test('getUser should get user by email', async () => {
    const user = await getUser({email: user1.email});
    expect(user).toBeDefined();
    expect(user!!.email).toEqual(user1.email);
    expect(user!!.id).toEqual(user1.id);
  });

  test('fetchUsers should get all users', async () => {
    expect(await fetchUsers()).toEqual([user2, user1]);
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
