import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Loader, AlertCircle, Check } from 'lucide-react';

/**
 * BarcodeScanner Component
 * Uses Html5QrCode library for barcode scanning via webcam
 * Requirements: npm install html5-qrcode
 */
const BarcodeScanner = ({
  show,
  onClose,
  onBarcodeDetected,
  isLoading = false,
  manualInput = true
}) => {
  const [scanned, setScanned] = useState([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const qrScannerRef = useRef(null);
  const cameraRef = useRef(null);
  const Html5QrcodeRef = useRef(null);
  const scannedBarcodesRef = useRef(new Set());

  // Load Html5QrCode library dynamically
  useEffect(() => {
    if (!show) return;

    const loadQrCodeLibrary = async () => {
      try {
        const qrModule = await import('html5-qrcode');
        const Html5Qrcode = qrModule.Html5Qrcode || qrModule.default?.Html5Qrcode || qrModule.default;

        if (!Html5Qrcode) {
          throw new Error('Html5Qrcode class is not available');
        }

        Html5QrcodeRef.current = Html5Qrcode;
        
        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        setDevices(cameras);
        
        if (cameras.length > 0) {
          setDeviceId(cameras[0].id);
        }
      } catch (err) {
        setError(`Failed to load scanner: ${err.message}`);
      }
    };

    loadQrCodeLibrary();
  }, [show]);

  // Start camera scanning
  useEffect(() => {
    if (!show || !deviceId || !Html5QrcodeRef.current) return;

    const startScanning = async () => {
      try {
        setIsCameraReady(false);

        if (qrScannerRef.current) {
          try {
            await qrScannerRef.current.stop();
          } catch (stopErr) {
            console.warn('Error stopping previous scanner:', stopErr);
          }

          try {
            await qrScannerRef.current.clear();
          } catch (clearErr) {
            console.warn('Error clearing previous scanner:', clearErr);
          }

          qrScannerRef.current = null;
        }

        const scanner = new Html5QrcodeRef.current('qr-reader');
        qrScannerRef.current = scanner;

        const onScanSuccess = (decodedText) => {
          const cleanBarcode = decodedText.trim();

          if (scannedBarcodesRef.current.has(cleanBarcode)) {
            return;
          }

          scannedBarcodesRef.current.add(cleanBarcode);
          setScanned(prev => [...prev, { barcode: cleanBarcode, id: Date.now() }]);
          onBarcodeDetected(cleanBarcode);

          playBeep();
        };

        const onScanFailure = () => {
          // Silently fail - not every frame will have a barcode
        };

        await scanner.start(
          deviceId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.77777777,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            useBarCodeDetectorIfSupported: true
          },
          onScanSuccess,
          onScanFailure
        );

        setIsCameraReady(true);
      } catch (err) {
        setError(`Failed to start camera: ${err.message}`);
        console.error(err);
      }
    };

    startScanning();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
          .catch(err => {
            console.warn('Error stopping scanner:', err);
          })
          .finally(() => {
            qrScannerRef.current.clear().catch(err => {
              console.warn('Error clearing scanner:', err);
            }).finally(() => {
              qrScannerRef.current = null;
            });
          });
      }
    };
  }, [show, deviceId, onBarcodeDetected]);

  const playBeep = () => {
    // Simple beep audio feedback
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleManualAdd = () => {
    if (!manualBarcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    const cleanBarcode = manualBarcode.trim();

    if (scannedBarcodesRef.current.has(cleanBarcode)) {
      setError('This barcode has already been scanned');
      return;
    }

    scannedBarcodesRef.current.add(cleanBarcode);
    setScanned(prev => [...prev, { barcode: cleanBarcode, id: Date.now() }]);
    onBarcodeDetected(cleanBarcode);
    setManualBarcode('');
    playBeep();
  };

  const handleRemoveScanned = (id) => {
    setScanned(prev => {
      const removed = prev.find(item => item.id === id);
      if (removed) {
        scannedBarcodesRef.current.delete(removed.barcode);
      }

      return prev.filter(s => s.id !== id);
    });
  };

  const handleClose = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
        .catch(err => {
          console.warn('Error stopping scanner:', err);
        })
        .finally(() => {
          qrScannerRef.current.clear().catch(err => {
            console.warn('Error clearing scanner:', err);
          }).finally(() => {
            qrScannerRef.current = null;
          });
        });
    }
    setScanned([]);
    setManualBarcode('');
    setError('');
    setIsCameraReady(false);
    scannedBarcodesRef.current.clear();
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            <h3 className="text-2xl font-bold">Barcode Scanner</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mx-8 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-8 space-y-6">
          
          {/* Camera Selection */}
          {devices.length > 1 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Select Camera</label>
              <select
                value={deviceId || ''}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none"
              >
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Container */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
            <div
              id="qr-reader"
              ref={cameraRef}
              className="w-full"
              style={{ minHeight: '300px' }}
            />
            {!isCameraReady && (
              <div className="flex items-center justify-center h-80 bg-gray-100">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Manual Input (Fallback) */}
          {manualInput && (
            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
              <label className="block text-sm font-bold text-gray-700">Or Enter Barcode Manually</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => {
                    setManualBarcode(e.target.value);
                    setError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleManualAdd();
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="Enter barcode and press Enter or click Add"
                />
                <button
                  onClick={handleManualAdd}
                  disabled={isLoading || !manualBarcode.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Scanned Items List */}
          {scanned.length > 0 && (
            <div className="space-y-3 pt-4 border-t-2 border-gray-200">
              <h4 className="font-bold text-gray-700">Scanned Barcodes ({scanned.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {scanned.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-green-50 border-l-4 border-green-500 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <code className="text-sm font-mono text-gray-700">{item.barcode}</code>
                    </div>
                    <button
                      onClick={() => handleRemoveScanned(item.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all"
            >
              Close
            </button>
            <button
              disabled={scanned.length === 0 || isLoading}
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              Process {scanned.length} Barcode{scanned.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>✓ Position barcodes in front of the camera</p>
            <p>✓ Scanner automatically detects and beeps on successful scan</p>
            <p>✓ Use manual input if camera fails</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
