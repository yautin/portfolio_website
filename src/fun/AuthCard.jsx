import { useState } from "react";
import { supabase } from "../lib/supabase";

// Account panel for the games hub: email+password (sign in / sign up) and
// Google OAuth. When Supabase isn't configured it renders a graceful notice.
const AuthCard = ({ session }) => {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "error" | "info", text }

  if (!supabase) {
    return (
      <div className="fun-auth">
        <p className="fun-auth-title">Accounts</p>
        <p className="fun-auth-note">
          Sign-in isn&rsquo;t configured on this deployment yet. Your progress is
          still saved locally on this device.
        </p>
      </div>
    );
  }

  if (session) {
    const email = session.user.email || "Signed in";
    return (
      <div className="fun-auth">
        <p className="fun-auth-title">Account</p>
        <p className="fun-auth-user">{email}</p>
        <p className="fun-auth-note">
          Your game progress syncs to your account across devices.
        </p>
        <button
          type="button"
          className="fun-btn is-ghost"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // follow the request origin (localhost in dev, prod in prod) so the
          // confirmation link works in both without depending on Site URL
          options: { emailRedirectTo: `${window.location.origin}/fun` },
        });
        if (error) throw error;
        setMsg({ type: "info", text: "Check your email to confirm your account, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/fun` },
    });
    if (error) setMsg({ type: "error", text: error.message });
  };

  const reset = async () => {
    if (!email) { setMsg({ type: "error", text: "Enter your email first." }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/fun`,
    });
    setMsg(error ? { type: "error", text: error.message } : { type: "info", text: "Password reset email sent." });
  };

  return (
    <div className="fun-auth">
      <p className="fun-auth-title">
        {mode === "signin" ? "Sign in to sync progress" : "Create an account"}
      </p>

      <button type="button" className="fun-btn is-google" onClick={google}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </button>

      <div className="fun-auth-or"><span>or</span></div>

      <form className="fun-auth-form" onSubmit={submit}>
        <input
          type="email"
          className="fun-input"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="fun-input"
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" className="fun-btn is-primary" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      {msg && <p className={`fun-auth-msg is-${msg.type}`}>{msg.text}</p>}

      <div className="fun-auth-links">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => { setMode("signup"); setMsg(null); }}>
              Create an account
            </button>
            <button type="button" onClick={reset}>Forgot password?</button>
          </>
        ) : (
          <button type="button" onClick={() => { setMode("signin"); setMsg(null); }}>
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthCard;
