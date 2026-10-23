import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser, getUserById, UserSessionData } from '../services/auth.service';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

export const isGoogleAuthAvailable = Boolean(googleClientId && googleClientSecret);

if (isGoogleAuthAvailable) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId as string,
        clientSecret: googleClientSecret as string,
        callbackURL: googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@gmail.com`;
          const name = profile.displayName || 'Google User';

          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name,
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.info('[Passport] Google OAuth credentials not found in .env. 1-click Google demo auth enabled.');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
