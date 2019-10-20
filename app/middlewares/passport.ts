import passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
import {User} from '../entities/user';

export {passport};

// Register Google Passport strategy
passport.use('google-mobile', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.HOST + '/auth/goole/callback/mobile'
}, loginCallback));

passport.use('google-web', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.HOST + '/auth/google/callback'
}, loginCallback));

async function loginCallback(accessToken: any, refreshToken: any, profile: any, done: any) {
  const email: string = profile._json.email;
  let user = await User.findOne({email});

  if (user === undefined) {
    user = new User();
    user.name = profile.displayName;
    user.email = email;
    user.usergroup = email.search('@innogiant') === -1 ? 'unactivated' : 'activated';
    await user.save();
  }
  done(null, user);
}


// Serialize user into the session cookie
passport.serializeUser((user: User, done: any) => done(null, user.id));

// Deserialize user from the session cookie
passport.deserializeUser(async (id: number, done: any) =>{
  const user = await User.findOne({id});
  done(null, user);
});
