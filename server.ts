import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");
const FILES_DIR = path.join(DB_DIR, "files");

// Make sure standard directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

// Initialize db.json if not present
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ 
      products: [], 
      downloads: [], 
      transactions: [],
      tickets: [],
      categories: [
        { id: "script", label: "کد و اسکریپت", slug: "code" },
        { id: "template", label: "قالب و گرافیک", slug: "template" },
        { id: "book", label: "آموزش و کتاب", slug: "book" },
        { id: "video", label: "دوره و ویدیو", slug: "video" },
        { id: "other", label: "سایر فایل‌ها", slug: "other" }
      ]
    }, null, 2),
    "utf-8"
  );
}

// Helper methods to read/write DB
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    let changed = false;
    if (!data.categories) {
      data.categories = [
        { id: "script", label: "کد و اسکریپت", slug: "code" },
        { id: "template", label: "قالب و گرافیک", slug: "template" },
        { id: "book", label: "آموزش و کتاب", slug: "book" },
        { id: "video", label: "دوره و ویدیو", slug: "video" },
        { id: "other", label: "سایر فایل‌ها", slug: "other" }
      ];
      changed = true;
    }
    if (!data.tickets) {
      data.tickets = [];
      changed = true;
    }
    if (!data.settings) {
      data.settings = {
        siteTitle: "فروشگاه بزرگ فایل دیجیتال",
        faviconUrl: "/favicon.ico",
        headerScript: ""
      };
      changed = true;
    }
    if (changed) {
      writeDB(data);
    }
    return data;
  } catch (error) {
    console.error("Error reading database:", error);
    return { 
      products: [], 
      downloads: [], 
      transactions: [],
      tickets: [],
      categories: [
        { id: "script", label: "کد و اسکریپت", slug: "code" },
        { id: "template", label: "قالب و گرافیک", slug: "template" },
        { id: "book", label: "آموزش و کتاب", slug: "book" },
        { id: "video", label: "دوره و ویدیو", slug: "video" },
        { id: "other", label: "سایر فایل‌ها", slug: "other" }
      ]
    };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

async function startServer() {
  const app = express();

  const activeSessions = new Set<string>();

  const requireAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (!token || !activeSessions.has(token)) {
      return res.status(401).json({ error: "شما به این بخش دسترسی ندارید. لطفا ابتدا وارد شوید." });
    }
    next();
  };

  // Support up to 100MB payloads for base64 file uploads
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // API - Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "نام کاربری و کلمه عبور الزامی است" });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    
    // Checked secure admin credentials: username is 'admin' and SHA-256 hash of password
    const validUsername = "admin";
    const validPasswordHash = "9e2744568f352c7ce28b3b570e5decd0b5604295235c52d5945ea8e4f8edd637";

    if (username.toLowerCase() === validUsername && hashedPassword === validPasswordHash) {
      const token = crypto.randomBytes(32).toString("hex");
      activeSessions.add(token);
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
    }
  });

  // API - Get Products list (exclude base64 contents to keep responses light)
  app.get("/api/products", (req, res) => {
    const db = readDB();
    const productsList = db.products.map((p: any) => {
      const { fileData, ...meta } = p;
      return meta;
    });
    res.json(productsList);
  });

  // API - Get single product detail
  app.get("/api/products/:id", (req, res) => {
    const db = readDB();
    const product = db.products.find((p: any) => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: "محصول پیدا نشد" });
    }
    const { fileData, ...meta } = product;
    res.json(meta);
  });

  // Helper to sanitize Persian/English URLs and replace spaces with hyphens
  const sanitizeSlug = (val: string) => {
    return val
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[/?#\[\]@!$&'()*+,;=]/g, "");
  };

  // API - Get Categories list
  app.get("/api/categories", (req, res) => {
    const db = readDB();
    res.json(db.categories || []);
  });

  // API - Create Category
  app.post("/api/categories", requireAdminAuth, (req, res) => {
    const { label, slug } = req.body;
    if (!label || !slug) {
      return res.status(400).json({ error: "لطفا نام و آدرس دسته‌بندی را وارد کنید" });
    }

    const db = readDB();
    const formattedSlug = sanitizeSlug(slug);

    if (!formattedSlug) {
      return res.status(400).json({ error: "آدرس دسته‌بندی نامعتبر است" });
    }

    // Check for duplicates
    const duplicate = db.categories.find((c: any) => c.slug === formattedSlug);
    if (duplicate) {
      return res.status(400).json({ error: "یک دسته‌بندی با این آدرس از قبل وجود دارد" });
    }

    const newCategory = {
      id: crypto.randomUUID(),
      label: label.trim(),
      slug: formattedSlug
    };

    db.categories.push(newCategory);
    writeDB(db);
    res.status(201).json(newCategory);
  });

  // API - Delete Category
  app.delete("/api/categories/:id", requireAdminAuth, (req, res) => {
    const db = readDB();
    const index = db.categories.findIndex((c: any) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "دسته‌بندی یافت نشد" });
    }

    db.categories.splice(index, 1);
    writeDB(db);
    res.json({ success: true, message: "دسته‌بندی با موفقیت حذف شد" });
  });

  // API - Create new product (Admin Only - simplified password check or client-side context)
  app.post("/api/products", requireAdminAuth, (req, res) => {
    const { title, description, price, fileName, fileSize, fileData, imageUrl, category, slug } = req.body;
    
    if (!title || !description || price === undefined || !fileName || !fileData) {
      return res.status(400).json({ error: "لطفا تمامی فیلدها را وارد کنید" });
    }

    const productId = crypto.randomUUID();
    
    // Save physical file to server disk
    try {
      const base64Content = fileData.split(";base64,").pop() || fileData;
      const buffer = Buffer.from(base64Content, "base64");
      const filePath = path.join(FILES_DIR, productId);
      fs.writeFileSync(filePath, buffer);
      
      const db = readDB();
      
      // Determine unique friendly slug
      let baseSlug = slug && slug.trim() ? sanitizeSlug(slug) : sanitizeSlug(title);
      if (!baseSlug) {
        baseSlug = crypto.randomBytes(4).toString("hex");
      }
      let formattedSlug = baseSlug;
      let counter = 1;
      while (db.products.some((p: any) => p.slug === formattedSlug)) {
        formattedSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const newProduct = {
        id: productId,
        title,
        description,
        price: Number(price),
        fileName,
        fileSize: Number(fileSize),
        downloadCount: 0,
        purchaseCount: 0,
        createdAt: new Date().toISOString(),
        imageUrl: imageUrl || "",
        category: category || "other",
        slug: formattedSlug
      };
      
      db.products.push(newProduct);
      writeDB(db);
      
      res.status(201).json(newProduct);
    } catch (err: any) {
      console.error("Error uploading product file:", err);
      res.status(500).json({ error: "خطا در بارگذاری فایل روی سرور" });
    }
  });

  // API - Bulk Create Products
  app.post("/api/products/bulk", requireAdminAuth, (req, res) => {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "لیست محصولات نامعتبر است" });
    }

    const db = readDB();
    const importedList: any[] = [];
    let errorsCount = 0;

    for (const item of products) {
      const { title, description, price, fileName, imageUrl, category, slug, fileData } = item;
      if (!title || price === undefined) {
        errorsCount++;
        continue;
      }

      const productId = crypto.randomUUID();

      try {
        let size = 0;
        if (fileData) {
          const base64Content = fileData.split(";base64,").pop() || fileData;
          const buffer = Buffer.from(base64Content, "base64");
          const filePath = path.join(FILES_DIR, productId);
          fs.writeFileSync(filePath, buffer);
          size = buffer.length;
        } else {
          // Write a dummy file to ensure downloads work
          const dummyContent = `فایل مرجع محصول: ${title}\nاین یک فایل پیش‌فرض برای خرید موفق است و بعدا توسط ادمین در پنل شبیه‌ساز قابل ترفیع است.`;
          const filePath = path.join(FILES_DIR, productId);
          fs.writeFileSync(filePath, Buffer.from(dummyContent, "utf-8"));
          size = Buffer.byteLength(dummyContent, "utf-8");
        }

        // Determine unique slug
        let baseSlug = slug && slug.trim() ? sanitizeSlug(slug) : sanitizeSlug(title);
        if (!baseSlug) {
          baseSlug = crypto.randomBytes(4).toString("hex");
        }
        let formattedSlug = baseSlug;
        let counter = 1;
        while (db.products.some((p: any) => p.slug === formattedSlug) || importedList.some((p: any) => p.slug === formattedSlug)) {
          formattedSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        const newProd = {
          id: productId,
          title: title.trim(),
          description: (description || "").trim(),
          price: Number(price),
          fileName: fileName ? fileName.trim() : `${title.trim()}.zip`,
          fileSize: size,
          downloadCount: 0,
          purchaseCount: 0,
          createdAt: new Date().toISOString(),
          imageUrl: imageUrl || "",
          category: category || "other",
          slug: formattedSlug
        };

        importedList.push(newProd);
      } catch (err) {
        console.error("Error creating bulk product item:", err);
        errorsCount++;
      }
    }

    db.products.push(...importedList);
    writeDB(db);

    res.status(201).json({
      success: true,
      importedCount: importedList.length,
      errorsCount,
      message: `تعداد ${importedList.length} محصول با موفقیت درون‌ریزی شد.`
    });
  });

  // API - Edit Product
  app.put("/api/products/:id", requireAdminAuth, (req, res) => {
    const { title, description, price, fileName, fileSize, fileData, imageUrl, category, slug } = req.body;
    const db = readDB();
    const index = db.products.findIndex((p: any) => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: "محصول یافت نشد" });
    }

    const currentProduct = db.products[index];
    
    if (title !== undefined) currentProduct.title = title;
    if (description !== undefined) currentProduct.description = description;
    if (price !== undefined) currentProduct.price = Number(price);
    if (imageUrl !== undefined) currentProduct.imageUrl = imageUrl;
    if (category !== undefined) currentProduct.category = category;

    if (slug !== undefined) {
      let baseSlug = slug.trim() ? sanitizeSlug(slug) : sanitizeSlug(currentProduct.title);
      if (!baseSlug) baseSlug = crypto.randomBytes(4).toString("hex");
      
      let formattedSlug = baseSlug;
      let counter = 1;
      // Exclude current product in duplicate search
      while (db.products.some((p: any) => p.slug === formattedSlug && p.id !== req.params.id)) {
        formattedSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      currentProduct.slug = formattedSlug;
    }

    // If file is also being updated
    if (fileName && fileData) {
      try {
        const base64Content = fileData.split(";base64,").pop() || fileData;
        const buffer = Buffer.from(base64Content, "base64");
        const filePath = path.join(FILES_DIR, currentProduct.id);
        fs.writeFileSync(filePath, buffer);
        
        currentProduct.fileName = fileName;
        currentProduct.fileSize = Number(fileSize);
      } catch (err) {
        console.error("Error updating files:", err);
        return res.status(500).json({ error: "خطا در جایگزینی فایل قدیمی" });
      }
    }

    db.products[index] = currentProduct;
    writeDB(db);
    
    const { fileData: omit, ...meta } = currentProduct;
    res.json(meta);
  });

  // API - Delete Product
  app.delete("/api/products/:id", requireAdminAuth, (req, res) => {
    const db = readDB();
    const index = db.products.findIndex((p: any) => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: "محصول پیدا نشد" });
    }

    const productId = req.params.id;
    
    // Remove binary file
    const filePath = path.join(FILES_DIR, productId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Error removing file:", err);
      }
    }

    db.products.splice(index, 1);
    
    // Also remove logs/transactions associated if desired, but we can keep logs for historical reference
    writeDB(db);
    res.json({ success: true, message: "محصول با موفقیت حذف شد" });
  });

  // API - Request Purchase (Download/Buy trigger)
  app.post("/api/purchase", (req, res) => {
    const { productId, userName, userPhone, userEmail } = req.body;

    if (!productId || !userName || !userPhone || !userEmail) {
      return res.status(400).json({ error: "لطفا تمامی مشخصات کاربری را وارد کنید" });
    }

    const db = readDB();
    const product = db.products.find((p: any) => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: "محصول مورد نظر یافت نشد" });
    }

    // Generate downlaod transaction
    const transactionId = crypto.randomUUID();
    const downloadToken = crypto.randomBytes(16).toString("hex");

    const newTransaction = {
      id: transactionId,
      productId,
      productTitle: product.title,
      price: product.price,
      userName,
      userPhone,
      userEmail,
      status: product.price === 0 ? "completed" : "pending",
      downloadToken: product.price === 0 ? downloadToken : "",
      createdAt: new Date().toISOString()
    };

    db.transactions.push(newTransaction);

    if (product.price === 0) {
      // For free files: Increment download count instantly and write log
      product.downloadCount = (product.downloadCount || 0) + 1;
      
      const downloadLog = {
        id: crypto.randomUUID(),
        productId,
        productTitle: product.title,
        userName,
        userPhone,
        userEmail,
        pricePaid: 0,
        downloadedAt: new Date().toISOString()
      };
      
      db.downloads.push(downloadLog);
      writeDB(db);
      
      return res.json({
        status: "completed",
        price: 0,
        downloadToken,
        message: "ثبت‌نام با موفقیت انجام شد. در حال آماده‌سازی فایل برای دانلود..."
      });
    } else {
      // For paid files: redirect user to mock gateway
      writeDB(db);
      return res.json({
        status: "pending_payment",
        price: product.price,
        transactionId,
        message: "ثبت‌نام برای دریافت فایل انجام شد. لطفا نسبت به پرداخت هزینه اقدام نمایید."
      });
    }
  });

  // API - Verify Mock Payment Gateway
  app.post("/api/payment/verify", (req, res) => {
    const { transactionId, status } = req.body; // status should be 'success' or 'cancel'
    
    if (!transactionId || !status) {
      return res.status(400).json({ error: "شناسه تراکنش الزامی است" });
    }

    const db = readDB();
    const transactionIndex = db.transactions.findIndex((t: any) => t.id === transactionId);

    if (transactionIndex === -1) {
      return res.status(404).json({ error: "تراکنش یافت نشد" });
    }

    const transaction = db.transactions[transactionIndex];

    if (transaction.status === "completed") {
      return res.json({
        status: "already_completed",
        downloadToken: transaction.downloadToken,
        productId: transaction.productId
      });
    }

    if (status === "success") {
      const downloadToken = crypto.randomBytes(16).toString("hex");
      transaction.status = "completed";
      transaction.downloadToken = downloadToken;
      
      // Update product counters
      const product = db.products.find((p: any) => p.id === transaction.productId);
      if (product) {
        product.purchaseCount = (product.purchaseCount || 0) + 1;
        product.downloadCount = (product.downloadCount || 0) + 1;
      }

      // Add a confirmed download log
      const downloadLog = {
        id: crypto.randomUUID(),
        productId: transaction.productId,
        productTitle: transaction.productTitle,
        userName: transaction.userName,
        userPhone: transaction.userPhone,
        userEmail: transaction.userEmail,
        pricePaid: transaction.price,
        downloadedAt: new Date().toISOString()
      };

      db.downloads.push(downloadLog);
      writeDB(db);

      return res.json({
        status: "success",
        downloadToken,
        productId: transaction.productId,
        message: "پرداخت موفقیت‌آمیز بود! قفل دانلود فایل برای شما باز شد."
      });
    } else {
      transaction.status = "failed";
      writeDB(db);
      return res.json({
        status: "failed",
        message: "پرداخت لغو شد یا با خطا مواجه گردید."
      });
    }
  });

  // API - Stream File Download based on matching Token
  app.get("/api/download-file/:productId", (req, res) => {
    const { productId } = req.params;
    const { token } = req.query;

    if (!productId || !token) {
      return res.status(400).send("شناسه محصول و رمز ورود دانلود الزامی است");
    }

    const db = readDB();
    
    // Verify that this token matches a completed transaction for this file
    const transaction = db.transactions.find(
      (t: any) => t.productId === productId && t.downloadToken === token && t.status === "completed"
    );

    if (!transaction) {
      return res.status(403).send("لینک دانلود منقضی شده یا اشتباه است. لطفا مجددا تلاش کنید.");
    }

    const product = db.products.find((p: any) => p.id === productId);
    if (!product) {
      return res.status(404).send("محصول مورد نظر یافت نشد.");
    }

    const filePath = path.join(FILES_DIR, productId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("فایل فیزیکی روی سرور موجود نیست. لطفا با بخش مدیریت هماهنگ کنید.");
    }

    // Set download headers
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(product.fileName)}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    // Stream the file contents to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  // API - Get admin system metrics & logs
  app.get("/api/admin/metrics", requireAdminAuth, (req, res) => {
    const db = readDB();
    
    // Sum total profits
    const totalTransactions = db.transactions.filter((t: any) => t.status === "completed" && t.price > 0);
    const totalRevenue = totalTransactions.reduce((acc: number, cur: any) => acc + (cur.price || 0), 0);
    const pendingTicketsCount = (db.tickets || []).filter((t: any) => t.status === "pending").length;
    
    res.json({
      totalProducts: db.products.length,
      totalDownloads: db.downloads.length,
      totalSales: totalTransactions.length,
      totalRevenue,
      pendingTicketsCount,
      recentDownloads: db.downloads.slice().reverse().slice(0, 50), // last 50 downloads
      recentTransactions: db.transactions.slice().reverse().slice(0, 50)
    });
  });

  // API - Create Support Ticket (Public)
  app.post("/api/tickets", (req, res) => {
    const { name, email, phone, subject, transactionId, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "پر کردن فیلدهای ستاره‌دار الزامی است" });
    }

    const db = readDB();
    
    const newTicket = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : "",
      subject: subject.trim(),
      transactionId: transactionId ? transactionId.trim() : "",
      message: message.trim(),
      status: "pending", // pending, in_progress, resolved
      adminNote: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tickets = db.tickets || [];
    db.tickets.push(newTicket);
    writeDB(db);

    res.status(201).json({
      success: true,
      ticketId: newTicket.id,
      message: "تیکت پشتیبانی شما با موفقیت ثبت شد و به زودی بررسی خواهد شد."
    });
  });

  // API - Get Support Tickets (Admin Only)
  app.get("/api/admin/tickets", requireAdminAuth, (req, res) => {
    const db = readDB();
    const tickets = db.tickets || [];
    // Sort so newer/pending tickets appear first
    const sortedTickets = tickets.slice().sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    res.json(sortedTickets);
  });

  // API - Update Support Ticket status/note (Admin Only)
  app.post("/api/admin/tickets/:id/resolve", requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const db = readDB();
    db.tickets = db.tickets || [];
    
    const ticketIndex = db.tickets.findIndex((t: any) => t.id === id);
    if (ticketIndex === -1) {
      return res.status(404).json({ error: "تیکت یافت نشد" });
    }

    db.tickets[ticketIndex].status = status || "resolved";
    db.tickets[ticketIndex].adminNote = adminNote !== undefined ? adminNote.trim() : db.tickets[ticketIndex].adminNote;
    db.tickets[ticketIndex].updatedAt = new Date().toISOString();

    writeDB(db);
    res.json({ success: true, message: "وضعیت تیکت با موفقیت بروزرسانی شد" });
  });

  // API - Get Gemini Config (Admin Only)
  app.get("/api/admin/gemini-config", requireAdminAuth, (req, res) => {
    const db = readDB();
    res.json({
      geminiApiKey: db.geminiApiKey || "",
      hasEnvFallback: !!process.env.GEMINI_API_KEY
    });
  });

  // API - Update Gemini Config (Admin Only)
  app.post("/api/admin/gemini-config", requireAdminAuth, (req, res) => {
    const { geminiApiKey } = req.body;
    
    const db = readDB();
    db.geminiApiKey = geminiApiKey ? geminiApiKey.trim() : "";
    writeDB(db);

    res.json({
      success: true,
      message: "تنظیمات کلید API هوش مصنوعی Gemini با موفقیت بروزرسانی شد."
    });
  });

  // API - Get Public Site Settings (Public Access)
  app.get("/api/settings", (req, res) => {
    const db = readDB();
    res.json(db.settings || {
      siteTitle: "فروشگاه بزرگ فایل دیجیتال",
      faviconUrl: "/favicon.ico",
      headerScript: ""
    });
  });

  // API - Get Admin App Settings (Admin Only)
  app.get("/api/admin/settings", requireAdminAuth, (req, res) => {
    const db = readDB();
    res.json({
      geminiApiKey: db.geminiApiKey || "",
      hasEnvFallback: !!process.env.GEMINI_API_KEY,
      siteTitle: db.settings?.siteTitle || "فروشگاه بزرگ فایل دیجیتال",
      faviconUrl: db.settings?.faviconUrl || "/favicon.ico",
      headerScript: db.settings?.headerScript || ""
    });
  });

  // API - Update Admin App Settings (Admin Only)
  app.post("/api/admin/settings", requireAdminAuth, (req, res) => {
    const { geminiApiKey, siteTitle, faviconUrl, headerScript } = req.body;
    
    const db = readDB();
    db.geminiApiKey = geminiApiKey !== undefined ? geminiApiKey.trim() : (db.geminiApiKey || "");
    
    if (!db.settings) {
      db.settings = {
        siteTitle: "فروشگاه بزرگ فایل دیجیتال",
        faviconUrl: "/favicon.ico",
        headerScript: ""
      };
    }
    
    db.settings.siteTitle = siteTitle !== undefined ? siteTitle.trim() : (db.settings.siteTitle || "فروشگاه بزرگ فایل دیجیتال");
    db.settings.faviconUrl = faviconUrl !== undefined ? faviconUrl.trim() : (db.settings.faviconUrl || "/favicon.ico");
    db.settings.headerScript = headerScript !== undefined ? headerScript : (db.settings.headerScript || "");
    
    writeDB(db);

    res.json({
      success: true,
      message: "تنظیمات عمومی و سیستمی وب سایت با موفقیت بروزرسانی شد."
    });
  });

  // API - Generate Product Content using Gemini (Admin Only)
  app.post("/api/admin/generate-product-details", requireAdminAuth, async (req, res) => {
    const { title, categories, includeQAs, includeTable } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "وارد کردن عنوان اولیه برای پردازش هوش مصنوعی الزامی است." });
    }

    const db = readDB();
    const resolvedApiKey = (db.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();

    if (!resolvedApiKey) {
      return res.status(400).json({ 
        error: "کلید API مربوط به Gemini تعریف نشده است. لطفاً ابتدا کلید خود را در تب «تنظیمات هوش مصنوعی» پنل ادمین وارد کرده و گزینه ذخیره را بزنید یا متغیر محیطی GEMINI_API_KEY را تنظیم نمایید." 
      });
    }

    try {
      const categoriesJson = JSON.stringify(categories || [
        { id: "script", label: "کد و اسکریپت" },
        { id: "template", label: "قالب و گرافیک" },
        { id: "book", label: "آموزش و کتاب" },
        { id: "video", label: "دوره و ویدیو" },
        { id: "other", label: "سایر فایل‌ها" }
      ]);

      let extraDirectives = "";
      if (includeQAs) {
        extraDirectives += `\n- حتماً در انتهای توضیحات محصول، یک بخش با عنوان "<h2>پرسش‌های متداول (Q&A)</h2>" قرار دهید که شامل ۱۰ مورد پرسش و پاسخ کاربردی کامل، مرتبط و جذاب متناسب با این عنوان باشد.`;
      }
      if (includeTable) {
        extraDirectives += `\n- حتماً در میان یا انتهای توضیحات محصول، یک جدول مشخصات ساختاری شکیل با کدهای HTML (همچون <table>, <thead>, <th>, <tbody>, <tr>, <td>) بسازید که جزئیاتی چون جامعه مخاطب، کاربرد اصلی، پیش‌نیازها، زمان شروع استفاده و دیگر ویژگی‌های مهم را نمایش دهد.`;
      }

      const prompt = `شما یک کارشناس تولید محتوا و نویسنده حرفه‌ای در فروشگاه‌های اینترنتی فایل دیجیتال هستید.
عنوان فایل درخواست شده: "${title}"

وظیفه شما:
یک بسته محصول شکیل و فروشگاهی کامل برای این عنوان تولید کنید. خروجی باید به زبان فارسی روان، جذاب، و با فرمت مشخص شده باشد.

ملاحظات لازم برای فیلد "description" توضیحات محصول:
- توضیحات فصیح و جامع محصول در قالب کدهای HTML شیک (مثلا استفاده از تگ‌های <p>، <h4>، <ul>، <li>، <strong> و امثالهم) برای معرفی ویژگی‌ها، سرفصل‌ها، مزایای محصول، کسانی که برایشان مفید است و چگونگی استفاده از آن.${extraDirectives}

بخش‌های مورد نیاز در ساختار خروجی JSON:
1. "description": توضیحات فصیح تولید شده جامع فوق با فرمت کدهای HTML.
2. "price": قیمت پیشنهادی و عادلانه محصول به تومان (عدد صحیح بین 5000 تا 150000 تومان متناسب با ارزش، مثلاً 29000 یا 45000).
3. "category": انتخاب یکی از دسته‌بندی‌های زیر که بهترین تطابق را با محصول دارد (فقط شناسه id را از لیست برگردانید):
${categoriesJson}
4. "slug": یک آدرس اینترنتی (Slug) انگلیسی کوتاه، خوانا و بدون فاصله (مثلا 'premium-react-template' یا 'financial-planning-book').

لطفاً خروجی را دقیقاً منطبق با این طرحواره JSON (Schema) ارسال کنید.`;

      // Dynamically instantiate with the current resolved key
      const activeAi = new GoogleGenAI({
        apiKey: resolvedApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Phase 1: Try gemini-3.5-flash with Response Schema
      try {
        console.log("[AI Backend] Attempting Strategy 1: gemini-3.5-flash with schema...");
        const response = await activeAi.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                description: {
                  type: Type.STRING,
                  description: "HTML formatted high-quality persuasive product description in Persian context."
                },
                price: {
                  type: Type.INTEGER,
                  description: "Fair price in Tomans (number between 5000 and 150000)."
                },
                category: {
                  type: Type.STRING,
                  description: "The matched category ID from the provided categories list."
                },
                slug: {
                  type: Type.STRING,
                  description: "URL slug, letters and hyphens only, e.g. react-interactive-dashboard"
                }
              },
              required: ["description", "price", "category", "slug"]
            }
          }
        });

        if (response && response.text) {
          const generatedData = JSON.parse(response.text.trim());
          return res.json({
            success: true,
            title,
            description: generatedData.description,
            price: generatedData.price,
            category: generatedData.category,
            slug: generatedData.slug
          });
        }
        throw new Error("پاسخ دریافتی از مدل ۳.۵ خالی است.");
      } catch (schemaErr1: any) {
        console.warn("[AI Backend] Strategy 1 failed:", schemaErr1.message || schemaErr1);

        // Phase 2: Try gemini-2.5-flash with Response Schema
        try {
          console.log("[AI Backend] Attempting Strategy 2: gemini-2.5-flash with schema...");
          const response = await activeAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  description: {
                    type: Type.STRING,
                    description: "HTML formatted product description in Persian context."
                  },
                  price: {
                    type: Type.INTEGER,
                    description: "Fair price in Tomans."
                  },
                  category: {
                    type: Type.STRING,
                    description: "The matched category ID."
                  },
                  slug: {
                    type: Type.STRING,
                    description: "URL slug, letters and hyphens only."
                  }
                },
                required: ["description", "price", "category", "slug"]
              }
            }
          });

          if (response && response.text) {
            const generatedData = JSON.parse(response.text.trim());
            return res.json({
              success: true,
              title,
              description: generatedData.description,
              price: generatedData.price,
              category: generatedData.category,
              slug: generatedData.slug
            });
          }
          throw new Error("پاسخ دریافتی از مدل ۲.۵ خالی است.");
        } catch (schemaErr2: any) {
          console.warn("[AI Backend] Strategy 2 failed (gemini-2.5-flash with schema):", schemaErr2.message || schemaErr2);

          // Phase 3: No-Schema loose prompt with custom JSON regex extractor
          console.log("[AI Backend] Attempting Strategy 3: gemini-3.5-flash text style with parsing extraction...");
          const rawResponse = await activeAi.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt + "\n\nمهم: پاسخ نهایی را صرفاً به صورت ساختار خام معتبر JSON ارسال کنید. هیچ متن حاشیه‌ای یا توضیحات متفرقه در ابتدا یا انتهای آن ننویسید."
          });

          if (rawResponse && rawResponse.text) {
            const responseText = rawResponse.text.trim();
            let jsonText = responseText;
            
            // Extract from JSON markdown blocks if model appended code highlights
            const customMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
            if (customMatch && customMatch[1]) {
              jsonText = customMatch[1].trim();
            }

            const parsed = JSON.parse(jsonText);
            return res.json({
              success: true,
              title,
              description: parsed.description || "توضیحات تولید نشد.",
              price: Number(parsed.price) || 29000,
              category: parsed.category || "other",
              slug: parsed.slug || "custom-product"
            });
          }
          throw new Error("اتصال آزاد با گیت‌وی با شکست مواجه شد.");
        }
      }

    } catch (err: any) {
      console.error("Gemini Generation Exception:", err);
      res.status(500).json({ error: "خطا در فرآیند تولید محتوا با هوش مصنوعی: " + (err.message || err) });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FileStore API] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
