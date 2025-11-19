import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Button, Card } from "react-bootstrap";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/dashboard"); // TEMP
  };

  return (
    <div className="d-flex justify-content-center align-items-center vertical-center" style={{ minHeight: "80vh" }}>
      <Card style={{ width: "380px" }} className="p-4 shadow-lg">
        <h2 className="text-center mb-4">Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
