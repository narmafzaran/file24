import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, CreditCard, Lock, Calendar, RefreshCw, ChevronLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";

interface SimulatedPaymentProps {
  transactionId: string;
  price: number;
  productTitle: string;
  onPaymentResult: (success: boolean, downloadToken?: string) => void;
}

export default function SimulatedPayment({ transactionId, price, productTitle, onPaymentResult }: SimulatedPaymentProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cvv2, setCvv2] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [pin, setPin] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate random captcha characters on boot
  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Format countdown timer (MM:SS)
  useEffect(() => {
    if (timeLeft <= 0) {
      setError("زمان تراکنش منقضی شد. لطفا مجددا تلاش فرمایید.");
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Card formatter adding spaces every 4 characters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    let formatted = "";
    for (let i = 0; i < raw.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += " - ";
      formatted += raw[i];
    }
    setCardNumber(formatted);
  };

  const handlePay = async (success: boolean) => {
    setError("");
    if (success) {
      // Basic validations
      if (cardNumber.replace(/\D/g, "").length !== 16) {
        setError("لطفا یک شماره کارت ۱۶ رقمی معتبر وارد کنید");
        return;
      }
      if (cvv2.length < 3) {
        setError("لطفا کد امنیتی CVV2 معتبر وارد کنید");
        return;
      }
      if (!expMonth || !expYear) {
        setError("لطفا تاریخ انقضای کارت را بررسی نمایید");
        return;
      }
      if (captchaInput !== captchaCode) {
        setError("کد امنیتی تصویر صحیح نیست");
        return;
      }
      if (!pin) {
        setError("رمز ایستای کارت یا رمز دوم الزامی است");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          status: success ? "success" : "cancel",
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "خطا در تأیید هویت تراکنش");
      }

      if (success && resData.status === "success") {
        onPaymentResult(true, resData.downloadToken);
      } else {
        onPaymentResult(false);
      }
    } catch (err: any) {
      setError(err.message || "تراکنش لغو شده یا با خطا از طرف درگاه شبیه‌ساز روبه‌رو شد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaeff5] py-10 px-4 flex flex-col items-center justify-center font-sans" dir="rtl">
      
      {/* Network Header */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-6 text-slate-600">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-teal-600" />
          <span className="font-bold text-sm tracking-wide">درگاه پرداخت اینترنتی شاپرک</span>
        </div>
        <div className="text-xs bg-white py-1.5 px-3 rounded-full shadow-xs border border-slate-200">
          تارنمای شبیه‌ساز امن مجهز به SSL
        </div>
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 grid grid-cols-1 md:grid-cols-3">
        
        {/* Sidebar Info */}
        <div className="p-6 bg-slate-900 text-white md:col-span-1 flex flex-col justify-between border-l border-slate-800">
          <div>
            <div className="mb-6 pb-6 border-b border-white/10">
              <span className="text-xs text-slate-400 block mb-1">نام فروشگاه مرجع</span>
              <span className="font-bold text-base text-teal-300">پلتفرم خرید و دانلود فایل</span>
            </div>

            <div className="space-y-4 text-xs font-light">
              <div>
                <span className="text-slate-400 block mb-1">محصول خریداری شده</span>
                <span className="font-medium text-slate-200 break-words leading-relaxed">{productTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">شناسه تراکنش پورتال</span>
                <span className="font-mono text-slate-200 text-[11px] block text-left mt-0.5">{transactionId}</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-white/10">
            <span className="text-slate-400 text-xs block mb-1">مبلغ نهایی پرداخت</span>
            <div className="text-xl font-black text-emerald-400">
              {price.toLocaleString("fa-IR")} <span className="text-xs font-semibold text-white">تومان</span>
            </div>
            
            <div className="mt-4 bg-slate-800/60 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">مهلت تکمیل پرداخت:</span>
              <span className="text-amber-400 font-mono text-sm font-bold">{formatTimer()}</span>
            </div>
          </div>
        </div>

        {/* Form Inputs Area */}
        <div className="p-6 md:col-span-2 text-right">
          <h2 className="text-base font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>اطلاعات کارت بانکی خود را وارد کنید</span>
          </h2>

          {error && (
            <div className="mb-5 p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 transition-all mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            
            {/* Card Number Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">شماره کارت ۱۶ رقمی</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="xxxx - xxxx - xxxx - xxxx"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  dir="ltr"
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm md:text-base text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            {/* CVV2 and Expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">کد امنیتی CVV2</label>
                <input
                  type="text"
                  maxLength={4}
                  value={cvv2}
                  onChange={(e) => setCvv2(e.target.value.replace(/\D/g, ""))}
                  placeholder="۳ یا ۴ رقمی"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">تاریخ انقضا کارت</label>
                <div className="flex gap-2" dir="ltr">
                  <input
                    type="text"
                    maxLength={2}
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
                    placeholder="ماه"
                    className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                  />
                  <span className="text-slate-300 self-center">/</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
                    placeholder="سال"
                    className="w-1/2 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Captcha Block */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">کد امنیتی تصویر</label>
                <input
                  type="text"
                  maxLength={4}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="کد مقابل"
                  dir="ltr"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 h-10.5 bg-slate-100 rounded-xl p-1.5 border border-slate-200 justify-center">
                <div className="text-slate-700 font-bold font-mono tracking-widest text-lg line-through italic px-4 select-none">
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* PIN code */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">رمز اینترنتی کارت (رمز دوم یا پویا)</label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={12}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="رمز اینترنتی وارد کنید"
                  dir="ltr"
                  className="w-full pl-24 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                />
                
                <button
                  type="button"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-slate-100 bg-[#34495e] hover:bg-[#2c3e50] font-sans text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  onClick={() => setPin(Math.floor(102938 + Math.random() * 897062).toString())}
                >
                  دریافت رمز پویا شبیه‌ساز
                </button>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => handlePay(false)}
              disabled={loading}
              className="flex-1 py-3 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              انصراف و بازگشت
            </button>
            <button
              onClick={() => handlePay(true)}
              disabled={loading}
              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>پرداخت و خرید نهایی</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Safety Warnings */}
      <div className="w-full max-w-3xl mt-8 p-4 bg-white/70 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed text-right">
        <h4 className="font-bold text-slate-700 mb-1">توصیه‌های امنیتی پورتال شاپرک:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>نام این وبسایت به منظور شبیه‌سازی تراکنش و اجرای آزمایشی طراحی شده است. هیچ هزینه واقعی دریافت نخواهد شد.</li>
          <li>کد امنیتی CVV2 عددی ۳ یا ۴ رقمی است که معمولاً رو یا پشت کارت‌های بانکی درج می‌شود.</li>
          <li>به منظور حفظ امنیت حساب‌های خود، هرگز مشخصات کارت‌های معتبر خود را در این درگاه آزمایشی وارد ننمایید و فقط اطلاعات دلخواه وارد کنید.</li>
        </ul>
      </div>
    </div>
  );
}
