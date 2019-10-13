export const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

const transformGoogleProfile = (profile: any) => ({
    name: profile.displayName,
});

// Register Google Passport strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.OAUTH_CALLBACK_URL
},
    async (accessToken: any, refreshToken: any, profile: any, done: any) => done(null, transformGoogleProfile(profile._json))
));

// Serialize user into the sessions
passport.serializeUser((user: any, done: any) => done(null, user));

// Deserialize user from the sessions
passport.deserializeUser((user: any, done: any) => done(null, user));