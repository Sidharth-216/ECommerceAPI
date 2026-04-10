import React, { useState, useEffect, useCallback } from 'react';
import { qrPaymentAPI } from '../../api.js';
import {
  QrCode, CheckCircle, XCircle, Clock, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

/**
 * AdminQRPaymentsTab
 * Drop this as a tab inside your AdminDashboard component.
 * 
 * Import and add to your admin tabs array:
 *   import AdminQRPaymentsTab from './tabs/AdminQRPaymentsTab';
 *   { id: 'qr-payments', label: 'QR Payments', icon: QrCode, component: AdminQRPaymentsTab }
 */
const AdminQRPaymentsTab = () => {
  const [payments, setPayments]       = useState([]);
  const [filter, setFilter]           = useState('pending'); // pending | all
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [actionNote, setActionNote]   = useState('');
  const [activeNote, setActiveNote]   = useState(null); // paymentId awaiting note confirmation
  const [actionType, setActionType]   = useState(''); // 'confirm' | 'reject'
  const [processing, setProcessing]   = useState('');  // paymentId being processed
  const [expanded, setExpanded]       = useState(null); // paymentId whose row is expanded

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = filter === 'pending'
        ? await qrPaymentAPI.adminGetPending()
        : await qrPaymentAPI.adminGetAll();
      setPayments(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load QR payments.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Confirm ────────────────────────────────────────────────────────────
  const handleConfirm = async (paymentId, note) => {
    setProcessing(paymentId);
    try {
      await qrPaymentAPI.adminConfirm(paymentId, note);
      setPayments(prev => prev.map(p =>
        p.paymentId === paymentId ? { ...p, status: 'Confirmed' } : p
      ));
      setActiveNote(null);
      setActionNote('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setProcessing('');
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────
  const handleReject = async (paymentId, note) => {
    setProcessing(paymentId);
    try {
      await qrPaymentAPI.adminReject(paymentId, note);
      setPayments(prev => prev.map(p =>
        p.paymentId === paymentId ? { ...p, status: 'Cancelled' } : p
      ));
      setActiveNote(null);
      setActionNote('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject payment.');
    } finally {
      setProcessing('');
    }
  };

  // ── Open note dialog ───────────────────────────────────────────────────
  const openNote = (paymentId, type) => {
    setActiveNote(paymentId);
    setActionType(type);
    setActionNote('');
  };

  const confirmAction = () => {
    if (!activeNote) return;
    if (actionType === 'confirm') handleConfirm(activeNote, actionNote);
    else handleReject(activeNote, actionNote);
  };

  // ── Status helpers ─────────────────────────────────────────────────────
  const statusConfig = {
    AwaitingPayment: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock,         label: 'Awaiting Payment' },
    PaymentReceived: { color: 'bg-blue-50  text-blue-700  border-blue-200',  icon: CheckCircle,   label: 'Payment Received' },
    Confirmed:       { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Confirmed' },
    Expired:         { color: 'bg-slate-50 text-slate-500 border-slate-200', icon: AlertCircle,   label: 'Expired' },
    Cancelled:       { color: 'bg-rose-50  text-rose-700  border-rose-200',  icon: XCircle,       label: 'Cancelled' },
  };

  const cfg = (status) => statusConfig[status] || statusConfig.Expired;

  const pending = payments.filter(p =>
    p.status === 'AwaitingPayment' || p.status === 'PaymentReceived'
  );

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">QR Payments</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Manually verify UPI / QR transfers and confirm or reject them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {[
              { id: 'pending', label: `Pending (${pending.length})` },
              { id: 'all',     label: 'All' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === f.id
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl hover:border-violet-400 hover:bg-violet-50 disabled:opacity-50 font-bold transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 px-5 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Note / Action dialog (inline overlay within tab) */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className={`text-lg font-black ${actionType === 'confirm' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {actionType === 'confirm' ? '✅ Confirm Payment' : '❌ Reject Payment'}
            </h3>
            <p className="text-sm text-slate-500">
              {actionType === 'confirm'
                ? 'This will mark the payment as received and move the order to Pending status.'
                : 'This will cancel this payment session. The order stays in PaymentPending so the customer can retry.'}
            </p>
            <textarea
              rows={3}
              placeholder={actionType === 'confirm' ? 'Optional: receipt note or UTR you verified' : 'Optional: reason for rejection'}
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setActiveNote(null); setActionNote(''); }}
                className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={!!processing}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 ${
                  actionType === 'confirm'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? <RefreshCw className="animate-spin w-4 h-4 mx-auto" /> : (actionType === 'confirm' ? 'Confirm' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Awaiting Payment', status: 'AwaitingPayment', color: 'border-amber-300 bg-amber-50' },
          { label: 'Payment Received', status: 'PaymentReceived', color: 'border-blue-300 bg-blue-50' },
          { label: 'Confirmed',        status: 'Confirmed',       color: 'border-emerald-300 bg-emerald-50' },
          { label: 'Rejected / Exp.',  status: ['Cancelled','Expired'], color: 'border-slate-300 bg-slate-50' },
        ].map(({ label, status, color }) => {
          const count = Array.isArray(status)
            ? payments.filter(p => status.includes(p.status)).length
            : payments.filter(p => p.status === status).length;

          return (
            <div key={label} className={`rounded-xl border-2 p-4 ${color}`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      {loading && payments.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 font-medium text-sm">Loading payments…</p>
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-16 text-center">
          <QrCode className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-600">No QR payments found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {filter === 'pending' ? 'No payments awaiting confirmation.' : 'No QR payment history yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b-2 border-violet-100">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wide">Order</th>
                  <th className="px-5 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wide">Customer</th>
                  <th className="px-5 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wide">Reference</th>
                  <th className="px-5 py-4 text-center text-xs font-black text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wide">Time</th>
                  <th className="px-5 py-4 text-center text-xs font-black text-slate-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => {
                  const { color, icon: Icon, label } = cfg(p.status);
                  const isExpanded = expanded === p.paymentId;
                  const canAct = p.status === 'AwaitingPayment' || p.status === 'PaymentReceived';
                  const isProcessing = processing === p.paymentId;

                  return (
                    <React.Fragment key={p.paymentId}>
                      <tr
                        className={`border-b border-slate-100 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } hover:bg-violet-50/40`}
                      >
                        {/* Order */}
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-800 text-sm">{p.orderNumber}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{p.paymentId?.slice(0, 10)}…</p>
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 text-sm">{p.customerName}</p>
                          <p className="text-xs text-slate-400">{p.customerEmail}</p>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <span className="font-black text-violet-700 text-lg">
                            ₹{p.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-bold">
                            {p.paymentReference}
                          </span>
                          {p.userProvidedUtr && (
                            <p className="text-xs text-blue-600 font-bold mt-1">
                              UTR: {p.userProvidedUtr}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${color}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                              {p.isExpired && p.status === 'AwaitingPayment' && (
                                <span className="ml-1 text-rose-500">(Exp.)</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Time */}
                        <td className="px-5 py-4">
                          <p className="text-xs text-slate-500 font-medium">
                            {new Date(p.createdAt).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Expand */}
                            <button
                              onClick={() => setExpanded(isExpanded ? null : p.paymentId)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="View details"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {canAct && (
                              <>
                                <button
                                  onClick={() => openNote(p.paymentId, 'confirm')}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle size={13} />
                                  Confirm
                                </button>
                                <button
                                  onClick={() => openNote(p.paymentId, 'reject')}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={13} />
                                  Reject
                                </button>
                              </>
                            )}

                            {!canAct && p.confirmedAt && (
                              <span className="text-xs text-slate-400 font-medium">
                                {new Date(p.confirmedAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-violet-50/60">
                          <td colSpan={7} className="px-8 py-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Payment ID</p>
                                <p className="font-mono text-slate-700 text-xs break-all">{p.paymentId}</p>
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Order ID</p>
                                <p className="font-mono text-slate-700 text-xs break-all">{p.orderId}</p>
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Expires At</p>
                                <p className="text-slate-700 text-xs">
                                  {new Date(p.expiresAt).toLocaleString('en-IN')}
                                  {p.isExpired && <span className="ml-1 text-rose-500 font-bold">(Expired)</span>}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">User UTR</p>
                                <p className={`font-mono font-bold text-sm ${p.userProvidedUtr ? 'text-blue-700' : 'text-slate-300'}`}>
                                  {p.userProvidedUtr || '— not provided —'}
                                </p>
                              </div>
                              {p.adminNote && (
                                <div className="col-span-2 md:col-span-4">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Admin Note</p>
                                  <p className="text-slate-700 text-sm italic">"{p.adminNote}"</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing <strong className="text-slate-700">{payments.length}</strong> sessions
            </span>
            <span className="font-bold text-violet-700">
              Total pending: ₹{
                pending.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString('en-IN')
              }
            </span>
          </div>
        </div>
      )}

      {/* How it works note */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 text-sm text-slate-600 space-y-2">
        <p className="font-black text-violet-800 text-base">How QR Payments work</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-500">
          <li>Customer selects "QR / UPI" at checkout and scans the code.</li>
          <li>Order is created with status <strong>PaymentPending</strong>.</li>
          <li>Customer taps "I've completed the payment" (optionally provides UTR).</li>
          <li>Order appears here as <strong>Payment Received</strong>.</li>
          <li>You verify the amount in your UPI app and click <strong>Confirm</strong>.</li>
          <li>Order automatically moves to <strong>Pending</strong> and enters the normal pipeline.</li>
        </ol>
      </div>
    </div>
  );
};

export default AdminQRPaymentsTab;