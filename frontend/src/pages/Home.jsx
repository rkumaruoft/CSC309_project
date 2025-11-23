export default function Home() {
  // Placeholder for homepage; will display welcome and available points
  const points = 1250; // placeholder

  return (
    <div className="container mt-4">
      <h2>Welcome to BananaCreds!</h2>
      <div className="card mt-3 p-3" style={{ maxWidth: 420 }}>
        <h4>Available Points</h4>
        <p style={{ fontSize: '2rem', margin: 0 }}>{points}</p>
        <div className="mt-3">
          <button className="btn btn-primary me-2">Show My QR Code</button>
          <button className="btn btn-outline-secondary">Redeem Points</button>
        </div>
      </div>
    </div>
  );
}
