import React, { useState } from "react";
import { 
  X, 
  Send, 
  LifeBuoy, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  Hash, 
  Mail, 
  User, 
  Phone 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function SupportModal({ isOpen, onClose, showToast }: SupportModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("مشکل در دریافت/دانلود فایل");
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast("لطفا فیلدهای ستاره‌دار الزامی را تکمیل کنید.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject,
          transactionId: transactionId.trim(),
          message: message.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast(data.message || "تیکت با موفقیت ثبت شد", "success");
        setSubmittedTicketId(data.ticketId);
        // Reset form fields
        setName("");
        setEmail("");
        setPhone("");
        setSubject("مشکل در دریافت/دانلود فایل");
        setTransactionId("");
        setMessage("");
      } else {
        showToast(data.error || "خطا در ثبت تیکت پشتیبانی", "error");
      }
    } catch (err) {
      showToast("خطا در برقراری ارتباط با پورتال پشتیبانی", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-150 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <LifeBuoy className="w-5 h-5 text-indigo-200 shrink-0" />
              <div>
                <h3 className="text-sm font-black">پشتیبانی و گزارش مشکل در دریافت فایل</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">در اسرع وقت (کمتر از چند ساعت) به مشکل شما رسیدگی می‌شود</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/85"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form / Success view body */}
          <div className="p-6 overflow-y-auto space-y-4">
            
            {submittedTicketId ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-slate-800">تیکت پشتیبانی شما با موفقیت ثبت شد!</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    از شکیبایی شما سپاسگزاریم. پاسخ بررسی و رفع مشکل به آدرس ایمیل شما ارسال می‌شود.
                  </p>
                </div>
                
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl max-w-xs mx-auto font-mono text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold font-sans">کد رهگیری تیکت:</span>
                  <span className="select-all">{submittedTicketId.substring(0, 8).toUpperCase()}...</span>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSubmittedTicketId(null);
                      onClose();
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-indigo-650 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    بستن پنجره راهنما
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-650 block">
                      نام و نام‌خانوادگی <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: علی رضایی"
                        required
                        className="w-full pl-3 pr-9 py-2 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-hidden transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Email address */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-650 block">
                      ایمیل معتبر (پاسخ به این ایمیل ارسال می‌شود) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        required
                        dir="ltr"
                        className="w-full pl-3 pr-9 py-2 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-hidden transition-all text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Telephone / Phone number */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-650 block">
                      شماره موبایل (جهت هماهنگی پیامکی)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        dir="ltr"
                        className="w-full pl-3 pr-9 py-2 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-hidden transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Subject selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-650 block">
                      موضوع درخواست پشتیبانی <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-hidden transition-all h-[34px]"
                    >
                      <option value="مشکل در دریافت/دانلود فایل">مشکل در دریافت/دانلود فایل</option>
                      <option value="تراکنش ناموفق یا مغایرت بانکی">تراکنش ناموفق یا مغایرت بانکی</option>
                      <option value="سوال پیش از خرید">سوال پیش از خرید</option>
                      <option value="سایر موارد">سایر موارد</option>
                    </select>
                  </div>
                </div>

                {/* Optional Transaction ID / Tracking Code */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-650 block flex items-center justify-between">
                    <span>شماره تراکنش / کد پیگیری پرداخت دیجیتال (در صورت وجود)</span>
                    <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">اختیاری</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="مثال: TRX-1548742 یا شماره رهگیری بانکی"
                      className="w-full pl-3 pr-9 py-2 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-hidden transition-all text-slate-800"
                    />
                  </div>
                </div>

                {/* Message Text area details */}
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-slate-650 block">
                    توضیحات کامل مشکل یا موضوع درخواست <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="لطفا مشکل خود را به صورت روان بنویسید؛ مثلا: 'من محصول آموزش ری‌اکت را خریدم ولی دکمه دانلود بعد از بازگشت بانک کار نکرد' یا اطلاعات خرید خود را بفرستید."
                      rows={4}
                      required
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50/75 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-medium focus:outline-hidden transition-all text-slate-800 leading-relaxed resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-150 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></span>
                        <span>در حال ارسال تیکت پشتیبانی...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ثبت و ارسال گزارش به بخش پشتیبانی</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
