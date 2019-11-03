import {User, UserRole} from '../entities/user';

export async function getOrCreateUser(email: string, name: string): Promise<User> {
  let user = await User.findOne({email});
  if (user === undefined) {
    user = User.create({
      name: name,
      email: email,
      role: email.endsWith('@innogiant.com') ? UserRole.VERIFIED : UserRole.UNVERIFIED
    });
    await user.save();
  }
  return user;
}
