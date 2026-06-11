import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  Download, 
  CreditCard, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  CheckCircle, 
  TrendingUp, 
  HardDrive, 
  Search, 
  Save, 
  FileText, 
  X,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronDown,
  FileCheck,
  ShieldCheck,
  Zap,
  Sparkles,
  Info,
  LifeBuoy,
  MessageSquare
} from "lucide-react";
import { Product, Category, AdminMetrics, Transaction, DownloadLog, SupportTicket } from "./types";
import SimulatedPayment from "./components/SimulatedPayment";
import BulkImportPanel from "./components/BulkImportPanel";
import SupportModal from "./components/SupportModal";
import AdminTicketsPanel from "./components/AdminTicketsPanel";
import AdminGeminiPanel from "./components/AdminGeminiPanel";

export default function App() {
  // Navigation states: 'store' or 'admin'
  const [currentSection, setCurrentSection] = useState<'store' | 'admin'>('store');
  // Store navigation states: 'listing' or 'detail'
  const [storeView, setStoreView] = useState<'listing' | 'detail'>('listing');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Database lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  // Admin section state management
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'products' | 'categories' | 'logs' | 'bulk-import' | 'support-tickets' | 'gemini-config'>('dashboard');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Create / Edit Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<string>("script");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; data: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiIncludeQAs, setAiIncludeQAs] = useState(false);
  const [aiIncludeTable, setAiIncludeTable] = useState(false);

  // Customizable settings states
  const [siteTitle, setSiteTitle] = useState("فروشگاه بزرگ فایل دیجیتال");
  const [faviconUrl, setFaviconUrl] = useState("/favicon.ico");
  const [headerScript, setHeaderScript] = useState("");

  // Category manager form state
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [catFormError, setCatFormError] = useState("");

  // Admin access lock
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem("admin_token") || "");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => !!localStorage.getItem("admin_token"));
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = { ...extraHeaders };
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }
    return headers;
  };

  // Checkout inputs inside Product Detail Sidebar
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Flow State for active transaction simulation
  const [activePurchase, setActivePurchase] = useState<{
    status: string;
    downloadToken?: string;
    productId: string;
    transactionId?: string;
    price: number;
    productTitle: string;
  } | null>(null);

  // Store Front layout controls (Category & Search)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>("all");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        return data;
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
    return [];
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !formCategory) {
          setFormCategory(data[0].id);
        }
        return data;
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
    return [];
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/metrics", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching admin metrics:", err);
    }
  };

  // Pure Address-Bar URL Router synchronization
  const syncPath = (prodsList: Product[], catsList: Category[]) => {
    let path = "";
    try {
      path = decodeURIComponent(window.location.pathname).replace(/^\/+/g, ''); // slice duplicate/leading slashes
    } catch (e) {
      path = window.location.pathname.replace(/^\/+/g, '');
    }
    if (!path) {
      setStoreView('listing');
      setSelectedCategory('all');
      setSelectedProduct(null);
      setCurrentSection('store');
      return;
    }

    if (path === "admin") {
      setCurrentSection('admin');
      setIsAdminUnlocked(false); // keep protection prompt active initially
      return;
    }

    // Try matching dynamic category slugs
    const matchedCat = catsList.find(c => c.slug === path);
    if (matchedCat) {
      setStoreView('listing');
      setSelectedCategory(matchedCat.id);
      setSelectedProduct(null);
      setCurrentSection('store');
      return;
    }

    // Clean product prefix paths if entered
    const cleanProductSlug = path.startsWith('product/') 
      ? path.replace('product/', '') 
      : path.startsWith('p/') 
        ? path.replace('p/', '') 
        : path;

    const matchedProd = prodsList.find(p => p.slug === cleanProductSlug || p.id === cleanProductSlug);
    if (matchedProd) {
      setSelectedProduct(matchedProd);
      setStoreView('detail');
      setCurrentSection('store');
      return;
    }

    // If typing custom code / not matching anything
    setStoreView('listing');
    setSelectedCategory('all');
    setSelectedProduct(null);
    setCurrentSection('store');
  };

  const navigateTo = (toPath: string) => {
    window.history.pushState(null, "", toPath);
    syncPath(products, categories);
  };

  const loadData = async () => {
    const prods = await fetchProducts();
    const cats = await fetchCategories();
    syncPath(prods, cats);

    // Fetch site dynamic settings
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const s = await res.json();
        if (s.siteTitle) setSiteTitle(s.siteTitle);
        if (s.faviconUrl) {
          setFaviconUrl(s.faviconUrl);
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = s.faviconUrl;
        }
        if (s.headerScript) {
          setHeaderScript(s.headerScript);
          
          // Remove previous dynamic script injection container if exists to prevent accumulation
          const oldContainer = document.getElementById("dynamic-header-scripts");
          if (oldContainer) oldContainer.remove();
          
          const container = document.createElement("div");
          container.id = "dynamic-header-scripts";
          container.style.display = "none";
          container.innerHTML = s.headerScript;
          document.head.appendChild(container);
          
          // Execute any nested SCRIPT elements
          const scripts = container.getElementsByTagName("script");
          for (let i = 0; i < scripts.length ; i++) {
            const sc = document.createElement("script");
            sc.text = scripts[i].text;
            Array.from(scripts[i].attributes).forEach(attr => {
              sc.setAttribute(attr.name, attr.value);
            });
            document.head.appendChild(sc);
          }
        }
      }
    } catch (e) {
      console.error("Error loading customizable settings:", e);
    }
  };

  useEffect(() => {
    loadData();
    fetchMetrics();
    const timer = setInterval(() => {
      fetchMetrics();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      syncPath(products, categories);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products, categories]);

  // SEO optimization: update document title and inject JSON-LD core schema for Product
  useEffect(() => {
    // 1. Manage Dynamic Title
    if (currentSection === 'admin') {
      document.title = `پنل مدیریت و شبیه‌ساز تراکنش‌ها | ${siteTitle}`;
    } else if (storeView === 'detail' && selectedProduct) {
      document.title = `${selectedProduct.title} | قیمت و دانلود فوری فایل | ${siteTitle}`;
    } else if (selectedCategory && selectedCategory !== 'all') {
      const cat = categories.find(c => c.id === selectedCategory);
      document.title = cat ? `دانلود جدیدترین فایل‌های ${cat.label} | ${siteTitle}` : siteTitle;
    } else {
      document.title = `${siteTitle} | پورتال فروش فایل، کتاب، فیلم و کدهای کاربردی`;
    }

    // 2. Manage JSON-LD Script tag for Search Engines
    const existingScript = document.getElementById("product-jsonld-schema");
    if (existingScript) {
      existingScript.remove();
    }

    if (storeView === 'detail' && selectedProduct) {
      const script = document.createElement("script");
      script.id = "product-jsonld-schema";
      script.type = "application/ld+json";
      
      const categoryLabel = getCategoryLabel(selectedProduct.category);
      const hostUrl = window.location.origin;
      const productUrl = `${hostUrl}/${selectedProduct.slug || selectedProduct.id}`;

      const schemaData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": selectedProduct.title,
        "image": selectedProduct.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        "description": selectedProduct.description || `دانلود فوری فایل ${selectedProduct.title} با کیفیت عالی و لینک مستقیم`,
        "sku": selectedProduct.id,
        "offers": {
          "@type": "Offer",
          "url": productUrl,
          "priceCurrency": "IRR",
          "price": selectedProduct.price > 0 ? selectedProduct.price * 10 : 0, // Convert Toman to Rial
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": selectedProduct.price,
            "priceCurrency": "IRT", // Toman
            "valueAddedTaxIncluded": true
          },
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": "فایل‌شاپ - مرجع فایل‌های کاربردی"
          }
        },
        "category": categoryLabel
      };

      script.textContent = JSON.stringify(schemaData);
      document.head.appendChild(script);
    }

    return () => {
      const cleanupScript = document.getElementById("product-jsonld-schema");
      if (cleanupScript) {
        cleanupScript.remove();
      }
    };
  }, [selectedProduct, storeView, selectedCategory, currentSection, categories]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getCategoryLabel = (catId?: string) => {
    const matched = categories.find(c => c.id === catId || c.slug === catId);
    if (matched) return matched.label;
    switch (catId) {
      case "script": return "کد و اسکریپت";
      case "template": return "قالب و گرافیک";
      case "book": return "آموزش و کتاب";
      case "video": return "دوره و ویدیو";
      case "other": return "سایر فایل‌ها";
      default: return "طراحی و توسعه";
    }
  };

  // Drag & drop file operations
  const processFile = (file: File) => {
    if (file.size > 90 * 1024 * 1024) {
      setFormError("حجم فایل فراتر از ۹۰ مگابایت است. لطفاً فایل کوچک‌تری برگزینید.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        data: reader.result as string
      });
      setFormError("");
    };
    reader.onerror = () => {
      setFormError("خطا در بارگذاری اولیه فایل");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIProduct = async () => {
    if (!formTitle.trim()) {
      showToast("لطفا ابتدا عنوان فایل را وارد نمایید تا هوش مصنوعی بر پایه آن محتوا تولید کند.", "error");
      return;
    }
    
    setIsGeneratingAI(true);
    showToast("در حال نگارش و آماده‌سازی محتوای هوشمند توسط هوش مصنوعی Gemini...", "info");

    try {
      const response = await fetch("/api/admin/generate-product-details", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          title: formTitle.trim(),
          categories: categories.map(c => ({ id: c.id, label: c.label })),
          includeQAs: aiIncludeQAs,
          includeTable: aiIncludeTable
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFormDescription(data.description || "");
        setFormPrice(Number(data.price) || 0);
        setFormCategory(data.category || "other");
        setFormSlug(data.slug || "");
        
        showToast("مشخصات و محتوای متنی محصول با موفقیت توسط هوش مصنوعی Gemini نگارش و تنظیم گردید!", "success");
      } else {
        showToast(data.error || "خطا در تولید محتوای محصول با هوش مصنوعی", "error");
      }
    } catch (err) {
      showToast("خطای اتصال به سرور هوش مصنوعی", "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError("");

    if (!newCatLabel.trim() || !newCatSlug.trim()) {
      setCatFormError("پر کردن تمامی فیلدها الزامی است");
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          label: newCatLabel.trim(),
          slug: newCatSlug.trim()
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        setCatFormError(resData.error || "خطایی در ثبت دسته‌بندی رخ داد");
        return;
      }

      // Success
      setNewCatLabel("");
      setNewCatSlug("");
      fetchCategories();
    } catch (err: any) {
      setCatFormError("ارتباط با سرور برقرار نشد");
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (["script", "template", "book", "video", "other"].includes(catId)) {
      alert("دسته‌بندی‌های پیش‌فرض سیستم قابل حذف نیستند");
      return;
    }

    if (!confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${catId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      const resData = await response.json();
      if (!response.ok) {
        alert(resData.error || "خطا در حذف دسته‌بندی");
        return;
      }

      fetchCategories();
    } catch (err: any) {
      alert("خطا در برقراری ارتباط با سرور برای حذف دسته‌بندی");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim() || !formDescription.trim()) {
      setFormError("پر کردن تمامی بخش‌های ستاره‌دار الزامی است");
      return;
    }
    if (!isEditing && !uploadedFile) {
      setFormError("بارگذاری فایل فیزیکی نهایی الزامی است");
      return;
    }

    try {
      const endpoint = isEditing ? `/api/products/${editId}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const payload: any = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        imageUrl: formImageUrl.trim(),
        category: formCategory,
        slug: formSlug.trim()
      };

      if (uploadedFile) {
        payload.fileName = uploadedFile.name;
        payload.fileSize = uploadedFile.size;
        payload.fileData = uploadedFile.data;
      }

      const res = await fetch(endpoint, {
        method,
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطایی بروز کرد");

      showToast(isEditing ? "اطلاعات فایل با موفقیت تغییر کرد" : "فایل جدید با موفقیت به سیستم اضافه شد");
      
      // Cleanup States
      setFormTitle("");
      setFormCategory(categories.length > 0 ? categories[0].id : "script");
      setFormDescription("");
      setFormPrice(0);
      setUploadedFile(null);
      setFormImageUrl("");
      setFormSlug("");
      setIsEditing(false);
      setEditId(null);
      
      fetchProducts();
      fetchMetrics();
    } catch (err: any) {
      setFormError(err.message || "خطا در برقراری ارتباط");
    }
  };

  const startEditProduct = (prod: Product) => {
    setIsEditing(true);
    setEditId(prod.id);
    setFormTitle(prod.title);
    setFormCategory(prod.category || "other");
    setFormDescription(prod.description);
    setFormPrice(prod.price);
    setUploadedFile(null);
    setFormImageUrl(prod.imageUrl || "");
    setFormSlug(prod.slug || "");
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast("فایل مرجع با موفقیت حذف گردید", "info");
        fetchProducts();
        fetchMetrics();
        if (selectedProduct?.id === id) {
          setSelectedProduct(null);
          setStoreView('listing');
        }
      } else {
        showToast("خطا در فرآیند حذف فایل از سرور", "error");
      }
    } catch (err) {
      showToast("خطا در فرآیند حذف", "error");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Secure instant checkout form submission (Product page checkout form)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    if (!selectedProduct) return;

    // Direct phone validation
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(userPhone)) {
      setCheckoutError("شماره همراه معتبر وارد کنید (مثال: 09123456789)");
      return;
    }

    if (!userName.trim() || userName.length < 3) {
      setCheckoutError("لطفاً نام و نام خانوادگی خود را کامل وارد کنید");
      return;
    }

    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          userName: userName.trim(),
          userPhone,
          userEmail: userEmail.trim() || `${userPhone}@filestore.com`
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "تراکنش ناموفق بود");

      setActivePurchase({
        status: resData.status,
        downloadToken: resData.downloadToken,
        productId: selectedProduct.id,
        transactionId: resData.transactionId,
        price: selectedProduct.price,
        productTitle: selectedProduct.title
      });

    } catch (err: any) {
      setCheckoutError(err.message || "خطا در سامانه خرید آنلاین");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentCallback = (success: boolean, downloadToken?: string) => {
    if (success && downloadToken && activePurchase) {
      setActivePurchase({
        ...activePurchase,
        status: "completed",
        downloadToken
      });
      showToast("پرداخت شبیه‌سازی‌شده تأیید شد! در حال انتقال فایل...", "success");
      fetchProducts();
      fetchMetrics();
    } else {
      setActivePurchase(null);
      showToast("پرداخت لغو شد یا کارت نامعتبر بود.", "error");
    }
  };

  const triggerDownload = (productId: string, token: string) => {
    window.open(`/api/download-file/${productId}?token=${token}`, "_blank");
  };

  const unlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      showToast("لطفا نام کاربری و کلمه عبور را وارد کنید", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminToken(data.token);
        localStorage.setItem("admin_token", data.token);
        setIsAdminUnlocked(true);
        setAdminPassword("");
        setAdminUsername("");
        showToast("ورود به سیستم مدیریت با موفقیت انجام شد", "success");
      } else {
        showToast(data.error || "نام کاربری یا رمز عبور اشتباه است", "error");
      }
    } catch (err: any) {
      showToast("خطا در برقراری ارتباط با سرور", "error");
    }
  };

  // Filters calculation
  const getFilteredProducts = () => {
    return products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
      const matchesPriceFilter = selectedPriceFilter === "all" ||
                                 (selectedPriceFilter === "free" && p.price === 0) ||
                                 (selectedPriceFilter === "paid" && p.price > 0);
      return matchesSearch && matchesCategory && matchesPriceFilter;
    });
  };

  const renderProductCover = (prod: Product, hClass = "h-44") => {
    // Dynamic clean fallback gradients with custom design colors based on ID hash
    const fallbackGradients = [
      "from-indigo-600 via-indigo-700 to-purple-800",
      "from-slate-800 via-slate-900 to-indigo-950",
      "from-teal-600 via-emerald-700 to-cyan-800",
      "from-amber-600 via-rose-700 to-orange-850",
      "from-sky-700 via-blue-800 to-purple-950"
    ];
    const index = Math.abs(prod.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % fallbackGradients.length;
    const gradient = fallbackGradients[index];

    return (
      <div className={`relative ${hClass} w-full bg-slate-55 border-b border-slate-100 flex items-center justify-center p-3 overflow-hidden group`}>
        {/* Centered vertical rectangle (portrait aspect ratio) */}
        <div className="h-full aspect-[2.8/4] rounded-xl overflow-hidden shadow-sm border border-slate-200/90 bg-white relative transition-all duration-500 group-hover:scale-105 group-hover:shadow-md">
          {prod.imageUrl && prod.imageUrl.trim().length > 0 ? (
            <img 
              src={prod.imageUrl} 
              alt={prod.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-tr ${gradient} flex flex-col justify-between p-3.5 text-white/90 text-right`}>
              <div className="flex justify-between items-center w-full">
                <div className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded flex items-center justify-center font-mono text-[8px] uppercase font-bold text-white">
                  {prod.fileName.split('.').pop()?.substring(0, 4) || "FILE"}
                </div>
                <Layers className="w-3.5 h-3.5 text-white/60" />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-bold tracking-wider text-indigo-200 block">بسته دیجیتال</span>
                <p className="text-[9px] font-semibold text-white truncate font-mono text-left" dir="ltr">{prod.fileName}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 antialiased font-sans transition-all" dir="rtl">
      
      {/* Dynamic System Notification Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-bold text-sm select-none max-w-sm border ${
              toast.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-slate-900 border-slate-850 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegantly Crafted Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl max-w-sm w-full p-6 text-right space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              
              <div className="text-center space-y-2">
                <h4 className="text-sm font-black text-slate-900">تایید حذف کامل محصول</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  آیا از حذف کامل این فایل و متعلقات فیزیکی آن از روی دیسک سرور مطمئن هستید؟ این عمل به هیچ عنوان قابل بازگشت نیست.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(deleteConfirmId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
                >
                  بله، کاملا حذف کن
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  انصراف و بازگشت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Sleek Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Brand Title */}
          <div 
            onClick={() => { navigateTo('/'); }}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>{siteTitle}</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium">نسخه ۲.۰</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium select-none">بستر مستقیم و تضمین شده پرداخت و دانلود آنی فایل</p>
            </div>
          </div>

          {/* Nav Links / Active Gate controllers */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { navigateTo('/'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentSection === 'store' 
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/60' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              فروشگاه فایل
            </button>

            <button
              onClick={() => setIsSupportOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-505" />
              <span>پشتیبانی و گزارش مشکل</span>
            </button>
            
            <button
              onClick={() => { navigateTo('/admin'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentSection === 'admin' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ورود</span>
            </button>
          </div>

        </div>
      </header>

      {/* Dynamic Content Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ========================================================================================= */}
        {/* VIEW 1: CUSTOMER VIEW STOREFRONT */}
        {/* ========================================================================================= */}
        {currentSection === 'store' && (
          <div className="space-y-8">
            
            {/* SUB-VIEW 1.1: PRODUCT CATALOG (Home Page) */}
            {storeView === 'listing' && (
              <div className="space-y-12">
                
                {/* 1. PREMIUM MULTI-FACETED LANDING HERO SECTION */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 text-white p-8 sm:p-14 lg:p-16 shadow-2xl shadow-indigo-950/30">
                  {/* Decorative glowing gradient blobs */}
                  <div className="absolute -top-12 -left-12 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-12 -right-12 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  {/* Grid background overlay for technical/premium mesh effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                    {/* Left text column (60%) */}
                    <div className="lg:col-span-8 space-y-6 text-right order-last lg:order-first">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[11px] font-black tracking-wide ring-1 ring-indigo-500/25 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        نسل نوین دانلود و بارگیری بسته‌های دیجیتال فوق‌آماده
                      </span>
                      
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight sm:leading-snug text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f1f5f9] to-[#cbd5e1] drop-shadow-sm">
                        دسترسی فوری به مرجع ابزارها، اسکریپت‌ها و کتب تخصصی
                      </h2>
                      
                      <p className="text-xs sm:text-sm text-slate-300 font-light leading-loose max-w-3xl text-justify">
                        بهترین مرجع ایرانی برای دریافت پاسخ‌های ساختاری، اسکریپت‌های کاربردی، تمپلیت‌های وب و فایل‌های آموزشی استثنایی. ما به کمک فناوری هوشمند نگارش هوش مصنوعی (Gemini API)، تمام جزئیات هر فایل را به همراه ساختار ارزیابی کیفی، برای شما توصیف کرده‌ایم. با درگاه پرداخت شبیه‌سازی‌شده، به سادگی و کاملاً رایگان تجربه سفارش دیجیتال خود را بررسی و فایل‌ها را با پهنای باند بی‌نهایت دریافت فرمایید.
                      </p>

                      {/* Interactive CTA Buttons */}
                      <div className="flex flex-wrap items-center gap-3.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            document.getElementById("products-catalog-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all cursor-pointer flex items-center gap-2 transform active:scale-95"
                        >
                          <ShoppingBag className="w-4.5 h-4.5" />
                          <span>شروع گشت و گذار و خرید فایل‌ها</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            document.getElementById("faq-section-anchor")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-755/80 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2"
                        >
                          <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
                          <span>سؤالات متداول و راهنمای کاربری</span>
                        </button>
                      </div>

                      {/* Micro Benefits Inline list */}
                      <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 border-t border-slate-800 text-slate-400 font-semibold text-[10.5px]">
                        <div className="flex items-center gap-1.5 justify-start">
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                          <span>تحویل فوری و مادام‌العمر</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-start">
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                          <span>سیستم ارزیابی با هوش مصنوعی</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-start col-span-2 sm:col-span-1">
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                          <span>پشتیبانی تیکتی شبیه‌سازی‌شده</span>
                        </div>
                      </div>
                    </div>

                    {/* Right graphics/metrics column (40%) */}
                    <div className="lg:col-span-4 flex flex-col items-center justify-center relative min-h-[220px]">
                      {/* Modern UI Card illustration mock representing a beautiful digital delivery */}
                      <div className="w-full max-w-[280px] bg-slate-950/60 backdrop-blur-md rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/25"></span>
                            <span className="text-[10px] font-bold text-slate-400">تحویل آنی فعال</span>
                          </div>
                          <FileCheck className="w-4.5 h-4.5 text-indigo-400" />
                        </div>
                        
                        <div className="space-y-2.5">
                          <span className="block text-[9.5px] font-semibold text-slate-400">آخرین فایل آماده دانلود:</span>
                          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
                            <span className="block text-[11px] font-black text-slate-200 truncate">پک کامل سئو و کد فرانت‌اند</span>
                            <span className="block text-[9px] font-bold text-indigo-400">دسته: اسکریپت و قالب</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>سرعت اتصال دانلود:</span>
                            <span className="font-mono text-emerald-400">100 Gbps</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full w-[88%] rounded-full animate-pulse"></div>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between text-[9.5px] text-slate-400 font-bold border-t border-slate-800">
                          <span>سایز کل فایل‌ها:</span>
                          <span className="font-mono text-indigo-300">در ابعاد گوناگون</span>
                        </div>
                      </div>

                      {/* Decorative glowing sphere on bottom right */}
                      <div className="absolute right-10 top-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                {/* 2. THE THREE SIMPLE STEPS TIMELINE */}
                <div className="space-y-6">
                  <div className="text-center space-y-2 max-w-xl mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">مراحل فوق‌العاده سـاده خرید و دریافت فایل</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      فرآیند دریافت کالا به صورتی طراحی شده تا در سریع‌ترین زمان ممکن فایل فیزیکی یا لینک بارگیری خود را به چنگ آورید!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Decorative flow line connecting the steps (desktop only) */}
                    <div className="hidden md:block absolute top-[44px] right-[10%] left-[10%] h-0.5 bg-indigo-100 -z-0"></div>

                    {/* Step 1 */}
                    <div className="bg-slate-50 rounded-2xl p-6.5 text-center space-y-3 border border-slate-150 relative z-10 hover:shadow-md transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm mx-auto shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                        ۱
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">انتخاب فایل از کاتالوگ</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed text-justify sm:text-center">
                        فایل‌ها، کتب آموزشی یا کدهای دلخواه را جستجو و در ویترین اختصاصی انتخاب نمایید.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-50 rounded-2xl p-6.5 text-center space-y-3 border border-slate-150 relative z-10 hover:shadow-md transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm mx-auto shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                        ۲
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">پرداخت شبیه‌سازی‌شده (رایگان)</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed text-justify sm:text-center">
                        وارد درگاه آزمایشی پلتفرم شوید و تجربه خرید شبیه‌سازی‌شده ایمن را بدون کسر ریالی طی کنید.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-50 rounded-2xl p-6.5 text-center space-y-3 border border-slate-150 relative z-10 hover:shadow-md transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm mx-auto shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                        ۳
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-800">دریافت خودکار فایل و فاکتور</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed text-justify sm:text-center">
                        لینک فایل فوری باز می‌شود و آرشیو بارگیری در تاریخچه شما محفوظ خواهد ماند.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. LANDING PAGE STATISTICS BANNER */}
                <div className="bg-indigo-600 text-white rounded-2xl p-6 sm:p-8 border border-indigo-700/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="space-y-1">
                      <span className="block text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100">+۱,۴۵۰</span>
                      <span className="block text-[10.5px] font-bold text-indigo-100">فایل‌های بارگیری شده تا امروز</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100">۱۰۰٪</span>
                      <span className="block text-[10.5px] font-bold text-indigo-100">بارگیری بلافاصله و خودکار</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100">۲۴ ساعته</span>
                      <span className="block text-[10.5px] font-bold text-indigo-100">پشتیبانی مشتریان و ضمانت صحت</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-100">کاملاً رایگان</span>
                      <span className="block text-[10.5px] font-bold text-indigo-100">تست کامل چرخه در بستر محلی</span>
                    </div>
                  </div>
                </div>

                {/* VISUAL DIVIDER SECTION & ANCHOR FOR CATALOG */}
                <div id="products-catalog-section" className="scroll-mt-6 pt-2 border-t border-slate-150">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 text-right">
                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5 justify-start">
                        <Zap className="w-5 h-5 text-indigo-600 animate-bounce" />
                        <span>آرشیو کالاهای دیجیتالی و محصولات مرجع</span>
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        از فهرست طبقه‌بندی شده زیر برای پیدا کردن هرگونه جزوه، اسکریپت کلاینت یا ابزار کاربردی استفاده نمایید:
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. CATEGORIES AND SEARCH FILTERING PANEL */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row items-center justify-between gap-4">
                   
                   {/* Category Buttons Tag list */}
                   <div className="flex gap-2.5 overflow-x-auto w-full xl:w-auto scrollbar-none pb-1 md:pb-0">
                     {[
                       { id: "all", label: "همه دسته‌ها", slug: "" },
                       ...categories
                     ].map(cat => (
                       <button
                         key={cat.id}
                         type="button"
                         onClick={() => {
                           setSelectedCategory(cat.id);
                           navigateTo(cat.slug ? `/${cat.slug}` : "/");
                         }}
                         className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                           selectedCategory === cat.id
                             ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                             : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                         }`}
                       >
                         {cat.label}
                       </button>
                     ))}
                   </div>

                   {/* Filters & Search Inputs Container */}
                   <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full xl:w-auto justify-end">
                     {/* Price Status Selector */}
                     <div className="relative">
                       <select
                         value={selectedPriceFilter}
                         onChange={(e) => setSelectedPriceFilter(e.target.value)}
                         className="px-3 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-700 font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all cursor-pointer text-right min-w-[125px]"
                       >
                         <option value="all">همه قیمت‌ها</option>
                         <option value="free">فایل‌های رایگان</option>
                         <option value="paid">فایل‌های غیر رایگان</option>
                       </select>
                     </div>

                     {/* Search Form Inputs */}
                     <div className="relative w-full md:w-64">
                       <input
                         type="text"
                         placeholder="جستجو در فایل‌های مرجع..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all text-right font-medium"
                       />
                       <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                     </div>
                   </div>

                 </div>

                {/* 3. CORE STORE PRODUCTS GRID */}
                <div>
                  {getFilteredProducts().length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-slate-250/60 shadow-xs max-w-xl mx-auto">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">محصولی پیدا نشد</h4>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        هنوز هیچ فایلی با این شرایط تعریف نشده است یا مایلید فایل جدیدی بسازید؟ می‌توانید وارد "پنل ادمین" شده و فایل آپلود کنید!
                      </p>
                      
                      <button
                        onClick={() => { setCurrentSection('admin'); }}
                        className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                      >
                        ایجاد و آپلود فایل مرجع
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredProducts().map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => { navigateTo(`/${prod.slug || prod.id}`); }}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer text-right flex flex-col justify-between group overflow-hidden relative h-[410px]"
                        >
                          {/* 1. Header Cover Image / fallback */}
                          <div className="relative">
                            {renderProductCover(prod, "h-44")}
                            
                            {/* Overlay tag */}
                            <span className={`absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm bg-white/90 backdrop-blur-md border ${
                              prod.price === 0 
                                ? 'text-emerald-700 border-emerald-100/50' 
                                : 'text-indigo-700 border-indigo-150/50'
                            }`}>
                              {prod.price === 0 ? "دانلود رایگان" : "محصول غیر رایگان"}
                            </span>
                          </div>

                          {/* 2. Metadata Contents */}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-450 justify-between">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>انتشار: {new Date(prod.createdAt).toLocaleDateString("fa-IR")}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-extrabold text-[9px]">
                                  {getCategoryLabel(prod.category)}
                                </span>
                              </div>

                              <h3 className="font-bold text-[#0f172a] text-sm group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
                                {prod.title}
                              </h3>
                              
                              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed text-justify">
                                {prod.description ? prod.description.replace(/<[^>]*>?/gm, '') : ''}
                              </p>
                            </div>

                            {/* 3. Footer Price and spec controls */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]" dir="ltr">
                                <span>{formatSize(prod.fileSize)}</span>
                                <span>•</span>
                                <HardDrive className="w-3.5 h-3.5" />
                              </div>

                              <div className="text-left font-black text-slate-900 group-hover:translate-x-[-4px] transition-transform flex items-center gap-1 text-xs">
                                <span className={prod.price === 0 ? "text-emerald-600 font-extrabold" : "text-indigo-600 font-extrabold"}>
                                  {prod.price === 0 ? "رایگان" : `${prod.price.toLocaleString("fa-IR")} تومان`}
                                </span>
                                <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. BRAND CORE VALUES BANNER */}
                <div className="bg-[#f8fafc] p-6.5 sm:p-8 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 font-medium mt-10">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">شبیه‌سازی امن پرداخت</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed text-justify">تراکنش‌ها به صورت آزمایشی در شبکه محلی بدون نیاز به کارت‌های بانکی یا کسر شارژ واقعی اجرا می‌شوند تا با خیال راحت خرید کنید.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">بارگیری پر سرعت و مستقیم</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed text-justify">تک‌تک اسناد و فایل‌های متصل، مستقیماً از حافظه ابری پایدار سرورهای اختصاصی با حداکثر سرعت شبکه تحویل شما می‌شوند.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">سلامت فیزیکی فایل‌ها</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed text-justify">تمامی بسته‌های دیجیتالی، کدهای منبع و مجموعه‌های دریافتی عاری از کدهای زیان‌آور بوده و بارها توسط کارشناسان بررسی شده‌اند.</p>
                    </div>
                  </div>
                </div>

                {/* 5. INTERACTIVE ACCORDION FAQ SECTION */}
                <div id="faq-section-anchor" className="scroll-mt-8 mt-12 space-y-6">
                  <div className="text-center space-y-2 max-w-xl mx-auto">
                    <span className="text-[10px] uppercase font-black text-indigo-600 tracking-widest px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full">سؤالات متداول کاربران</span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">پاسخ به سوالات مبهم و متداول خریداران</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      هر آنچه که برای کار با درگاه نمایشی و بارگیری فایل‌ها لازم دارید در اینجا تشریح شده است.
                    </p>
                  </div>

                  <div className="max-w-3xl mx-auto space-y-3">
                    {[
                      {
                        q: "آیا فرآیند تحویل فایل‌ها و اسناد بلافاصله انجام می‌شود؟",
                        a: "بله، سیستم فوراً پس از کلیک روی دکمه تایید تراکنش در درگاه نمایشی، لینک دانلود محصول را پدیدار می‌کند. همچنین فاکتور اختصاصی تراکنش صادر شده و در تاریخچه دانلود پنل‌ها برای مراجعات بعدی محفوظ خواهد ماند."
                      },
                      {
                        q: "آیا برای خرید فایل واقعاً نیاز به پرداخت پول دارم؟",
                        a: "خیر، درگاه پرداخت این پورتال تماماً آزمایشی و شبیه‌سازی‌شده است. هدف از طراحی این وب‌سایت، شبیه‌سازی یک چرخه ایده آل دیجیتال است؛ بنابراین می‌توانید با اطلاعات دلخواه و بدون کسر ریالی پرداخت کنید."
                      },
                      {
                        q: "چگونه می‌توانم از هوش مصنوعی برای تولید توضیحات فارسی سود ببرم؟",
                        a: "ادمین فروشگاه این پتانسیل را دارد تا با زدن کلید 'تولید مشخصات با هوش مصنوعی (Gemini)' در فرم افزدن کالا، معرفی جامع و حرفه‌ای را منطبق بر نام فایل ایجاد کند. این سناریو به شما در تهیه سریع متون کمک بی‌نظیری می‌کند."
                      },
                      {
                        q: "آیا بسته‌های خریداری‌شده دارای مهلت انقضا برای دانلود هستند؟",
                        a: "لینک‌های دانلود مستقیم هیچ‌گونه منقضی‌شدنی ندارند. محصولات در سرور ما ماندگار هستند و هر زمان ترجیح بدهید می‌توانید با مراجعه به صفحه کالا یا رسید صادر شده، مجدداً فایل خود را بردارید."
                      },
                      {
                        q: "آیا کدهای پروژه یا محتوای فایل‌ها عاری از بدافزار است؟",
                        a: "قطعاً. تمامی آپلودها پیش از نهایی شدن، توسط الگوریتم‌های پایداری سلامت سرور فیلتر شده و تنها فایل‌های فشرده فاقد مشکلات امنیتی و کدهای اجرایی زیان‌آور در کاتالوگ عمومی پلتفرم قرار می‌گیرند."
                      }
                    ].map((faq, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-300"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                          className="w-full text-right px-6 py-4.5 flex items-center justify-between gap-4 font-bold text-slate-800 hover:text-indigo-600 transition-colors text-xs sm:text-sm cursor-pointer select-none"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-black flex items-center justify-center shrink-0">؟</span>
                            <span>{faq.q}</span>
                          </span>
                          <ChevronDown 
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${activeFaq === idx ? "rotate-180 text-indigo-600" : ""}`} 
                          />
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {activeFaq === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden border-t border-slate-100"
                            >
                              <div className="px-6 py-4 bg-slate-50/50 text-xs text-slate-600 leading-relaxed text-justify font-medium">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* SUB-VIEW 1.2: DEDICATED PRODUCT DETAILS PAGE */}
            {storeView === 'detail' && selectedProduct && (
              <article className="space-y-6" id="product-seo-container">
                
                {/* SEO Friendly Breadcrumbs and back button */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
                  <nav className="flex items-center gap-2" aria-label="مسیر راهنما">
                    <button onClick={() => { navigateTo('/'); }} className="hover:text-indigo-600 transition-colors cursor-pointer">فروشگاه</button>
                    <span>/</span>
                    <button 
                      onClick={() => {
                        const catObj = categories.find(c => c.id === selectedProduct.category);
                        navigateTo(catObj?.slug ? `/${catObj.slug}` : "/");
                      }} 
                      className="hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {getCategoryLabel(selectedProduct.category)}
                    </button>
                    <span>/</span>
                    <span className="text-slate-800 font-bold max-w-[200px] truncate">{selectedProduct.title}</span>
                  </nav>

                  <button
                    onClick={() => { navigateTo('/'); setCheckoutError(""); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs cursor-pointer transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>بازگشت به لیست کلی فایل‌ها</span>
                  </button>
                </div>

                {/* Left/Right Product split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Right hand description (65%) */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden text-right">
                    
                    {/* Featured Product Image Cover Header with vertical rect */}
                    <div className="relative md:h-76 w-full overflow-hidden flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 text-white bg-slate-900 gap-6">
                      
                      {/* Dark gradient style background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 opacity-95"></div>

                      {/* Header left text details */}
                      <div className="relative z-10 flex-1 space-y-3.5 text-right w-full">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold text-indigo-300 border border-white/10">
                          <Layers className="w-3.5 h-3.5 text-indigo-300" />
                          بسته اورجینال دیجیتال و فیزیکی
                        </span>
                        
                        <h1 className="text-xl sm:text-2xl font-black leading-snug drop-shadow-sm select-all">
                          {selectedProduct.title}
                        </h1>

                        <div className="flex items-center gap-4 text-[10px] text-slate-350 font-medium flex-wrap">
                          <span>منتشر شده در: <time dateTime={selectedProduct.createdAt}>{new Date(selectedProduct.createdAt).toLocaleDateString("fa-IR")}</time></span>
                          <span>•</span>
                          <span>دسته‌بندی: {getCategoryLabel(selectedProduct.category)}</span>
                          <span>•</span>
                          <span>فرمت مرجع: {selectedProduct.fileName.split('.').pop()?.toUpperCase() || "ZIP"}</span>
                        </div>
                      </div>

                      {/* Header right: Beautiful portrait styled vertical cover image */}
                      <div 
                        onClick={() => selectedProduct.imageUrl && setLightboxImage(selectedProduct.imageUrl)}
                        className={`relative z-10 shrink-0 h-48 md:h-56 aspect-[2.8/4] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-950 flex items-center justify-center transition-all ${selectedProduct.imageUrl ? 'cursor-zoom-in group hover:border-indigo-400' : ''}`}
                        title={selectedProduct.imageUrl ? "کلیک کنید تا تصویر را در اندازه اصلی ببینید" : undefined}
                      >
                        {selectedProduct.imageUrl ? (
                          <>
                            <img 
                              src={selectedProduct.imageUrl} 
                              alt={selectedProduct.title} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-1.5 p-2 text-center pointer-events-none">
                              <Search className="w-5 h-5 text-white stroke-[2.5]" />
                              <span className="text-[10px] font-bold">دیدن سایز اصلی</span>
                            </div>
                          </>
                        ) : (
                          <Layers className="w-10 h-10 text-slate-700 opacity-60" />
                        )}
                      </div>
                    </div>

                    {/* Meta descriptions and file detailings */}
                    <div className="p-6.5 space-y-6">
                      
                      {/* Specs bar layout */}
                      <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-5 text-center">
                        <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">فرمت فایل انتشار</span>
                          <span className="font-bold text-slate-800 text-xs font-mono select-all break-all block" dir="ltr">
                            {selectedProduct.fileName.split('.').pop()?.toUpperCase() || "نهایی"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">حجم کل فایل مرجع</span>
                          <span className="font-bold text-slate-800 text-xs font-mono block" dir="ltr">
                            {formatSize(selectedProduct.fileSize)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">امنیت دریافت بسته</span>
                          <span className="font-bold text-emerald-600 text-xs flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            تایید شده
                          </span>
                        </div>
                      </div>

                      {/* Main description details */}
                      <section className="space-y-3.5" aria-labelledby="product-desc-title">
                        <h2 id="product-desc-title" className="font-extrabold text-slate-900 border-r-4 border-indigo-600 pr-3 text-sm">مقدمه و توضیحات جامع محصول</h2>
                        <div 
                          className="text-xs leading-relaxed text-slate-650 text-justify font-medium leading-7 pt-1 html-content"
                          dangerouslySetInnerHTML={{ __html: selectedProduct.description || "" }}
                        />
                      </section>

                      {/* Additional Specifications */}
                      <section className="pt-4 border-t border-slate-100" aria-labelledby="product-specs-title">
                        <h2 id="product-specs-title" className="font-extrabold text-slate-800 text-xs mb-3.5">مشخصات ترابری و دانلود فایل:</h2>
                        <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 text-slate-500 font-medium leading-relaxed">
                          <p>• بلافاصله پس از پرداخت یا ثبت رایگان، دسترسی برای دانلود به صورت کلاینتی فعال می‌شود.</p>
                          <p>• امکان بارگیری مجدد از طریق شناسه خرید پورتال تا ۷۲ ساعت آینده تضمین می‌شود.</p>
                          <p>• در صورت بروز مجدد تغییرات در فایروال وبگاه، می‌توانید نسخه اصلاح‌شده را بدون هزینه دریافت کنید.</p>
                          <p className="font-bold text-indigo-700 mt-2">• نام فایل آپلودی ادمین: {selectedProduct.fileName}</p>
                        </div>
                      </section>

                    </div>
                  </div>

                  {/* Left hand checkout secure card (35%) */}
                  <aside className="bg-white rounded-2xl border border-slate-205/90 shadow-sm p-6 text-right space-y-5" aria-label="بخش خرید و صدور دسترسی">
                    
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">مبلغ نهایی قابل تصفیه</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black ${selectedProduct.price === 0 ? "text-emerald-600" : "text-indigo-600"}`}>
                          {selectedProduct.price === 0 ? "رایگان" : selectedProduct.price.toLocaleString("fa-IR")}
                        </span>
                        {selectedProduct.price > 0 && <span className="text-[10px] text-slate-400 font-medium">تومان</span>}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4.5">
                      <h2 className="text-xs font-extrabold text-slate-850 mb-3 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        <span>فرم اطلاعات جهت صدور دسترسی فایـل</span>
                      </h2>

                      {checkoutError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 text-[11px] rounded-lg leading-relaxed">
                          {checkoutError}
                        </div>
                      )}

                      <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                        
                        <div>
                          <label className="block text-[11px] text-slate-500 font-bold mb-1.5">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              placeholder="محمد حسینی"
                              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-right font-medium"
                            />
                            <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-bold mb-1.5">شماره تلفن همراه (جهت پیامک لایسنس) <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input
                              type="tel"
                              required
                              value={userPhone}
                              onChange={(e) => setUserPhone(e.target.value)}
                              placeholder="09123456789"
                              dir="ltr"
                              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-right font-mono"
                            />
                            <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-bold mb-1.5">آدرس ایمیل (پیش‌فرض اختیاری)</label>
                          <div className="relative">
                            <input
                              type="email"
                              value={userEmail}
                              onChange={(e) => setUserEmail(e.target.value)}
                              placeholder="name@example.com"
                              dir="ltr"
                              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-right font-mono"
                            />
                            <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed text-justify">
                          با تایید نهایی موافقت دارید که ارتباط دریافت فایل از طریق شماره موبایل ثبت شده پیگیری می‌شود. تراکنش دارای ضمانت برگشت وجه در صورت خرابی فایل می‌باشد.
                        </p>

                        <button
                          type="submit"
                          disabled={checkoutLoading}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
                        >
                          {checkoutLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : selectedProduct.price === 0 ? (
                            <>
                              <Download className="w-4 h-4" />
                              <span>تایید و دریافت فوری فایل</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>انتقال به درگاه و خرید نهایی</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Trust batch icons */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 text-center font-medium">
                      <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>تراکنش مجهز به گواهی SSL ۲۵۶ بیتی و کاملاً آزمایشی</span>
                    </div>

                  </aside>

                </div>

              </article>
            )}

          </div>
        )}

        {/* ========================================================================================= */}
        {/* VIEW 2: ADMINISTRATOR MANAGEMENT PANEL */}
        {/* ========================================================================================= */}
        {currentSection === 'admin' && (
          <div className="space-y-6">
            
            {/* FORCE PASS-GATE LOGIN UNTIL UNLOCKED TO PRESERVE EXPERIENCE SECURITY */}
            {!isAdminUnlocked ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xl max-w-md mx-auto">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <Lock className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="text-base font-bold text-slate-800">ورود به پورتال امنیتـی مدیریت</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  بارگذاری فیزیکی فایل‌های اصلی بر روی دیسک سرور، ممیزی مبالغ خرید، و ویرایش یا حذف مستندات مالی نیازمند تایید هویت ادمین است.
                </p>

                <form onSubmit={unlockAdmin} className="mt-6 space-y-4 text-right">
                  <div>
                    <label className="block text-slate-705 text-[11px] font-bold mb-1.5">نام کاربری ادمین</label>
                    <input
                      type="text"
                      required
                      placeholder="نام کاربری مدیریت..."
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 font-semibold text-center"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-705 text-[11px] font-bold mb-1.5">کلمه عبور ادمین</label>
                    <input
                      type="password"
                      required
                      placeholder="کلمه عبور مدیریت..."
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2 text-center border border-slate-200 bg-slate-50 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800 font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    تایید هویت و ورود ایمن
                  </button>
                </form>
              </div>
            ) : (
              
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* 1. ADMIN SIDEBAR (30% equivalent / responsive) */}
                <div className="w-full lg:w-56 bg-white rounded-2xl border border-slate-200 p-4 shrink-0 text-right space-y-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 block px-2 mb-3">پورتال ادمین</span>
                  
                  {[
                    { id: 'dashboard', label: "داشبورد و گزارشات" },
                    { id: 'products', label: "تعریف و ویرایش فایل" },
                    { id: 'bulk-import', label: "درون‌ریزی انبوه (اکسل/CSV)" },
                    { id: 'categories', label: "مدیریت دسته‌بندی‌ها" },
                    { id: 'logs', label: "گزارشات ترابری مالی" },
                    { id: 'support-tickets', label: "تیکت‌های پشتیبانی" },
                    { id: 'gemini-config', label: "تنظیمات عمومی و سیستم ⚙️" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAdminSubTab(tab.id as any)}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        adminSubTab === tab.id
                          ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600 font-black'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.id === 'support-tickets' && metrics?.pendingTicketsCount !== undefined && metrics.pendingTicketsCount > 0 && (
                        <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black animate-pulse">
                          {metrics.pendingTicketsCount.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </button>
                  ))}

                  <div className="pt-6 border-t border-slate-100 mt-6 text-center">
                    <button
                      onClick={() => setIsAdminUnlocked(false)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      خروج از حساب مدیریت
                    </button>
                  </div>
                </div>

                {/* 2. ADMIN ACTIVE SUB-TABS WINDOW */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 text-right min-h-[500px]">
                  
                  {/* TAB 2.1: DASHBOARD METRICS */}
                  {adminSubTab === 'dashboard' && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-black border-r-4 border-indigo-600 pr-3">گزارش خلاصه فعالیت‌های مالی پلتفرم</h3>
                      
                      {/* Grid metrics blocks */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">عواید شبیه‌سازی شده</span>
                          <span className="text-base font-black text-slate-900">
                            {metrics ? (metrics.totalRevenue || 0).toLocaleString("fa-IR") : "۰"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">تومان</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">دفعات دانلود فایل</span>
                          <span className="text-base font-black text-slate-900 block">
                            {metrics ? metrics.totalDownloads : "۰"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">مرتبه</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">تعداد کل محصولات</span>
                          <span className="text-base font-black text-slate-900 block">
                            {metrics ? metrics.totalProducts : "۰"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">فایل مرجع</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block mb-1">تراکنش‌های موفق</span>
                          <span className="text-base font-black text-slate-900 block">
                            {metrics ? metrics.totalSales : "۰"}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">پرداخت موفق</span>
                        </div>
                      </div>

                      {/* General Admin Quick Actions Info box */}
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3 text-xs leading-relaxed text-indigo-900">
                        <Info className="w-5 h-5 shrink-0 text-indigo-600 mt-0.5" />
                        <div>
                          <h4 className="font-bold">راهنمای بارگذاری فایل‌های دانلودی:</h4>
                          <p className="mt-1 font-medium">سایت مجهز به پایگاه داده داخلی بوده و آپلودهای شما را بر روی دیسک ذخیره می‌کند. در صورتی که فایل را حذف نمایید، اطلاعات دیتابیس بیدرنگ همگام شده و پهنای باند دیسک آزاد میشود.</p>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2.2: PRODUCTS CREATE & ARCHIVE */}
                  {adminSubTab === 'products' && (
                    <div className="space-y-8">
                      
                      <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200 text-right">
                        <h4 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-indigo-600" />
                          <span>{isEditing ? "تغییر اطلاعات فایل بوجود آمده" : "آپلود فایل جدید به فروشگاه"}</span>
                        </h4>

                        {formError && (
                          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 text-xs rounded-lg font-bold">
                            {formError}
                          </div>
                        )}

                        <form onSubmit={handleSaveProduct} className="space-y-4">
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-slate-700 text-[11px] font-bold mb-1.5">عنوان فایل الکترونیکی <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="مثال: قالب پاورپوینت ارائه پایان‌نامه ارشد"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                              />
                              
                              {/* AI AUTOGENERATE BUTTON */}
                              <div className="mt-2 text-right p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-lg space-y-2.5">
                                <span className="block text-[9px] font-extrabold text-slate-500">اختیارات مکمل برای نگارش هوش مصنوعی:</span>
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-start">
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={aiIncludeQAs}
                                      onChange={(e) => setAiIncludeQAs(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 hover:text-indigo-600 transition-colors">افزونه ۱۰ پرسش و پاسخ متداول (Q&A)</span>
                                  </label>
                                  <span className="hidden sm:block text-slate-200">|</span>
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={aiIncludeTable}
                                      onChange={(e) => setAiIncludeTable(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-[10px] font-bold text-slate-700 hover:text-indigo-600 transition-colors">افزونه جدول ساختار مشخصات محصول</span>
                                  </label>
                                </div>
                                
                                <button
                                  type="button"
                                  disabled={isGeneratingAI}
                                  onClick={handleGenerateAIProduct}
                                  className="w-full text-[10px] font-black px-2.5 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  title="نگارش هوشمند مشخصات با هوش مصنوعی"
                                >
                                  {isGeneratingAI ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                                      <span>در حال نگارش و ساخت توضیحات جامع...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                                      <span>تولید مشخصات و توضیحات محصول با هوش مصنوعی ✨</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-700 text-[11px] font-bold mb-1.5">دسته‌بندی فایل دیجیتال <span className="text-red-500">*</span></label>
                              <select
                                value={formCategory}
                                onChange={(e) => setFormCategory(e.target.value)}
                                className="w-full h-[40.5px] px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500 cursor-pointer text-right"
                              >
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-700 text-[11px] font-bold mb-1.5">قیمت فروش به تومان (0 برای رایگان) <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                required
                                min={0}
                                value={formPrice}
                                onChange={(e) => setFormPrice(Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-700 text-[11px] font-bold mb-1.5">توضیحات و مشخصات کاربردی بسته <span className="text-red-500">*</span></label>
                            <textarea
                              required
                              rows={3}
                              value={formDescription}
                              onChange={(e) => setFormDescription(e.target.value)}
                              placeholder="مزیا، تعداد صفحات، سازگاری سیستم‌عامل و طریقه راه‌اندازی فایل به ترتیب نگاشته شود..."
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold leading-relaxed focus:outline-hidden focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 text-[11px] font-bold mb-1.5">آدرس اختصاصی محصول (URL Slug - اختیاری)</label>
                            <input
                              type="text"
                              value={formSlug}
                              onChange={(e) => setFormSlug(e.target.value)}
                              placeholder="مثال: custom-plugin-address (اگر خالی بگذارید متناسب با عنوان بصورت اتوماتیک ایجاد می‌شود)"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-left"
                              dir="ltr"
                            />
                          </div>

                          {/* PRODUCT COVER IMAGE SELECTOR */}
                          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
                            <span className="block text-slate-800 text-[11px] font-bold">انتخاب و بارگذاری تصویر شاخص / عکس پیش‌نمایش</span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-slate-500 text-[10px] font-bold mb-1">آدرس مستقیم تصویر پیش‌نمایش (URL یا تکه کد Base64)</label>
                                  <input
                                    type="text"
                                    value={formImageUrl}
                                    onChange={(e) => setFormImageUrl(e.target.value)}
                                    placeholder="https://example.com/cover.png"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <span className="block text-slate-500 text-[10px] font-bold">انتخاب سریع از تصاویر شاخص پیش‌فرض کانونی</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      { name: "آموزش/وبینار", url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80" },
                                      { name: "کد و اسکریپت", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80" },
                                      { name: "کتاب/مجلد الکترونیک", url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80" },
                                      { name: "طرح خلاقانه", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
                                      { name: "فیلم و رسانه", url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80" }
                                    ].map((preset, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFormImageUrl(preset.url)}
                                        className={`px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[9px] font-bold rounded-md cursor-pointer border border-slate-200 transition-all ${
                                          formImageUrl === preset.url ? 'ring-2 ring-indigo-500 bg-indigo-50 text-indigo-700 border-indigo-200' : ''
                                        }`}
                                      >
                                        {preset.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Upload Cover Image widget */}
                              <div className="space-y-2">
                                <span className="block text-slate-500 text-[10px] font-bold">یا بارگذاری تصویر دلخواه (JPG / PNG)</span>
                                <div
                                  onDragOver={(e) => { e.preventDefault(); setIsImageDragOver(true); }}
                                  onDragLeave={() => setIsImageDragOver(false)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setIsImageDragOver(false);
                                    const f = e.dataTransfer.files?.[0];
                                    if (f) {
                                      const r = new FileReader();
                                      r.onload = () => setFormImageUrl(r.result as string);
                                      r.readAsDataURL(f);
                                    }
                                  }}
                                  className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer ${
                                    isImageDragOver ? "border-indigo-600 bg-indigo-50/25" : "border-slate-200 bg-white hover:border-indigo-400"
                                  }`}
                                  onClick={() => document.getElementById("admin-image-picker")?.click()}
                                >
                                  <Upload className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                  <p className="text-[10px] font-bold text-slate-700">رها کنید یا برای آپلود کلیک فرمایید</p>
                                  <input
                                    type="file"
                                    id="admin-image-picker"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        const r = new FileReader();
                                        r.onload = () => setFormImageUrl(r.result as string);
                                        r.readAsDataURL(f);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </div>
                                
                                {formImageUrl && (
                                  <div className="flex items-center justify-between p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-[10px]">
                                    <span className="text-slate-600 font-medium truncate max-w-[150px]">تصویر انتخاب شد</span>
                                    <button
                                      type="button"
                                      onClick={() => setFormImageUrl("")}
                                      className="text-rose-500 font-bold hover:underline cursor-pointer"
                                    >
                                      حذف تصویر
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* drag and drop file file upload widget */}
                          <div>
                            <label className="block text-slate-700 text-[11px] font-bold mb-1.5">فایل نهایی محصول را انتخاب کنید <span className="text-red-500">*</span></label>
                            
                            <div
                              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                              onDragLeave={() => setIsDragOver(false)}
                              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if(f) processFile(f); }}
                              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                                isDragOver ? "border-indigo-600 bg-indigo-50/20" : "border-slate-300 bg-white hover:border-indigo-500"
                              }`}
                            >
                              <Upload className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
                              <p className="text-xs font-bold text-slate-700">فایل مورد نظر را اینجا بیندازید یا برای انتخاب کلیک کنید</p>
                              <p className="text-[10px] text-slate-400 mt-1">تا سقف ۹۰ مگابایت (تنها جهت ممانعت از محدودیت رم پورتال)</p>
                              
                              <input
                                type="file"
                                id="admin-file-picker"
                                onChange={(e) => { const f = e.target.files?.[0]; if(f) processFile(f); }}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById("admin-file-picker")?.click()}
                                className="mt-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                جستجو در دایرکتوری‌ها
                              </button>
                            </div>

                            {/* Show uploaded filename details */}
                            {uploadedFile && (
                              <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                                <span className="font-bold text-indigo-900 break-all">{uploadedFile.name} (حجم: {formatSize(uploadedFile.size)})</span>
                                <button
                                  type="button"
                                  onClick={() => setUploadedFile(null)}
                                  className="text-rose-500 font-bold text-xs"
                                >
                                  حذف
                                </button>
                              </div>
                            )}

                            {isEditing && !uploadedFile && (
                              <span className="text-[10px] text-amber-600 font-medium block mt-1.5">• فایل جدیدی بارگذاری نکرده‌اید؛ سیستم فایل قبلی را حفظ خواهد کرد.</span>
                            )}
                          </div>

                          {/* Submit Actions Button list */}
                          <div className="flex justify-end gap-2 pt-2">
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => { setIsEditing(false); setFormTitle(""); setFormDescription(""); setFormPrice(0); setUploadedFile(null); }}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                              >
                                انصراف و ریست
                              </button>
                            )}
                            <button
                              type="submit"
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-all"
                            >
                              {isEditing ? "ثبت ویرایش اطلاعات" : "انتشار رسمی فایل در فروشگاه"}
                            </button>
                          </div>

                        </form>
                      </div>

                      {/* MASTER PRODUCTS LIST */}
                      <div>
                        <h4 className="text-xs font-black text-slate-800 mb-4 pb-1.5 border-b border-slate-100">آرشیو جامع فایل‌های آپلودی ادمین</h4>
                        
                        {products.length === 0 ? (
                          <span className="text-xs text-slate-400 font-medium h-24 flex items-center">جدولی خالی است. هنوز فایلی آپلود نکرده‌اید.</span>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                            <table className="w-full border-collapse text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                                  <th className="p-3">عنوان فایل</th>
                                  <th className="p-3">قیمت مالی</th>
                                  <th className="p-3">تعداد دانلود</th>
                                  <th className="p-3 text-left">عملیات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {products.map(prod => (
                                  <tr key={prod.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-semibold text-slate-900">{prod.title} (آپلود: {prod.fileName})</td>
                                    <td className="p-3 font-mono">{prod.price === 0 ? "رایگان" : `${prod.price.toLocaleString("fa-IR")} تومان`}</td>
                                    <td className="p-3 text-emerald-600 font-bold">{prod.downloadCount || 0} بار دانلود</td>
                                    <td className="p-3 text-left">
                                      <div className="inline-flex gap-1.5">
                                        <button
                                          onClick={() => startEditProduct(prod)}
                                          className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer text-[10px]"
                                        >
                                          ویرایش
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(prod.id)}
                                          className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer text-[10px]"
                                        >
                                          حذف
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* TAB 2.2.5: CUSTOM CATEGORIES MANAGEMENT */}
                  {adminSubTab === 'categories' && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-black border-r-4 border-indigo-600 pr-3">مدیریت دسته‌بندی‌های اختصاصی فروشگاه</h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Right Form: Create category */}
                        <div className="lg:col-span-1 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                          <h4 className="text-xs font-extrabold text-slate-800">ایجاد دسته‌بندی جدید</h4>
                          
                          {catFormError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-lg">
                              {catFormError}
                            </div>
                          )}

                          <form onSubmit={handleSaveCategory} className="space-y-3">
                            <div>
                              <label className="block text-slate-650 text-[10px] font-bold mb-1">عنوان فارسی دسته‌بندی <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={newCatLabel}
                                onChange={(e) => setNewCatLabel(e.target.value)}
                                placeholder="مثال: آموزش صوتی، ابزار توسعه کده"
                                className="w-full px-3.5 py-2 bg-white border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-650 text-[10px] font-bold mb-1">آدرس مستقیم انگلیسی / فارسی (Slug) <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={newCatSlug}
                                onChange={(e) => setNewCatSlug(e.target.value)}
                                placeholder="مثال: code-script, audio-course (بدون فاصله)"
                                className="w-full px-3.5 py-2 bg-white border border-slate-205 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-left"
                                dir="ltr"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md shadow-indigo-100"
                            >
                              افزودن دسته‌بندی و آدرس فعال
                            </button>
                          </form>
                        </div>

                        {/* Left List: Existing categories list view */}
                        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                          <h4 className="text-xs font-extrabold text-slate-800">دسته‌بندی‌های فعال سیستم</h4>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold">
                                  <th className="pb-2.5">شناسه ادمین (Category ID)</th>
                                  <th className="pb-2.5">عنوان دسته‌بندی</th>
                                  <th className="pb-2.5">آدرس مستقیم (Direct URL)</th>
                                  <th className="pb-2.5 text-center">عملیات مدیریت</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {categories.map((cat) => (
                                  <tr key={cat.id} className="hover:bg-slate-50/50">
                                    <td className="py-3 font-mono font-bold text-slate-600 text-[10px]">{cat.id}</td>
                                    <td className="py-3 font-bold text-slate-800">{cat.label}</td>
                                    <td className="py-3 font-mono text-indigo-600 text-[10px] select-all" dir="ltr">
                                      /{cat.slug}
                                    </td>
                                    <td className="py-3 text-center">
                                      {["script", "template", "book", "video", "other"].includes(cat.id) ? (
                                        <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2.5 py-0.5 rounded cursor-not-allowed">سیستمی پیش‌فرض</span>
                                      ) : (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                                        >
                                          حذف دسته‌بندی
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2.2.6: EXCEL/CSV BULK PRODUCTS IMPORT */}
                  {adminSubTab === 'bulk-import' && (
                    <BulkImportPanel
                      categories={categories}
                      getAuthHeaders={getAuthHeaders}
                      showToast={showToast}
                      onSuccess={() => {
                        fetchProducts();
                        fetchMetrics();
                      }}
                    />
                  )}

                  {/* TAB 2.3: TRANSACTIONS & CLIENT DOWNLOADS LOG */}
                  {adminSubTab === 'logs' && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-black border-r-4 border-indigo-600 pr-3">ممیزی تراکنش‌ها و گزارشات بارگیری</h3>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        
                        {/* Download statistics log */}
                        <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            <span>آخرین بارگیری فایل‌ها توسط خریداران</span>
                          </h4>

                          {!metrics || metrics.recentDownloads.length === 0 ? (
                            <span className="text-[11px] text-slate-400 block py-12 text-center">آمار دانلودی ثبت نشده است.</span>
                          ) : (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                              {metrics.recentDownloads.map(log => (
                                <div key={log.id} className="p-3 bg-white rounded-lg border border-slate-150 text-right space-y-1 bg-white">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-900">{log.productTitle}</span>
                                    <span className="text-[9px] text-slate-405 font-mono" dir="ltr">
                                      {new Date(log.downloadedAt).toLocaleTimeString("fa-IR")}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex justify-between">
                                    <span>خریدار: {log.userName}</span>
                                    <span>موبایل: {log.userPhone}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Billing transactions log */}
                        <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                            <span>گزارشات آماری پورتال بانکی شاپرک</span>
                          </h4>

                          {!metrics || metrics.recentTransactions.length === 0 ? (
                            <span className="text-[11px] text-slate-400 block py-12 text-center">تراکنشی یافت نشد.</span>
                          ) : (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                              {metrics.recentTransactions.map(tx => (
                                <div key={tx.id} className="p-3 bg-white rounded-lg border border-slate-150 text-right space-y-1 shadow-2xs">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-900">{tx.productTitle}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      tx.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                    }`}>
                                      {tx.status === "completed" ? "موفق" : "در انتظار پرداخت"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex justify-between">
                                    <span>پردازنده: {tx.userName}</span>
                                    <span className="font-bold">{tx.price === 0 ? "رایگان" : `${tx.price.toLocaleString("fa-IR")} تومان`}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                  {/* TAB 2.4: CLIENT SUPPORT TICKETS */}
                  {adminSubTab === 'support-tickets' && (
                    <AdminTicketsPanel 
                      getAuthHeaders={getAuthHeaders} 
                      showToast={showToast} 
                    />
                  )}

                  {/* TAB 2.5: GEMINI CUSTOM API KEY CONFIG */}
                  {adminSubTab === 'gemini-config' && (
                    <AdminGeminiPanel 
                      getAuthHeaders={getAuthHeaders} 
                      showToast={showToast} 
                      onSettingsSaved={(newTitle, newFavicon) => {
                        setSiteTitle(newTitle);
                        setFaviconUrl(newFavicon);
                        
                        // Dynamically update favicon in the browser on save
                        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                        if (!link) {
                          link = document.createElement('link');
                          link.rel = 'icon';
                          document.getElementsByTagName('head')[0].appendChild(link);
                        }
                        link.href = newFavicon;
                      }}
                    />
                  )}

                </div>
              </div>

            )}

          </div>
        )}

      </main>

      {/* FOOTER BRANDS ACCENTS */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-20 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right font-medium">
          <div className="space-y-1.5">
            <p className="font-bold text-slate-200 text-sm">پلتفرم بومی و امن فروش فایل‌های دیجیتال و آموزشـی</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">این وبسایت مجهز به دیتابیس لوکال و فایل آپلودر سروری بوده و هیچ درگاه مالی فیزیکی جهت کسر بودجه واقعی متصل نمی‌باشد.</p>
          </div>
          
          <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <span>حقوق کپی‌رایت محفوظ است © ۲۰۲۶</span>
          </div>
        </div>
      </footer>

      {/* SIMULATED GATEWAY / ACCESS TO DOWNLOAD OVERLAY VIEWS */}
      {activePurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center">
          
          {/* SIMULATED SHAPARAK PORTAL DISPLAY */}
          {activePurchase.status === "pending_payment" && activePurchase.transactionId && (
            <div className="w-full h-full overflow-y-auto">
              <SimulatedPayment
                transactionId={activePurchase.transactionId}
                price={activePurchase.price}
                productTitle={activePurchase.productTitle}
                onPaymentResult={handlePaymentCallback}
              />
            </div>
          )}

          {/* SIMULATED SUCCESSFUL FILE STREAM GIVER */}
          {activePurchase.status === "completed" && (
            <div className="min-h-screen py-10 px-4 w-full flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full max-w-lg p-7.5 text-right shadow-2xl border border-slate-100 space-y-6"
                id="digital-secure-box"
              >
                
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-emerald-800">تراکنش با موفقیت به پایان رسید!</h3>
                  <p className="text-xs text-slate-400">توکن یکتای صدور لایسنس تایید گردید و دسترسی فایل روی سرور برقرار شد.</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>عنوان بسته دیجیتال:</span>
                    <span className="font-bold text-slate-900">{activePurchase.productTitle}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]" dir="ltr">
                    <span className="font-sans text-xs text-slate-500">موبایل پیامک شده:</span>
                    <span>{userPhone}</span>
                  </div>
                  {activePurchase.downloadToken && (
                    <div className="flex justify-between font-mono text-[11px] text-indigo-700" dir="ltr">
                      <span className="font-sans text-xs text-slate-500">شناسه اعتبار دانلود (Token):</span>
                      <span>{activePurchase.downloadToken}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs rounded-xl leading-relaxed text-justify font-semibold">
                  روی لینک مستقیم زیر کلیک بفرمایید تا فایل آپلودی ادمین به صورت مستقیم و با پهنای باند سروری روی سیستم شما بارگذاری شود.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setActivePurchase(null); setStoreView('listing'); }}
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-150 border border-slate-205 py-3 font-bold text-xs rounded-xl shadow-2xs cursor-pointer transition-all text-center"
                  >
                    بستن فاکتور و بازگشت به فروشگاه
                  </button>
                  {activePurchase.downloadToken && (
                    <button
                      onClick={() => triggerDownload(activePurchase.productId, activePurchase.downloadToken!)}
                      className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4 animate-bounce" />
                      <span>دانلود فایل اصلی</span>
                    </button>
                  )}
                </div>

              </motion.div>
            </div>
          )}

        </div>
      )}

      {/* PRODUCT IMAGE FULL-SIZE LIGHTBOX */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out select-none"
          >
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={() => setLightboxImage(null)}
                type="button" 
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 cursor-pointer shadow-lg"
                title="بستن تصویر"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-[85vh] md:max-h-[90vh] aspect-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={lightboxImage} 
                alt="نمای بزرگ تصویر محصول" 
                className="max-w-full max-h-[85vh] md:max-h-[90vh] object-contain cursor-default"
                referrerPolicy="no-referrer"
              />
              
              {/* Subtle info pill at the bottom */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-white/10 py-1.5 px-4 rounded-full text-white text-[10px] font-bold tracking-wide select-none">
                برای بستن، روی حاشیه‌های تیره صحنه کلیک نمایید
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUPPORT FORM MODAL POPUP */}
      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        showToast={showToast} 
      />

      {/* FLOATING ACTION SUPPORT PILL */}
      <div className="fixed bottom-6 left-6 z-40" dir="rtl">
        <button
          onClick={() => setIsSupportOpen(true)}
          type="button"
          className="flex items-center gap-2 px-4.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:shadow-indigo-200/50 font-black text-xs transition-all duration-350 group hover:-translate-y-0.5 select-none border border-indigo-500/15 cursor-pointer"
          title="پشتیبانی و ثبت تیکت گزارش مشکل"
        >
          <LifeBuoy className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-500" />
          <span>گزارش مشکل در خرید / پشتیبانی</span>
        </button>
      </div>

    </div>
  );
}
