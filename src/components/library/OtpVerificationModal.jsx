import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, HelpCircle, KeyRound, Lock, X } from 'lucide-react';
import { useBoQ } from '../../context/BoQContext';
import { MASTER_EMAIL } from '../../services/cloud/config';

const OTP_LENGTH = 6;
const emptyDigits = () => Array(OTP_LENGTH).fill('');

export function OtpVerificationModal() {
  const { otpModalData, closeOtpModal, showToast, redeemOtp } = useBoQ();

  const [digits, setDigits] = useState(emptyDigits);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef([]);
  const verifyingRef = useRef(false);
  const isOpen = Boolean(otpModalData?.isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    setDigits(emptyDigits());
    setErrorMessage('');
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const verifyCode = async (code) => {
    if (verifyingRef.current) return; // cegah verifikasi ganda (auto-submit + tombol)
    verifyingRef.current = true;
    setIsVerifying(true);
    setErrorMessage('');
    try {
      const result = await redeemOtp(code, otpModalData.actionName);
      if (!result.success) {
        setErrorMessage(result.message);
        setDigits(emptyDigits());
        inputRefs.current[0]?.focus();
        return;
      }
      showToast(result.message, 'success');
      const onSuccess = otpModalData.onSuccess;
      closeOtpModal();
      if (typeof onSuccess === 'function') await onSuccess();
    } catch (error) {
      console.error('[SR Studio] Verifikasi OTP gagal:', error);
      setErrorMessage(`Gagal memverifikasi OTP: ${error?.message || error}`);
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/[^0-9]/g, '');
    setErrorMessage('');

    if (clean.length > 1) {
      // Tempel kode penuh
      const pasted = clean.slice(0, OTP_LENGTH).split('');
      const next = emptyDigits().map((_, i) => pasted[i] || '');
      setDigits(next);
      if (pasted.length === OTP_LENGTH) verifyCode(next.join(''));
      else inputRefs.current[pasted.length]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (clean && next.every((digit) => digit !== '')) verifyCode(next.join(''));
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'Escape') closeOtpModal();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setErrorMessage('Silakan masukkan 6 digit Kode OTP.');
      return;
    }
    verifyCode(code);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-paper-300 max-w-md w-full overflow-hidden animate-scaleUp text-paper-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
      >
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={closeOtpModal}
            className="absolute top-4 right-4 text-amber-200 hover:text-white p-1 rounded-xl hover:bg-black/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h3 id="otp-title" className="font-heading text-xl font-bold tracking-wide uppercase">
            Izin Diperlukan (Kode OTP)
          </h3>
          <p className="text-xs text-amber-100 mt-1 max-w-xs mx-auto leading-relaxed">
            Perangkat ini berada dalam mode <strong>Klien</strong>. Masukkan Kode OTP dari Master untuk{' '}
            {otpModalData?.actionName || 'melanjutkan aksi ini'}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-mono uppercase text-paper-500 block font-bold">Kode OTP 1x Pakai</span>
            <p className="text-xs font-medium text-paper-800">
              Minta kode 6-digit dari pemilik: <br />
              <span className="font-mono font-bold text-blueprint-800">{MASTER_EMAIL}</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit OTP ke-${index + 1}`}
                maxLength={index === 0 ? OTP_LENGTH : 1}
                value={digit}
                disabled={isVerifying}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="w-11 h-14 sm:w-12 text-center text-xl font-mono font-black rounded-xl border-2 border-paper-300 bg-paper-50 focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all text-paper-900 disabled:opacity-60"
              />
            ))}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-paper-50 border border-paper-200 text-[11px] text-paper-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-paper-800">
              <HelpCircle className="w-3.5 h-3.5 text-blueprint-600" />
              <span>Di mana mendapatkan Kode OTP?</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Di perangkat <strong>Master</strong>, klik indikator <strong>Realtime</strong> di bar atas (Pusat
              Sinkronisasi). Kode 6-digit tampil di sana, berlaku 30 menit dan hangus setelah satu kali dipakai.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={closeOtpModal}
              className="flex-1 py-2.5 rounded-xl border border-paper-300 bg-white hover:bg-paper-50 text-paper-700 text-xs font-semibold font-display transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold font-display shadow-md transition-all disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isVerifying ? 'Memverifikasi…' : 'Verifikasi OTP'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
