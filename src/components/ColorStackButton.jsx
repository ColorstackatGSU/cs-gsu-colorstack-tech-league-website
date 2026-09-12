import { useLocation } from 'react-router-dom';
import { colorstackSignInUrl } from '../lib/authStore';

/**
 * "Sign in with ColorStack at GSU", offered under the email form on login and signup.
 *
 * One option among two, deliberately below the email form rather than above it: most
 * GSU students are not ColorStack members, and the page should not read as if they need
 * to be. A plain link, not a fetch, because the portal login is a full-page redirect.
 */
export default function ColorStackButton() {
  const location = useLocation();
  const next = location.state?.from ?? '/dashboard';

  return (
    <div className="auth__alt">
      <p className="auth__divider">
        <span>or</span>
      </p>
      <a className="btn btn--glass btn--lg auth__colorstack" href={colorstackSignInUrl(next)}>
        <img src="/partners/colorstack.png" alt="" width="22" height="22" aria-hidden="true" />
        <span>Continue with ColorStack at GSU</span>
      </a>
      <p className="auth__alt-note">
        For ColorStack members. We fill in what you have already told the chapter.
      </p>
    </div>
  );
}
