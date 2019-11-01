import passport = require('passport');
import {User, UserRole} from '../../entities/user';
export {passport};

const StrategyMock = require('./strategy-mock');

passport.use('google-web', new (StrategyMock as any)({
  passAuthentication: true,
  email: `doesn't@exist.com`
},
verifyFunction));

async function verifyFunction(email: string, done: any) {
  let user = await User.findOne({email});
  if (user === undefined) {
    user = new User();
    user.name = 'Tester';
    user.email = email;
    user.role = UserRole.VERIFIED;
    await user.save();
  }
  await done(null, user);
}

// Serialize user into the session cookie
passport.serializeUser((user: User, done: any) => {
  console.log(user);
  console.log(user.id);
  done(null, user.id);
});

// Deserialize user from the session cookie
passport.deserializeUser(async (id: string, done: any) => {
  const user = await User.findOne({id});
  console.log(user);
  done(null, user);
});
