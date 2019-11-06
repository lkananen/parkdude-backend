import passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
import {User} from '../entities/user';
import {getOrCreateUser} from '../services/user.service';
import {Profile} from 'passport-google-oauth';
export {passport};

// Register Google Passport strategy
passport.use('google-mobile', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.HOST + '/api/auth/google/callback/mobile'
}, loginCallback));

passport.use('google-web', new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.HOST + '/api/auth/google/callback'
}, loginCallback));

async function loginCallback(accessToken: string, refreshToken: string, profile: Profile,
  done: (err: any, user: User) => void) {
  const email: string = profile.emails![0].value;
  const user = await getOrCreateUser({email, name: profile.displayName});
  done(null, user);
}

// Serialize user into the session cookie
passport.serializeUser((user: User, done: (err: any, id: string) => void) => done(null, user.id));

// Deserialize user from the session cookie
passport.deserializeUser(async (id: string, done: (err: any, user?: User) => void) => {
  const user = await User.findOne({id});
  done(null, user);
});
