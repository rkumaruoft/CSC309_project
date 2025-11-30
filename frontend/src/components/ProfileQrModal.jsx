import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileQrModal() {
  const { user, showQr, hideQrModal } = useAuth();
  if (!user) return null;

  const id = user.utorid ?? user.id ?? '';
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`user:${id}`)}`;

  return (
    <Modal
      show={!!showQr}
      onHide={hideQrModal}
      centered
      backdrop="static"
      contentClassName="bg-dark text-light"
    >
      <Modal.Header closeButton className="bg-dark text-light border-secondary">
        <Modal.Title>My QR Code</Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center bg-dark text-light">
        <p className="mb-1"><strong>{user.name || user.utorid}</strong></p>
        <p className="text-muted small">Scan this QR at the cashier to identify this user.</p>

        <div className="d-flex justify-content-center">
          <img
            alt="qr-user"
            src={src}
            style={{ width: 260, height: 260 }}
            className="img-fluid rounded"
          />
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-dark border-secondary">
        <Button variant="secondary" onClick={hideQrModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
