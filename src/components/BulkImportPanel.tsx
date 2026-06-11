import React, { useState, useRef } from "react";
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Trash2, 
  Database,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";
import { Category, Product } from "../types";

// Helper to convert Persian/Arabic numerals to English
const convertPersianToEnglishNumbers = (str: string): string => {
  const p = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const a = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(p[i], "g"), i.toString());
    result = result.replace(new RegExp(a[i], "g"), i.toString());
  }
  return result;
};

// Safe price parser (handles comma separators and Persian text like "تومان" or "ریال")
const parseNumericPrice = (value: string): number => {
  if (!value) return 0;
  let normalized = convertPersianToEnglishNumbers(value);
  // Remove non-digits (excluding dots if they define decimal part, but prices are normally integers in Tomans)
  normalized = normalized.replace(/[^0-9]/g, "");
  const num = parseInt(normalized, 10);
  return isNaN(num) ? 0 : num;
};

interface BulkImportPanelProps {
  categories: Category[];
  getAuthHeaders: (extraHeaders?: Record<string, string>) => Record<string, string>;
  onSuccess: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

interface ParsedProduct {
  title: string;
  description: string;
  price: number;
  category: string;
  fileName: string;
  imageUrl: string;
}

export default function BulkImportPanel({ categories, getAuthHeaders, onSuccess, showToast }: BulkImportPanelProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("other");
  const [showHelp, setShowHelp] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested columns: Title, Description, Price, Category, FileName
  const csvTemplateText = `عنوان,توضیحات,قیمت به تومان,دسته‌بندی,نام فایل محصول\nکتاب آموزش برنامه‌نویسی ری‌اکت,کتاب جامع آموزش جامع React 19 به همراه مثال کاربردی,120000,کتاب,react_tutorial.pdf\nقالب فروشگاهی وردپرس دیجی‌کد,پوسته فوق حرفه‌ای با سرعت عالی و ریسپانسیو,350000,قالب,digicode-theme.zip\nدوره جامع آموزش جاوااسکریپت,دوره کامل ویدیویی جاوااسکریپت از مقدماتی تا فوق پیشرفته,290000,ویدیو,js_course.zip`;

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(csvTemplateText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Find category ID based on matched Persian text
  const detectCategory = (catStr: string): string => {
    if (!catStr) return defaultCategory;
    const cleanStr = catStr.trim().toLowerCase();

    // Map exact or partial Persian matches
    if (cleanStr.includes("کد") || cleanStr.includes("اسکریپت") || cleanStr.includes("برنامه") || cleanStr.includes("script") || cleanStr.includes("code")) {
      return "script";
    }
    if (cleanStr.includes("قالب") || cleanStr.includes("گرافیک") || cleanStr.includes("طراحی") || cleanStr.includes("template")) {
      return "template";
    }
    if (cleanStr.includes("کتاب") || cleanStr.includes("pdf") || cleanStr.includes("آموزش") || cleanStr.includes("book") || cleanStr.endsWith("txt")) {
      return "book";
    }
    if (cleanStr.includes("ویدیو") || cleanStr.includes("فیلم") || cleanStr.includes("دوره") || cleanStr.includes("video") || cleanStr.includes("course")) {
      return "video";
    }
    
    // Check if it exactly matches any existing category ID
    const found = categories.find(c => c.id === cleanStr || c.slug === cleanStr || c.label.includes(cleanStr));
    if (found) return found.id;

    return defaultCategory;
  };

  // Parsers standard CSV or TSV lines
  const parseData = (rawText: string) => {
    if (!rawText.trim()) {
      setParsedProducts([]);
      return;
    }

    const lines = rawText.split(/\r?\n/);
    if (lines.length === 0) return;

    // Detect separator: Tab for Excel paste, comma or semicolon for CSV
    let separator = ",";
    const firstLine = lines[0];
    if (firstLine.includes("\t")) {
      separator = "\t";
    } else if (firstLine.includes(";")) {
      separator = ";";
    }

    const productsList: ParsedProduct[] = [];

    // Parse loop (starting from 1 if it has header row, we check if first line represents header)
    const hasHeader = firstLine.toLowerCase().includes("title") || 
                      firstLine.includes("عنوان") || 
                      firstLine.includes("توضیحات") || 
                      firstLine.includes("قیمت") ||
                      firstLine.includes("نامه") ||
                      firstLine.includes("\t"); // Excel paste usually comes with headers if copied whole rows

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes in standard CSV parser format
      let columns: string[] = [];
      if (separator === "\t") {
        columns = line.split("\t");
      } else {
        // Robust CSV splitter for comma/semicolon respecting quotes
        let currentField = "";
        let inQuotes = false;
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === separator && !inQuotes) {
            columns.push(currentField);
            currentField = "";
          } else {
            currentField += char;
          }
        }
        columns.push(currentField);
      }

      // Safe clean columns
      const cols = columns.map(col => {
        let val = col.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).trim();
        }
        return val;
      });

      // Map columns: Title (0), Description (1), Price (2), Category (3), FileName (4)
      const title = cols[0] || "";
      const description = cols[1] || "";
      const priceRaw = cols[2] || "";
      const categoryRaw = cols[3] || "";
      const fileNameRaw = cols[4] || "";

      if (!title) continue; // Title must be present

      const parsedPrice = parseNumericPrice(priceRaw);
      const categoryId = detectCategory(categoryRaw);
      const cleanFileName = fileNameRaw ? fileNameRaw.trim() : `${title.trim()}.zip`;

      productsList.push({
        title: title.trim(),
        description: description.trim() || `توضیحات پیش‌فرض محصول ${title.trim()}`,
        price: parsedPrice,
        category: categoryId,
        fileName: cleanFileName,
        imageUrl: "" // empty URL by default as requested by user, easily editable later
      });
    }

    setParsedProducts(productsList);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteText(text);
    parseData(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPasteText(content);
        parseData(content);
        showToast("فایل با موفقیت بازخوانی و تحلیل شد", "success");
      }
    };
    reader.onerror = () => {
      showToast("خطا در خواندن فایل بارگذاری شده", "error");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv") && !file.name.endsWith(".txt") && !file.name.endsWith(".tsv")) {
      showToast("لطفا تنها فایل‌های متنی CSV، TSV یا TXT بارگذاری کنید", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPasteText(content);
        parseData(content);
        showToast("فایل کشیده شده با موفقیت تحلیل شد", "success");
      }
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setPasteText("");
    setParsedProducts([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkImportSubmit = async () => {
    if (parsedProducts.length === 0) {
      showToast("هیچ محصول معتبری برای درون‌ریزی شناسایی نشده است.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/products/bulk", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          products: parsedProducts
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showToast(resData.message || "درون‌ریزی محصولات با موفقیت انجام شد.", "success");
        clearData();
        onSuccess(); // Refresh products list
      } else {
        showToast(resData.error || "خطا در برقراری ارتباط با پورتال پشتیبانی", "error");
      }
    } catch (err: any) {
      showToast("خطای سیستم در درون‌ریزی محصولات به دیتابیس", "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6" id="bulk-import-container">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="text-sm font-black border-r-4 border-indigo-600 pr-3">درون‌ریزی انبوه ۳۰۰+ فایل و محصول از اکسل</h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-indigo-650 hover:text-indigo-805 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showHelp ? "بستن راهنما" : "راهنمای اکسل و ستون‌ها"}</span>
        </button>
      </div>

      {showHelp && (
        <div className="p-4 bg-indigo-50/75 border border-indigo-100 rounded-xl text-xs text-indigo-950 space-y-3 leading-relaxed animate-fade-in animate-duration-300">
          <p className="font-bold text-[13px]">💡 راهنمای کپی-پیست از اکسل یا فایل CSV:</p>
          <ul className="list-disc list-inside space-y-1.5 font-medium leading-relaxed pr-2">
            <li>شما می‌توانید به راحتی تمام سلول‌های اکسل خود را انتخاب کنید (تعداد 300+ ردیف) و مستقیم آن‌ها را در جعبه متن زیر **کپی-پیست (Ctrl+V)** کنید!</li>
            <li>برای نتایج ایده‌آل، ترتیب ستون‌های اکسل خود را به این شیوه مرتب نمایید:
              <span className="block font-bold text-indigo-705 mt-1 font-mono text-[11px] bg-white border border-indigo-100 p-1.5 rounded-lg text-center" dir="ltr">
                [عنوان محصول] | [توضیحات] | [قیمت به تومان] | [نام دسته‌بندی] | [نام فایل زیپ پس از خرید]
              </span>
            </li>
            <li>**نحوه بارگذاری عکس‌ها:** به علت محدودیت‌های اکسل، تمام عکس‌های محصولات در زمان درون‌ریزی ابتدا **خالی و با پس‌زمینه پیش‌فرض** تعبیه می‌شوند. شما بلافاصله پس از اتمام درون‌ریزی، می‌توانید از تب "تعریف و ویرایش فایل" گزینه ویرایش هر فایل را زده و عکس یا فایل مرجع واقعی آن را بارگذاری کنید.</li>
            <li>سیستم به طور هوشمند عبارات دسته‌بندی اکسل شما را تحلیل می‌کند (مثل کلمه کتاب، ویدیو، قالب و...) و در دسته‌بندی‌های متناظر فروشگاه قرار می‌دهد.</li>
          </ul>

          <div className="flex gap-2.5 items-center mt-3 pt-3 border-t border-indigo-100">
            <button
              onClick={copyTemplateToClipboard}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all"
            >
              {copiedTemplate ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>کپی نمونه متنی استاندارد</span>
            </button>
            <span className="text-[10px] text-slate-500">برای آزمایش، نمونه را کپی کرده و در کارد زیر پیس کنید تا خروجی دقیق را ملاحظه نمایید!</span>
          </div>
        </div>
      )}

      {/* Main Drag-drop and Paste block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Input box */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">متن اکسل یا فایل متنی را وارد کنید</span>
            <span className="text-[10px] text-slate-400">Excel Cells (TSV) / CSV supported</span>
          </div>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed transition-all p-1 ${
              dragOver ? "border-indigo-600 bg-indigo-50/25" : "border-slate-200 bg-white"
            }`}
          >
            <textarea
              value={pasteText}
              onChange={handlePasteChange}
              placeholder="سلول‌های دلخواه اکسل خود را انتخاب و کپی کرده، سپس اینجا پیست کنید... یا فایل CSV استاندارد را رها کنید"
              className="w-full h-64 p-4 text-xs font-medium focus:outline-hidden resize-none text-slate-800 leading-relaxed font-sans placeholder-slate-400"
              dir="auto"
            />
            {dragOver && (
              <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-indigo-700 pointer-events-none">
                <Upload className="w-10 h-10 animate-bounce" />
                <span className="text-xs font-bold mt-2">رها کنید تا محصولات تحلیل شوند</span>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 items-center justify-between">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                id="excel-csv-file-picker"
                accept=".csv, .tsv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>انتخاب فایل CSV/متنی</span>
              </button>

              {pasteText && (
                <button
                  type="button"
                  onClick={clearData}
                  className="px-3 py-2 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  پاکسازی کل داده‌ها
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold">دسته‌بندی پیش‌فرض:</span>
              <select
                value={defaultCategory}
                onChange={(e) => {
                  setDefaultCategory(e.target.value);
                  // Refresh parsing with updated fallback category
                  if (pasteText) parseData(pasteText);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-hidden"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview block */}
        <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>پیش‌نمایش محصولات تحلیل شده ({parsedProducts.length.toLocaleString("fa-IR")} ردیف)</span>
              </h4>
              {parsedProducts.length > 0 && (
                <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">قابل ثبت</span>
              )}
            </div>

            {parsedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                <Database className="w-10 h-10 text-slate-300 animate-pulse" />
                <p className="text-xs font-bold text-slate-500">هیچ محصولی آماده ثبت نیست</p>
                <p className="text-[10px] leading-relaxed max-w-xs text-slate-400">یکی از فایل‌های خود را آپلود کنید یا متن نمونه را بالا کپی کرده و پیست کنید تا ردیف‌های درون‌ریزی شده را در جدول مشاهده نمایید.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto max-h-[220px] rounded-xl border border-slate-150 select-text">
                  <table className="w-full text-right text-[11px] border-collapse bg-white">
                    <thead className="sticky top-0 bg-slate-100 z-10">
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="p-2 text-right">عنوان</th>
                        <th className="p-2 text-right">قیمت به تومان</th>
                        <th className="p-2 text-right">دسته‌بندی</th>
                        <th className="p-2 text-right">فایل مرجع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                      {parsedProducts.slice(0, 10).map((prod, index) => {
                        const catObj = categories.find(c => c.id === prod.category);
                        return (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-2 text-slate-900 max-w-[120px] truncate">{prod.title}</td>
                            <td className="p-2 font-mono text-indigo-600">{(prod.price || 0).toLocaleString("fa-IR")} تومان</td>
                            <td className="p-2 text-slate-500 text-[10px]">{catObj?.label || prod.category}</td>
                            <td className="p-2 font-mono text-slate-400 text-[10px] truncate max-w-[100px]">{prod.fileName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {parsedProducts.length > 10 && (
                  <p className="text-[10px] text-slate-400 font-medium text-center">
                    ... و تعداد {(parsedProducts.length - 10).toLocaleString("fa-IR")} ردیف دیگر (پیش‌نمایش تنها ۱۰ ردیف اول را نشان می‌دهد)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Confirm Button */}
          {parsedProducts.length > 0 && (
            <div className="border-t border-slate-150 pt-4 mt-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-right space-y-0.5">
                <span className="text-[10px] text-slate-430 block font-bold">مجموع محصولات آماده:</span>
                <span className="text-sm font-black text-slate-900 block font-sans">
                  {parsedProducts.length.toLocaleString("fa-IR")} محصول جدید
                </span>
              </div>
              <button
                type="button"
                onClick={handleBulkImportSubmit}
                disabled={isImporting}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white hover:shadow-indigo-150 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></span>
                    <span>در حال افزودن به دیتابیس...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4.5 h-4.5" />
                    <span>تایید نهایی و اضافه شدن به فروشگاه</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
