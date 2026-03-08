import React, { useState, useEffect, useCallback } from 'react';
import { qrPaymentAPI } from '/home/sidhu/Desktop/ECommerceAPI/frontend/src/api.js';
import {
  X, RefreshCw, CheckCircle, Clock, Copy, AlertCircle,
  Smartphone, Shield, ChevronRight, Loader
} from 'lucide-react';

/**
 * QRPaymentModal
 *
 * Props:
 *   orderId       {string}   – MongoDB ObjectId of the just-created order
 *   orderNumber   {string}   – Human-readable order number
 *   amount        {number}   – Total amount in INR
 *   onSuccess     {fn}       – Called when admin confirms (polled)
 *   onClose       {fn}       – Called when user closes / cancels
 */
const QRPaymentModal = ({ orderId, orderNumber, amount, onSuccess, onClose }) => {
  const [stage, setStage] = useState('loading'); // loading | qr | submitted | confirmed | expired | error
  const [paymentData, setPaymentData] = useState(null);
  const [utr, setUtr] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Initiate session ────────────────────────────────────────────────────
  const initiate = useCallback(async () => {
    setStage('loading');
    setError('');
    try {
      const res = await qrPaymentAPI.initiate(orderId);
      const data = res.data;
      setPaymentData(data);
      setTimeLeft(data.expiresInSeconds);
      setStage('qr');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load QR code.');
      setStage('error');
    }
  }, [orderId]);

  useEffect(() => { initiate(); }, [initiate]);

  // ── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'qr' && stage !== 'submitted') return;
    if (timeLeft <= 0) { setStage('expired'); return; }

    const tick = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(tick); setStage('expired'); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [stage, timeLeft]);

  // ── Poll for confirmation (every 8 s after user submits) ────────────────
  useEffect(() => {
    if (stage !== 'submitted') return;
    if (!paymentData?.paymentId) return;

    const poll = setInterval(async () => {
      try {
        const res = await qrPaymentAPI.getStatus(orderId);
        const { status } = res.data;
        if (status === 'Confirmed') {
          clearInterval(poll);
          setStage('confirmed');
          setTimeout(() => onSuccess?.(), 2000);
        }
        if (status === 'Cancelled' || status === 'Expired') {
          clearInterval(poll);
          setStage(status.toLowerCase());
        }
      } catch (_) { /* silent */ }
    }, 8000);

    return () => clearInterval(poll);
  }, [stage, paymentData, orderId, onSuccess]);

  // ── Mark received ────────────────────────────────────────────────────────
  const handleMarkReceived = async () => {
    if (!paymentData?.paymentId) return;
    setSubmitting(true);
    setError('');
    try {
      await qrPaymentAPI.markReceived(paymentData.paymentId, utr);
      setStage('submitted');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy reference ───────────────────────────────────────────────────────
  const copyRef = () => {
    navigator.clipboard.writeText(paymentData?.paymentReference ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const urgency = timeLeft < 120 ? 'text-rose-500' : timeLeft < 300 ? 'text-amber-500' : 'text-teal-600';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-violet-200 text-xs font-bold uppercase tracking-widest">Secure QR Payment</p>
            <h2 className="text-white text-xl font-black mt-0.5">
              ₹{amount?.toLocaleString('en-IN')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* ── LOADING ── */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader className="animate-spin text-violet-600" size={40} />
              <p className="text-slate-500 font-medium">Generating your QR code…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div className="flex flex-col items-center py-10 gap-4 text-center">
              <AlertCircle className="text-rose-500" size={48} />
              <p className="text-slate-700 font-bold">{error}</p>
              <button onClick={initiate} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition-colors">
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          )}

          {/* ── QR CODE ── */}
          {stage === 'qr' && paymentData && (
            <div className="space-y-5">
              {/* Timer */}
              <div className={`flex items-center justify-center gap-2 font-mono font-black text-2xl ${urgency}`}>
                <Clock size={22} />
                {fmt(timeLeft)}
              </div>

              {/* QR Image */}
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-white border-4 border-violet-100 rounded-2xl shadow-inner">
                  {/* 
                    The QR payload is currently the static PhonePe QR URL (an image).
                    Once you have a real UPI deeplink, swap the <img> for a QR-code library:
                      import QRCode from 'qrcode.react';
                      <QRCode value={paymentData.qrPayload} size={220} />
                  */}
                  <img
                    src={paymentData.qrPayload}
                    alt="Scan to pay via PhonePe / UPI"
                    className="w-52 h-52 object-contain"
                  />
                </div>
                <p className="text-xs text-slate-400 font-medium text-center">
                  Scan with any UPI app · PhonePe · GPay · Paytm
                </p>
              </div>

              {/* Reference */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-3 border border-slate-200">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Payment Reference</p>
                  <p className="text-slate-800 font-black font-mono text-sm mt-0.5">
                    {paymentData.paymentReference}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Add this in the UPI note / remarks</p>
                </div>
                <button
                  onClick={copyRef}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  }`}
                >
                  {copied ? '✓ Copied' : <><Copy size={14} className="inline mr-1" />Copy</>}
                </button>
              </div>

              {/* Amount reminder */}
              <div className="bg-violet-50 rounded-xl p-4 flex items-center gap-3 border border-violet-100">
                <Shield size={20} className="text-violet-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-slate-800">Pay exactly ₹{amount?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your order #{orderNumber} will be held until payment is confirmed by our team.
                  </p>
                </div>
              </div>

              {/* UTR input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">
                  Done with payment? Enter your UTR / Transaction ID
                  <span className="ml-1 text-xs font-normal text-slate-400">(optional but speeds up confirmation)</span>
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  placeholder="e.g. 425012345678"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none font-mono text-sm transition-all"
                />
              </div>

              {error && <p className="text-rose-500 text-sm font-bold">{error}</p>}

              <button
                onClick={handleMarkReceived}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-violet-200"
              >
                {submitting
                  ? <Loader className="animate-spin" size={20} />
                  : <><Smartphone size={20} /> I've Completed the Payment <ChevronRight size={18} /></>
                }
              </button>
            </div>
          )}

          {/* ── SUBMITTED — waiting for admin ── */}
          {stage === 'submitted' && (
            <div className="flex flex-col items-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
                <Clock className="text-amber-500" size={36} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Under Review</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                  Our team is verifying your payment. Your order will be confirmed within a few minutes.
                  You can safely close this window.
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-left w-full border border-amber-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Order</p>
                <p className="font-black text-slate-800">#{orderNumber}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-3 mb-1">Amount</p>
                <p className="font-black text-slate-800">₹{amount?.toLocaleString('en-IN')}</p>
                {utr && (
                  <>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-3 mb-1">Your UTR</p>
                    <p className="font-mono font-bold text-slate-800">{utr}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader className="animate-spin" size={14} />
                Checking for confirmation…
              </div>
              <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">
                Close and check Orders later
              </button>
            </div>
          )}

          {/* ── CONFIRMED ── */}
          {stage === 'confirmed' && (
            <div className="flex flex-col items-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center">
                <CheckCircle className="text-emerald-500" size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Confirmed! 🎉</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Your order <strong>#{orderNumber}</strong> is now active.
                </p>
              </div>
            </div>
          )}

          {/* ── EXPIRED ── */}
          {stage === 'expired' && (
            <div className="flex flex-col items-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-rose-50 border-4 border-rose-200 flex items-center justify-center">
                <AlertCircle className="text-rose-500" size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">QR Code Expired</h3>
                <p className="text-slate-500 text-sm mt-2">
                  This QR session has timed out. Generate a new one to continue.
                </p>
              </div>
              <button
                onClick={initiate}
                className="px-8 py-3 bg-violet-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-violet-700 transition-colors"
              >
                <RefreshCw size={16} /> Generate New QR
              </button>
            </div>
          )}

          {/* ── CANCELLED (rejected by admin) ── */}
          {stage === 'cancelled' && (
            <div className="flex flex-col items-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center">
                <X className="text-slate-500" size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Not Verified</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Our team could not verify this payment. Please try again or contact support.
                </p>
              </div>
              <button onClick={initiate} className="px-8 py-3 bg-violet-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-violet-700 transition-colors">
                <RefreshCw size={16} /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRPaymentModal;