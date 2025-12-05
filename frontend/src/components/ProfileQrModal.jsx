import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileQrModal() {
  const { user, showQr, hideQrModal } = useAuth();
  if (!user) return null;

    // ---------- Get the QR code src (should only be called after transaction is set) ----------
    function getQR() {
        // Format the qr code
        const id = user.utorid;  // Should always be valid since you must be logged in to access
        const baseScannedUrl = "https://app.bananacreds.ca/cashier/transactions";
        const scannedUrl = `${baseScannedUrl}?utorid=${encodeURIComponent(id)}`
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scannedUrl)}`;
        return qrUrl;
    }

  return (
    <Modal
      show={!!showQr}
      onHide={hideQrModal}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="bg-primary text-light">
        <Modal.Title>My QR Code</Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center">
        <p className="mb-1"><strong>{user.name || user.utorid}</strong></p>
        <p className="text-muted small">Scan this QR at the cashier to identify this user.</p>

        <div className="d-flex justify-content-center">
          <img
            alt="qr-user"
            src={getQR()}
            style={{ width: 260, height: 260 }}
            className="img-fluid rounded"
          />
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button onClick={hideQrModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
