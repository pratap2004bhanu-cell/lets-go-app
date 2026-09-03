import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, password } = formData;

    // Basic validation
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Send login request to backend
      const response = await fetch(
        "http://localhost:5001/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      // Handle backend errors
      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      // Save JWT token
      localStorage.setItem("token", data.token);

      // Save current user
      localStorage.setItem(
        "currentUser",
        JSON.stringify(data.user)
      );

      // Remember me
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      // Login successful
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* LEFT SIDE */}
      <section className="login-showcase">
        <div className="showcase-content">

          <h1>
            Welcome back! <span>👋</span>
          </h1>

          <p className="showcase-subtitle">
            Login and continue your journey
            <br />
            with <span>Let's Go.</span>
          </p>

          <div className="feature-list">

            <div className="feature-item">
              <div className="feature-icon">
                👥
              </div>

              <div>
                <h3>Meet amazing people</h3>

                <p>
                  Connect with people
                  <br />
                  who share your interests.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                📅
              </div>

              <div>
                <h3>Discover activities</h3>

                <p>
                  Find exciting activities
                  <br />
                  happening around you.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                📍
              </div>

              <div>
                <h3>Create memories</h3>

                <p>
                  Join, participate and
                  <br />
                  make unforgettable memories.
                </p>
              </div>
            </div>

          </div>

          <div className="login-visual">

            <div className="visual-glow"></div>

            <div className="city-line city-one"></div>
            <div className="city-line city-two"></div>
            <div className="city-line city-three"></div>

            <div className="person person-one">●</div>
            <div className="person person-two">●</div>
            <div className="person person-three">●</div>

            <div className="visual-star star-one">✦</div>
            <div className="visual-star star-two">✦</div>
            <div className="visual-star star-three">✦</div>

          </div>

        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="login-form-section">

        <div className="login-card">

          <div className="auth-badge">
            ✦ WELCOME BACK
          </div>

          <h1>
            Login to your account
          </h1>

          <p className="login-subtitle">
            Happy to see you again!{" "}
            <span>Let's go</span> on another adventure.
          </p>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}
            <div className="login-input-group">

              <label>
                <span className="input-icon">
                  ✉
                </span>

                Email Address
              </label>

              <div className="input-wrapper">

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />

              </div>
            </div>

            {/* PASSWORD */}
            <div className="login-input-group">

              <label>
                <span className="input-icon">
                  ♙
                </span>

                Password
              </label>

              <div className="input-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "◉" : "◌"}
                </button>

              </div>
            </div>

            {/* OPTIONS */}
            <div className="login-options">

              <label className="remember-option">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(e.target.checked)
                  }
                />

                <span className="custom-checkbox">
                  {rememberMe ? "✓" : ""}
                </span>

                <span>
                  Remember me
                </span>

              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  alert(
                    "Password reset will be available soon."
                  )
                }
              >
                Forgot password?
              </button>

            </div>

            {/* ERROR */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              <span className="login-button-icon">
                ⇥
              </span>

              {loading
                ? "Logging in..."
                : "Login"}

              {!loading && (
                <span className="login-arrow">
                  →
                </span>
              )}

            </button>

          </form>

          {/* DIVIDER */}
          <div className="login-divider">

            <span></span>

            <p>
              OR CONTINUE WITH
            </p>

            <span></span>

          </div>

          {/* SOCIAL BUTTONS */}
          <div className="social-login">

            <button
              type="button"
              className="social-btn"
              onClick={() =>
                alert(
                  "Google login will be added later."
                )
              }
            >
              <span className="google-icon">
                G
              </span>
            </button>

            <button
              type="button"
              className="social-btn"
              onClick={() =>
                alert(
                  "Apple login will be added later."
                )
              }
            >
              <span className="apple-icon">
                ●
              </span>
            </button>

            <button
              type="button"
              className="social-btn"
              onClick={() =>
                alert(
                  "Facebook login will be added later."
                )
              }
            >
              <span className="facebook-icon">
                f
              </span>
            </button>

          </div>

          {/* REGISTER */}
          <div className="login-register">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Create Account
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Login;