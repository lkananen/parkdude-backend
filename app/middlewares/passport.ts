export const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
import {User} from '../entities/user';

// if (getConnectionManager().connections.length === 0) {
//  createConnection();
// }
// const repository = getConnection().getRepository(User);

// Register Google Passport strategy
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.OAUTH_CALLBACK_URL
},
async (accessToken: any, refreshToken: any, profile: any, done: any) => {
  const email: string = profile._json.email;
  let user = await User.findOne({email});

  if (user === undefined) {
    user = new User();
    user.name = profile.displayName;
    user.email = email;
    user.usergroup = email.search('@innogiant') === -1 ? 'unauthorized' : 'authorized';
    await user.save();
  }
  done(null, user);
}));

// Serialize user into the sessions
passport.serializeUser((user: User, done: any) => done(null, user.id));

// Deserialize user from the sessions
passport.deserializeUser(async (id: number, done: any) =>{
  const user = await User.findOne({id});
  console.log('Deserializing...', user);
  done(null, user);
});
