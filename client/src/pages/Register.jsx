import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, password } = formData;

    // Basic validation
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Send registration data to backend
      const response = await fetch(
        "https://lets-go-backend-p4ox.onrender.com/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      // Backend returned an error
      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      // Save logged-in user
      localStorage.setItem(
        "currentUser",
        JSON.stringify(data.user)
      );
      localStorage.setItem("token", data.token);

      // Go to Discover
      navigate("/discover");
    } catch (error) {
      console.error("Registration error:", error);

      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">

        <div className="auth-badge">
          ✦ JOIN THE COMMUNITY
        </div>

        <h1>
          Create your account <span>🚀</span>
        </h1>

        <p className="auth-subtitle">
          Meet people. Discover activities. Let's go.
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* Full Name */}
          <div className="input-group">
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
              minLength="6"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}

            {!loading && <span>→</span>}
          </button>

        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>{" "}

          <Link to="/login">
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;