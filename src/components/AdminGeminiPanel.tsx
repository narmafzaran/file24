import React, { useState, useEffect } from "react";
import { Key, Save, AlertCircle, CheckCircle2, Cpu, Sparkles, Globe, Image, FileCode, Upload } from "lucide-react";

interface AdminGeminiPanelProps {
  getAuthHeaders: (extra?: Record<string, string>) => Record<string, string>;
  showToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onSettingsSaved?: (siteTitle: string, faviconUrl: string) => void;
}

export default function AdminGeminiPanel({ getAuthHeaders, showToast, onSettingsSaved }: AdminGeminiPanelProps) {
  // Config states
  const [siteTitle, setSiteTitleState] = useState("");
  const [faviconUrl, setFaviconUrlState] = useState("");
  const [headerScript, setHeaderScriptState] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  const [hasEnvFallback, setHasEnvFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.geminiApiKey || "");
        setHasEnvFallback(!!data.hasEnvFallback);
        setSiteTitleState(data.siteTitle || "فروشگاه بزرگ فایل دیجیتال");
        setFaviconUrlState(data.faviconUrl || "/favicon.ico");
        setHeaderScriptState(data.headerScript || "");
      } else {
        showToast("خطا در بارگذاری تنظیمات سیستم", "error");
      }
    } catch (err) {
      showToast("خطا در اتصال به سرور جهت دریافت تنظیمات عمومی", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 1.5) { // 1.5MB limit
        showToast("حجم فایل فاوآیکون نباید بیشتر از ۱.۵ مگابایت باشد.", "warning");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFaviconUrlState(base64);
        showToast("فایل فاوآیکون بارگذاری شد. جهت ذخیره نهایی دکمه ذخیره زیر را کلیک کنید.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          geminiApiKey: apiKey.trim(),
          siteTitle: siteTitle.trim(),
          faviconUrl: faviconUrl.trim(),
          headerScript: headerScript
        })
      });

      if (response.ok) {
        showToast("تنظیمات عمومی و سیستمی با موفقیت در دیتابیس لوکال سرور ذخیره شد.", "success");
        if (onSettingsSaved) {
          onSettingsSaved(siteTitle.trim(), faviconUrl.trim());
        }
        fetchConfig();
      } else {
        showToast("خطا در ذخیره‌سازی تنظیمات وب‌سایت", "error");
      }
    } catch (err) {
      showToast("خطا در اتصال به سرور جهت ذخیره‌سازی اطلاعات", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 text-right">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <span>تنظیمات عمومی، سئو و سیستم وب‌سایت</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            پیکربندی کامل مشخصات ظاهری پورتال، فاوآیکون، اسکریپت‌های تزریقی هدر (GSC) و کلید موتور هوش مصنوعی Gemini
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse hidden sm:block shrink-0" />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-[10px] text-slate-400 font-bold">در حال بازیابی اطلاعات گوناگون از سرور...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Title & Favicon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Site Title */}
            <div className="space-y-2">
              <label className="block text-slate-700 text-xs font-black flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>عنوان عمومی وب‌سایت (Site Title)</span>
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitleState(e.target.value)}
                placeholder="مثال: فروشگاه بزرگ فایل دیجیتال"
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold focus:outline-hidden transition-all text-slate-800"
                required
              />
              <p className="text-[9.5px] text-slate-400 leading-relaxed">
                این عبارت به عنوان برند اصلی در هدر بالای سایت، تب‌های مرورگر و متون خروجی فاکتورها درج خواهد شد.
              </p>
            </div>

            {/* Favicon URL / Upload */}
            <div className="space-y-2">
              <label className="block text-slate-700 text-xs font-black flex items-center gap-1.5">
                <Image className="w-4 h-4 text-indigo-500" />
                <span>آیکون کوچک مرورگر (Favicon)</span>
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrlState(e.target.value)}
                    placeholder="https://example.com/favicon.png یا داده Base64"
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-[10.5px] font-mono focus:outline-hidden transition-all text-slate-700"
                  />
                </div>
                
                {/* Upload Action Button */}
                <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0">
                  <Upload className="w-4 h-4 text-slate-650" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                </label>

                {/* Micro Favicon Preview */}
                {faviconUrl && (
                  <div className="w-10.5 h-10.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                    <img 
                      src={faviconUrl} 
                      alt="favicon preview" 
                      className="w-6 h-6 object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
                      }}
                    />
                  </div>
                )}
              </div>
              <p className="text-[9.5px] text-slate-400 leading-relaxed">
                می‌توانید آدرس اینترنتی یک عکس یا فایل فاوآیکون را وارد کرده و یا مستقیماً یک فایل تصویری را از لپ‌تاپ خود آپلود نمایید.
              </p>
            </div>

          </div>

          {/* Section 2: Header Script Injection */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label className="block text-slate-700 text-xs font-black flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-indigo-500" />
              <span>تزریق کد و تگ سفارشی به هدر (Header HTML/Scripts Verification)</span>
            </label>
            <textarea
              value={headerScript}
              onChange={(e) => setHeaderScriptState(e.target.value)}
              placeholder="&lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;&#10;&lt;script&gt;console.log('Hello from GSC');&lt;/script&gt;"
              dir="ltr"
              rows={4}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-850 hover:bg-black/95 focus:bg-black/95 rounded-xl text-xs font-mono text-emerald-400 focus:outline-hidden transition-all leading-normal shadow-inner"
            />
            <p className="text-[9.5px] text-slate-400 leading-relaxed">
              جهت احراز مالکیت سایت در گوگل سرور کنسول (Google Search Console)، قرار دادن تگ‌های متای مربوطه، کدهای گوگل آنالیتیکس یا کدهای رهگیری کاربران، تگ‌های خود را مستقیماً در این جعبه کپی نمایید. این کدها در بارگذاری ابتدایی به هدر صفحه ترانزیت خواهند شد.
            </p>
          </div>

          {/* Section 3: Gemini API Key Config */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="space-y-2">
              <label className="block text-slate-700 text-xs font-black flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-500" />
                <span>کلید اختصاصی هوش مصنوعی (Gemini API Key)</span>
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasEnvFallback ? "از کلید پیش‌فرض داخل فایل .env دایرکتوری سرور استفاده می‌شود" : "AI Studio / Cloud Console API Key (e.g. AIzaSy...)"}
                  dir="ltr"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono font-bold tracking-wider focus:outline-hidden transition-all text-slate-800"
                />
              </div>
              <p className="text-[9.5px] text-slate-400 leading-normal">
                اگر مایلید سیستم تولید محتوای هوشمند کالاها و ارزیابی عاری از محدودیت باشد، توکن اختصاصی از گوگل هوش مصنوعی را وارد بفرمایید. در صورت خالی بودن، به متغیر ثابت سرور تکیه می‌شود.
              </p>
            </div>

            {/* Info Badge */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
              <span className="text-slate-400">وضعیت کلید پیش‌فرض سروری:</span>
              {hasEnvFallback ? (
                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-sm border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  فعال و موجود در بستر میزبان (.env)
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-sm border border-amber-100">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  بدون متغیر محیطی ست‌شده
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-start">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-md shadow-indigo-100"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>در حال ذخیره‌سازی و پیکربندی سیستم...</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>ذخیره نهایی تمامی تغییرات سایت</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
