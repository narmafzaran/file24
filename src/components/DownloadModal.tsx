import React, { useState } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, Download, CreditCard, Lock, Mail, Phone, User } from "lucide-react";
import { Product } from "../types";

interface DownloadModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: (data: {
    status: string;
    downloadToken?: string;
    productId: string;
    transactionId?: string;
    price: number;
  }) => void;
}

export default function DownloadModal({ product, onClose, onSuccess }: DownloadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPrice = (price: number) => {
    if (price === 0) return "رایگان";
    return `${price.toLocaleString("fa-IR")} تومان`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple Iranian phone number validation (09xxxxxxxxx & 11 digits)
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError("لطفا یک شماره مستقیم معتبر همراه وارد کنید (مثال: 09123456789)");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("لطفا یک آدرس ایمیل معتبر وارد کنید");
      return;
    }

    if (name.trim().length < 3) {
      setError("لطفا نام و نام خانوادگی خود را کامل وارد کنید");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          userName: name.trim(),
          userPhone: phone,
          userEmail: email.trim(),
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "خطا در برقراری ارتباط با سرور");
      }

      onSuccess({
        status: resData.status,
        downloadToken: resData.downloadToken,
        productId: product.id,
        transactionId: resData.transactionId,
        price: product.price,
      });
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد. مجددا تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        id="download-modal-container"
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-right border border-slate-100"
      >
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            id="close-modal-btn"
            className="absolute left-6 top-6 p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 inline-block mb-3">
            {product.price === 0 ? "دانلود مستقیم" : "خرید امن"}
          </span>
          <h3 className="text-xl font-bold leading-snug">{product.title}</h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center justify-start gap-1 font-mono">
            <span>{product.fileName}</span>
            <span>•</span>
            <span>{formatSize(product.fileSize)}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl mb-6">
            <span className="text-slate-500 text-sm">مبلغ قابل پرداخت:</span>
            <span className={`font-bold ${product.price === 0 ? "text-emerald-600" : "text-indigo-600"} text-lg`}>
              {formatPrice(product.price)}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 font-medium leading-relaxed">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">نام و نام خانوادگی <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد حسینی"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-right"
                />
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">شماره تماس (جهت پیگیری خرید) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09123456789"
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-right font-mono"
                />
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold mb-2">آدرس ایمیل (ارسال فاکتور و لینک) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-right font-mono"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
              با کلیک روی دکمه زیر، با قوانین استفاده از سایت و دریافت فایل‌های نهایی موافقت می‌کنید. لینک دانلود فایل برای اطلاعات وارد شده نیز ایمیل خواهد شد.
            </p>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                انصراف
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : product.price === 0 ? (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تایید و دانلود رایگان</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>انتقال به درگاه و خرید</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5" />
          <span>تراکنش‌های شما با پروتکل SSL کاملاً رمزنگاری شده و امن هستند.</span>
        </div>
      </motion.div>
    </div>
  );
}
