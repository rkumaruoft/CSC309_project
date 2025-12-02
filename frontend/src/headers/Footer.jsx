export default function Footer() {
  return (
    <footer className="navbar-dark bg-primary text-light text-center py-3 mt-auto">
      <small className="d-block">
        {new Date().getFullYear()} BananaCreds — All Rights Reserved
      </small>
    </footer>
  );
}