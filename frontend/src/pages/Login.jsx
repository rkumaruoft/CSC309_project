import { useState } from "react";
import { Link } from "react-router-dom";
import { Form, Button, Card } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();

  const [utorid, setUtorid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const err = await login(utorid, password); // AuthContext handles navigation
    if (err) {
      setError(err);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center vertical-center"
      style={{ minHeight: "80vh" }}
    >
      <Card style={{ width: "380px" }} className="p-4 shadow-lg">
        <h2 className="text-center mb-4">Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label>UTORid</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your UTORid"
              required
              value={utorid}
              onChange={(e) => setUtorid(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Button type="submit" className="w-100 mt-2">
            Login
          </Button>
        </Form>

        <div className="text-center mt-3">
          <small>Don't have an account?</small>
          <br />
          <Link to="/register">Create New User</Link>
        </div>
      </Card>
    </div>
  );
}
