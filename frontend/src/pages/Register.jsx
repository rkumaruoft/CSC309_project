import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();

    const [form, setForm] = useState({
        utorid: "",
        name: "",
        emailLocal: "",
        birthday: "",
        password: "",
        confirm: "",
    });

    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });

        if (e.target.name === "password") {
            validatePassword(e.target.value);
        }
    };

    // ---------------- PASSWORD VALIDATION ----------------
    function validatePassword(pw) {
        setPasswordChecks({
            length: pw.length >= 8,
            upper: /[A-Z]/.test(pw),
            lower: /[a-z]/.test(pw),
            number: /[0-9]/.test(pw),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
        });
    }

    const passwordValid = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = form.password === form.confirm;
    // ---------------- SUBMIT REGISTER ----------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!passwordValid) {
            return setError("Password does not meet the required criteria.");
        }

        if (!passwordsMatch) {
            return setError("Passwords do not match.");
        }

        try {
            const res = await fetch(`${BACKEND_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    utorid: form.utorid,
                    name: form.name,
                    email: `${form.emailLocal.toLowerCase()}@mail.utoronto.ca`,
                    birthday: form.birthday ? new Date(form.birthday) : null,
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                return setError(data.error || "Registration failed.");
            }

            navigate(`/verify?utorid=${form.utorid}`);


        } catch {
            setError("Network error. Please try again.");
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: "550px" }}>
            <h1 className="text-center mb-4">Register</h1>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>

                {/* UTORID */}
                <div className="mb-3">
                    <label className="form-label">UTORID</label>
                    <input
                        type="text"
                        className="form-control"
                        name="utorid"
                        value={form.utorid}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* NAME */}
                <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* EMAIL */}
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            name="emailLocal"
                            placeholder="john.smith"
                            value={form.emailLocal}
                            onChange={(e) =>
                                setForm({ ...form, emailLocal: e.target.value.trim() })
                            }
                            required
                        />
                        <span className="input-group-text">@mail.utoronto.ca</span>
                    </div>
                </div>

                {/* BIRTHDAY */}
                <div className="mb-3">
                    <label className="form-label">Birthday (optional)</label>
                    <input
                        type="date"
                        className="form-control"
                        name="birthday"
                        value={form.birthday}
                        onChange={handleChange}
                    />
                </div>

                {/* PASSWORD */}
                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* PASSWORD CHECKLIST */}
                {form.password && (
                    <ul className="small text-start mt-2">
                        <li style={{ color: passwordChecks.length ? "green" : "red" }}>
                            {passwordChecks.length ? "✔" : "✘"} At least 8 characters
                        </li>
                        <li style={{ color: passwordChecks.upper ? "green" : "red" }}>
                            {passwordChecks.upper ? "✔" : "✘"} One uppercase letter
                        </li>
                        <li style={{ color: passwordChecks.lower ? "green" : "red" }}>
                            {passwordChecks.lower ? "✔" : "✘"} One lowercase letter
                        </li>
                        <li style={{ color: passwordChecks.number ? "green" : "red" }}>
                            {passwordChecks.number ? "✔" : "✘"} One number
                        </li>
                        <li style={{ color: passwordChecks.special ? "green" : "red" }}>
                            {passwordChecks.special ? "✔" : "✘"} One special character
                        </li>
                    </ul>
                )}

                {/* CONFIRM PASSWORD */}
                <div className="mb-3 mt-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                        type="password"
                        className="form-control"
                        name="confirm"
                        value={form.confirm}
                        onChange={handleChange}
                        required
                        style={{
                            borderColor: form.confirm
                                ? passwordsMatch
                                    ? "green"
                                    : "red"
                                : undefined,
                        }}
                    />
                    {form.confirm && !passwordsMatch && (
                        <div className="text-danger small mt-1">
                            Passwords do not match
                        </div>
                    )}
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    className="btn btn-primary w-100 mt-4"
                    disabled={!passwordValid || !passwordsMatch}
                >
                    Create Account
                </button>
            </form>
        </div>
    );
}
