import React, { useState, useEffect, useRef } from 'react';
import { useBoQ } from '../../context/BoQContext';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { verifyAndConsumeOtp, FIXED_MASTER_EMAIL } from '../../services/cloudLibraryService';

export function OtpVerificationModal() {
  const { 
    otpModalData, 
    closeOtpModal, 
    showToast
  } = useBoQ();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (otpModalData?.isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMessage('');
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
    }
  }, [otpModalData?.isOpen]);

  if (!otpModalData?.isOpen) return null;

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/[^0-9]/g, '');
    
    if (cleanVal.length > 1) {
      // User pasted full OTP code
      const pasted = cleanVal.slice(0, 6).split('');
      const newDigits = [...digits];
      pasted.forEach((ch, idx) => {
        if (idx < 6) newDigits[idx] = ch;
      });
      setDigits(newDigits);
      if (pasted.length === 6) {
        verifyCode(newDigits.join(''));
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);
    setErrorMessage('');

    // Auto focus next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If 6 digits complete, auto verify
    if (cleanVal && index === 5 && newDigits.every(d => d !== '')) {
      verifyCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (code) => {
    setIsVerifying(true);
    setErrorMessage('');

    try {
      const result = await verifyAndConsumeOtp(code);

      if (result.success) {
        showToast(result.message || 'Izin 1x upload berhasil diverifikasi!', 'success');
        
        // Execute pending action (save to library, etc.)
        if (typeof otpModalData.onSuccess === 'function') {
          await otpModalData.onSuccess();
        }
        setIsVerifying(false);
        closeOtpModal();
      } else {
        setIsVerifying(false);
        setErrorMessage(result.message);
        showToast(result.message, 'error');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setIsVerifying(false);
      setErrorMessage('Gagal memverifikasi OTP: ' + err.message);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length < 6) {
      setErrorMessage('Silakan masukkan 6 digit kode OTP.');
      return;
    }
    verifyCode(fullCode);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-paper-300 max-w-md w-full overflow-hidden animate-scaleUp text-paper-900">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-6 text-white text-center relative">
          <button 
            onClick={closeOtpModal}
            className="absolute top-4 right-4 text-amber-200 hover:text-white p-1 rounded-xl hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-white" />
          </div>

          <h3 className="font-heading text-xl font-bold tracking-wide uppercase">
            Izin Diperlukan (Kode OTP)
          </h3>
          <p className="text-xs text-amber-100 mt-1 max-w-xs mx-auto leading-relaxed">
            Perangkat ini berada dalam mode <strong>Klien</strong>. Masukkan Kode OTP dari Master untuk {otpModalData?.actionName || 'melanjutkan aksi ini'}.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleManualSubmit} className="p-6 space-y-5">
          
          <div className="text-center space-y-1">
            <span className="text-[11px] font-mono uppercase text-paper-500 block font-bold">
              Kode OTP 1x Upload
            </span>
            <p className="text-xs font-medium text-paper-800">
              Minta kode 6-digit dari pemilik: <br />
              <span className="font-mono font-bold text-blueprint-800">{FIXED_MASTER_EMAIL}</span>
            </p>
          </div>

          {/* 6 Digit Input Boxes */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => (inputRefs.current[idx] = el)}
                type="text"
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                value={digit}
                onChange={e => handleDigitChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border-2 border-paper-300 bg-paper-50 focus:bg-white focus:border-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all text-paper-900"
              />
            ))}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Tips Info */}
          <div className="p-3 rounded-xl bg-paper-50 border border-paper-200 text-[11px] text-paper-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-paper-800">
              <HelpCircle className="w-3.5 h-3.5 text-blueprint-600" />
              <span>Di mana mendapatkan Kode OTP?</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Buka website ini di <strong>PC Utama</strong> Anda, klik ikon <strong>Cloud Sync</strong> di menu atas, dan salin <strong>Kode OTP 6-Digit</strong> yang muncul di sana.
            </p>
          </div>

          {/* Actions */}
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
              <span>{isVerifying ? 'Memverifikasi...' : 'Verifikasi OTP'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
