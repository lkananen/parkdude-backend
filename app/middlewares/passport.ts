import passport = require('passport');
import {OAuth2Strategy as GoogleStrategy} from 'passport-google-oauth';
import {Strategy as LocalStrategy} from 'passport-local';
import {User} from '../entities/user';
import {getOrCreateUser} from '../services/user.service';
import {Profile} from 'passport-google-oauth';
import {createQueryBuilder} from 'typeorm';
import {UnauthorizedError} from '../utils/errors';
import bcrypt from 'bcryptjs';
import {Request, Response, NextFunction} from 'express';
import {PasswordLoginResponse} from '../interfaces/user.interfaces';
export {passport};

// Register Google Passport strategy
passport.use('google-mobile', new GoogleStrategy({
  clientID: process.env.CLIENT_ID!!,
  clientSecret: process.env.CLIENT_SECRET!!,
  callbackURL: process.env.HOST + '/api/auth/google/callback/mobile'
}, googleLoginCallback));

passport.use('google-web', new GoogleStrategy({
  clientID: process.env.CLIENT_ID!!,
  clientSecret: process.env.CLIENT_SECRET!!,
  callbackURL: process.env.HOST + '/api/auth/google/callback'
}, googleLoginCallback));

passport.use('password-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, passwordLoginCallback));

async function googleLoginCallback(accessToken: string, refreshToken: string, profile: Profile,
  done: (err: any, user: User|null) => void) {
  const email: string = profile.emails![0].value;
  try {
    const user = await getOrCreateUser({email, name: profile.displayName});
    done(null, user);
  } catch (error) {
    // TODO: Verify that this works as expected
    done(error, null);
  }
}

async function passwordLoginCallback(email: string, password: string, done: (err: any, user: User|null) => void) {
  const user = await createQueryBuilder(User, 'user')
    .select('user.id')
    .addSelect('user.password')
    .where('user.email = :email', {email})
    .getOne();
  if (!user || !user.password) {
    done(new UnauthorizedError('Wrong username or password.'), null);
    return;
  }
  const passwordsMatch = await bcrypt.compare(password, user.password);
  if (!passwordsMatch) {
    done(new UnauthorizedError('Wrong username or password.'), null);
    return;
  }
  done(null, user);
}

export function passwordLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.body.email) {
    res.status(400).json({
      message: 'Email is required'
    });
    return;
  }
  if (!req.body.password) {
    res.status(400).json({
      message: 'Password is required'
    });
    return;
  }
  passport.authenticate('password-login', function(err, user, info) {
    if (err) {
      next(err);
      return;
    }
    req.logIn(user, function(error) {
      if (error) {
        next(error);
        return;
      }
      const json: PasswordLoginResponse = {
        message: 'Login successful'
      };
      res.status(200).json(json);
    });
  })(req, res, next);
}

// Serialize user into the session cookie
passport.serializeUser((user: User, done: (err: any, id: string) => void) => done(null, user.id));

// Deserialize user from the session cookie
passport.deserializeUser(async (id: string, done: (err: any, user?: User) => void) => {
  const user = await User.findOne({id});
  done(null, user);
});
