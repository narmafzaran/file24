import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  X, 
  Mail, 
  Phone, 
  User, 
  Hash, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  AlertCircle,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { SupportTicket } from "../types";

interface AdminTicketsPanelProps {
  getAuthHeaders: (extraHeaders?: Record<string, string>) => Record<string, string>;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  pendingTicketsCount?: number;
}

export default function AdminTicketsPanel({ getAuthHeaders, showToast }: AdminTicketsPanelProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  
  // Quick response state
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/tickets", {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok) {
        setTickets(data);
        // Initialize note editing dictionary
        const notesObj: Record<string, string> = {};
        data.forEach((t: SupportTicket) => {
          notesObj[t.id] = t.adminNote || "";
        });
        setEditNotes(notesObj);
      } else {
        showToast(data.error || "خطا در دریافت تیکت‌های پشتیبانی", "error");
      }
    } catch (err) {
      showToast("خطای سرور در برقراری ارتباط با پورتال تیکت‌ها", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (ticketId: string, status: 'pending' | 'resolved') => {
    setSubmittingIds(prev => ({ ...prev, [ticketId]: true }));
    try {
      const notesValue = editNotes[ticketId] || "";
      const response = await fetch(`/api/admin/tickets/${ticketId}/resolve`, {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          status,
          adminNote: notesValue
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showToast(resData.message || "وضعیت تیکت بروزرسانی شد", "success");
        // Update local state without full fetch to keep interface fast
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, adminNote: notesValue, updatedAt: new Date().toISOString() } : t));
      } else {
        showToast(resData.error || "خطا در بروزرسانی تیکت", "error");
      }
    } catch (err) {
      showToast("خطا در اعمال تغییرات روی سرور دیتابیس", "error");
    } finally {
      setSubmittingIds(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>بررسی و رفع مشکل شده</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-full animate-pulse">
            <Clock className="w-3.5 h-3.5 animate-spin animate-duration-10000" />
            <span>در انتظار حمایت ادمین</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="admin-tickets-container">
      
      {/* Search & Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3" dir="rtl">
        <div>
          <h3 className="text-sm font-black border-r-4 border-indigo-600 pr-3">رسیدگی به تیکت‌های پشتیبانی و شکایات کاربران</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">تعداد {(tickets.filter(t => t.status === "pending").length).toLocaleString("fa-IR")} تیکت حل‌نشده چشم‌به‌راه پاسخ می‌باشند</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl transition-all cursor-pointer"
            title="بروزرسانی تیکت‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-150 font-bold text-[11px] text-slate-600">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              همه ({(tickets.length).toLocaleString("fa-IR")})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'pending' ? 'bg-white text-rose-600 shadow-xs' : 'hover:text-slate-900'}`}
            >
              به انتظار پاسخ ({(tickets.filter(t => t.status === "pending").length).toLocaleString("fa-IR")})
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filter === 'resolved' ? 'bg-white text-emerald-600 shadow-xs' : 'hover:text-slate-900'}`}
            >
              بسته‌شده ({(tickets.filter(t => t.status === "resolved").length).toLocaleString("fa-IR")})
            </button>
          </div>
        </div>
      </div>

      {isLoading && tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-bold text-slate-650">در حال دریافت داده‌های پشتیبانی...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-450 space-y-3">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="text-sm font-black text-slate-700">هیچ تیکتی در این دسته‌بندی یافت نشد!</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">زمانی که کاربران در دریافت فایل‌ها با مشکل مواجه شوند، می‌توانند تیکت ثبت کنند و در این قسمت برای شما نمایش داده می‌شود.</p>
        </div>
      ) : (
        <div className="space-y-4" dir="rtl">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
            const isSubmitting = submittingIds[ticket.id] || false;
            
            return (
              <div 
                key={ticket.id} 
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? "border-indigo-200 ring-4 ring-indigo-50/50" : "border-slate-150 hover:border-slate-300"
                }`}
              >
                
                {/* Accordion Trigger row */}
                <div 
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 select-none text-right font-semibold"
                >
                  <div className="flex items-start gap-3.5 max-w-full sm:max-w-[70%]">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'
                    }`}>
                      <MessageSquare className="w-4.5 h-4.5" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">{ticket.subject}</h4>
                        <span className="text-[10px] text-slate-300 font-bold">•</span>
                        <span className="text-[10px] text-slate-400 font-bold">بایگانی {ticket.id.substring(0,6).toUpperCase()}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-bold">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>خاکسار: {ticket.name}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-300">|</span>
                        <span>تاریخ: {new Date(ticket.createdAt).toLocaleString("fa-IR")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(ticket.status)}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                </div>

                {/* Accordion content details */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-5 text-right font-medium text-xs leading-relaxed">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-150">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">آدرس پست الکترونیکی:</span>
                        <span className="text-slate-800 font-bold font-sans block select-all">{ticket.email}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">شماره تماس پیامکی:</span>
                        <span className="text-slate-850 font-bold block select-all" dir="ltr">{ticket.phone || "ثبت نشده"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block">لینک تراکنش ارسالی:</span>
                        <span className="text-indigo-600 font-bold max-w-full truncate block select-all">
                          {ticket.transactionId ? ticket.transactionId : "بدون ثبت تراکنش"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-150">
                      <span className="text-[10px] text-slate-400 font-bold block">شرح مشکل کاربر:</span>
                      <p className="text-slate-700 leading-relaxed font-sans select-all whitespace-pre-wrap">{ticket.message}</p>
                    </div>

                    {/* Actions and Internal Notes form */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <label className="text-[11px] font-extrabold text-slate-800 block">
                        مکاتبات خصوصی ادمین و وضعیت بررسی نهایی
                      </label>
                      <textarea
                        value={editNotes[ticket.id] || ""}
                        onChange={(e) => setEditNotes(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="در بخش یادداشت خصوصی بنویسید (نامه پاسخ، بررسی‌ها، رمز مجدد صادر شده و غیره) تا در مراجعات بعدی خودتان مطلع باشید."
                        rows={3}
                        className="w-full p-3 bg-white border border-slate-250 rounded-xl font-medium focus:outline-hidden text-slate-850 placeholder-slate-400 text-xs"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-[10px] text-slate-450">آخرین ویرایش: {new Date(ticket.updatedAt).toLocaleDateString("fa-IR")} ساعت {new Date(ticket.updatedAt).toLocaleTimeString("fa-IR")}</span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(ticket.id, "pending")}
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                              ticket.status === 'pending' 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200 cursor-not-allowed' 
                                : 'bg-slate-200 hover:bg-amber-100 hover:text-amber-800 border border-transparent'
                            }`}
                          >
                            بازگردانی به حالت در انتظار پاسخ
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(ticket.id, "resolved")}
                            disabled={isSubmitting}
                            className="px-5 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 select-none"
                          >
                            {isSubmitting ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            <span>ثبت یادداشت و حل تیکت (بستن)</span>
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
