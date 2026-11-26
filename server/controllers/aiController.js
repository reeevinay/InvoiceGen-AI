import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Supplier from "../models/supplierModel.js";
import { callGemini, hasGeminiKey } from "../services/aiService.js";

// Deterministic local fallback for NL-to-Invoice parsing
const localParseInvoice = (prompt, products) => {
  const text = prompt || "";
  const lower = text.toLowerCase();

  // Extract customer name (e.g., "for Rahul Sharma", "bill Priya", "Utkarsh Singh bought...")
  let customerName = "";
  const custMatch =
    text.match(/(?:bill|invoice|customer|for)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i) ||
    text.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:bought|ordered|purchased)\b/i);
  if (custMatch && !["for", "to", "a", "an", "the"].includes(custMatch[1].toLowerCase())) {
    customerName = custMatch[1].trim();
  }

  // Extract status
  let status = "Pending";
  if (/\bdelivered\b|\bpaid\b|\bcompleted\b/i.test(lower)) status = "Delivered";
  else if (/\bcancelled\b|\bcanceled\b/i.test(lower)) status = "Cancelled";

  // Extract GST/tax rate (e.g., "18% gst", "tax 12%")
  let taxRate = 0;
  const taxMatch = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:gst|tax|vat)?/);
  if (taxMatch) taxRate = Number(taxMatch[1]);

  // Match products from catalog with optional preceding quantity
  const items = [];
  for (const p of products) {
    const pName = p.productName.toLowerCase();
    const escaped = pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(\\d+)\\s*(?:x\\s*)?${escaped}s?\\b|\\b${escaped}s?\\s*(?:x|\\*)\\s*(\\d+)`, "i");
    const m = text.match(pattern);
    if (m) {
      const qty = Number(m[1] || m[2] || 1);
      items.push({ productId: p._id.toString(), quantity: Math.max(1, qty) });
    } else if (lower.includes(pName)) {
      items.push({ productId: p._id.toString(), quantity: 1 });
    }
  }

  // Fallback for custom/non-catalog items (e.g., "4 Chaap costing 160 each")
  let customAmount = 0;
  const unmatchedItems = [];
  if (items.length === 0) {
    const unitMatch = text.match(/(\d+)\s+([a-zA-Z][a-zA-Z0-9\s-]{1,30}?)\s+(?:costing|at|@|for)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:each|per\s+unit)?/i);
    if (unitMatch) {
      const qty = Number(unitMatch[1]);
      const unitPrice = Number(unitMatch[3]);
      customAmount = Number((qty * unitPrice).toFixed(2));
      unmatchedItems.push(`${qty} × ${unitMatch[2].trim()} @ ₹${unitPrice}`);
    } else {
      const totalMatch = text.match(/(?:total|amount|worth|for)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
      if (totalMatch) {
        customAmount = Number(totalMatch[1]);
      }
    }
  }

  return { customerName, status, taxRate, items, customAmount, unmatchedItems };
};

// POST /api/ai/parse-invoice
export const parseInvoicePrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter an invoice description to parse",
      });
    }

    const products = await Product.find().select("_id productName price stock status category");
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let parsed;
    let source = "local-fallback";

    if (hasGeminiKey()) {
      try {
        const catalogContext = products
          .map(
            (p) =>
              `- id: "${p._id}", name: "${p.productName}", category: "${p.category}", price: ${p.price}, stock: ${p.stock}`
          )
          .join("\n");

        const schema = {
          type: "OBJECT",
          properties: {
            customerName: { type: "STRING" },
            status: { type: "STRING", enum: ["Pending", "Delivered", "Cancelled"] },
            taxRate: { type: "NUMBER" },
            customAmount: { type: "NUMBER" },
            unmatchedItems: { type: "ARRAY", items: { type: "STRING" } },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productId: { type: "STRING" },
                  quantity: { type: "INTEGER" },
                },
                required: ["productId", "quantity"],
              },
            },
          },
          required: ["customerName", "status", "taxRate", "items", "customAmount", "unmatchedItems"],
        };

        parsed = await callGemini({
          systemInstruction:
            "You extract structured invoice data from natural language. Match product names case-insensitively and handle singular/plural or minor variations (e.g., 'mechanical keyboards' -> 'Mechanical Keyboard') using ONLY productIds from the provided catalog. Only if an item truly does not exist in the catalog, put it in unmatchedItems and calculate its total in customAmount. Otherwise set customAmount to 0 and unmatchedItems to [].",
          prompt: `Catalog:\n${catalogContext}\n\nUser request:\n"${prompt}"`,
          responseSchema: schema,
        });
        source = "gemini";
      } catch (aiErr) {
        console.warn("Gemini parse fallback:", aiErr.message);
        parsed = localParseInvoice(prompt, products);
      }
    } else {
      parsed = localParseInvoice(prompt, products);
    }

    // Ground & validate every item against MongoDB
    const validatedItems = [];
    const warnings = [];

    for (const item of parsed.items || []) {
      const prod = productMap.get(String(item.productId));
      if (!prod) continue;
      const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
      if (prod.stock < qty) {
        warnings.push(
          `${prod.productName}: requested ${qty}, only ${prod.stock} in stock`
        );
      }
      validatedItems.push({
        productId: prod._id,
        productName: prod.productName,
        price: prod.price,
        quantity: qty,
        availableStock: prod.stock,
      });
    }

    const taxRate = Math.min(100, Math.max(0, Number(parsed.taxRate) || 0));
    const subtotal =
      validatedItems.length > 0
        ? validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        : Math.max(0, Number(parsed.customAmount) || 0);
    const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    if (validatedItems.length === 0 && (parsed.unmatchedItems?.length > 0 || subtotal > 0)) {
      const desc = parsed.unmatchedItems?.length
        ? parsed.unmatchedItems.join(", ")
        : "Custom item";
      warnings.push(
        `Not in product catalog (${desc}) — filled Custom Total Amount (₹${totalAmount.toLocaleString()}) instead.`
      );
    }

    res.status(200).json({
      success: true,
      source,
      draft: {
        customerName: (parsed.customerName || "").trim(),
        status: ["Pending", "Delivered", "Cancelled"].includes(parsed.status)
          ? parsed.status
          : "Pending",
        taxRate,
        subtotal,
        taxAmount,
        totalAmount,
        items: validatedItems,
      },
      warnings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to parse invoice" });
  }
};

// GET /api/ai/reorder-insights
export const getReorderInsights = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [products, recentOrders] = await Promise.all([
      Product.find(),
      Order.find({
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: "Cancelled" },
      }),
    ]);

    const unitsSold30d = new Map();
    for (const order of recentOrders) {
      for (const item of order.items || []) {
        if (!item.productId) continue;
        const key = item.productId.toString();
        unitsSold30d.set(key, (unitsSold30d.get(key) || 0) + Number(item.quantity || 0));
      }
    }

    const recommendations = products
      .map((p) => {
        const sold = unitsSold30d.get(p._id.toString()) || 0;
        const avgDailySales = Number((sold / 30).toFixed(2));
        const daysLeft =
          avgDailySales > 0 ? Number((p.stock / avgDailySales).toFixed(1)) : null;
        const target14DayStock = Math.max(15, Math.ceil(avgDailySales * 14));
        const needsReorder =
          p.stock <= 10 || (daysLeft !== null && daysLeft <= 7);
        const suggestedOrderQty = needsReorder
          ? Math.max(0, target14DayStock - p.stock)
          : 0;

        return {
          productId: p._id,
          productName: p.productName,
          category: p.category,
          currentStock: p.stock,
          sold30d: sold,
          avgDailySales,
          daysLeft,
          needsReorder,
          suggestedOrderQty,
        };
      })
      .filter((r) => r.needsReorder)
      .sort((a, b) => a.currentStock - b.currentStock);

    let summary =
      recommendations.length === 0
        ? "All products currently have healthy stock relative to recent sales velocity."
        : `${recommendations.length} product(s) require restocking based on current stock and 30-day demand velocity.`;
    let source = "local-fallback";

    if (recommendations.length > 0 && hasGeminiKey()) {
      try {
        summary = await callGemini({
          systemInstruction:
            "You are an inventory operations analyst. Write a concise 2-3 sentence procurement brief summarizing urgent restocks using ONLY the provided numbers.",
          prompt: `Restock candidates:\n${JSON.stringify(recommendations.slice(0, 6))}`,
        });
        source = "gemini";
      } catch (aiErr) {
        console.warn("Gemini reorder fallback:", aiErr.message);
      }
    }

    res.status(200).json({
      success: true,
      source,
      summary,
      recommendations: recommendations.slice(0, 8),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to compute reorder insights",
    });
  }
};

// POST /api/ai/ask-ledger
export const askLedger = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a question",
      });
    }

    const [orders, products, suppliers] = await Promise.all([
      Order.find().sort({ createdAt: -1 }),
      Product.find(),
      Supplier.find(),
    ]);

    const revenueByStatus = { Delivered: 0, Pending: 0, Cancelled: 0 };
    const customerSpend = new Map();
    const productStats = new Map();
    const pendingInvoices = [];
    const categoryStats = new Map();

    for (const o of orders) {
      revenueByStatus[o.status] =
        (revenueByStatus[o.status] || 0) + Number(o.totalAmount || 0);
      if (o.status === "Pending") {
        pendingInvoices.push({
          customerName: o.customerName,
          totalAmount: Number(o.totalAmount || 0),
          date: o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "",
        });
      }
      if (o.status !== "Cancelled") {
        customerSpend.set(
          o.customerName,
          (customerSpend.get(o.customerName) || 0) + Number(o.totalAmount || 0)
        );
        for (const item of o.items || []) {
          const prev = productStats.get(item.productName) || {
            units: 0,
            revenue: 0,
          };
          prev.units += Number(item.quantity || 0);
          prev.revenue += Number(item.price || 0) * Number(item.quantity || 0);
          productStats.set(item.productName, prev);
        }
      }
    }

    for (const p of products) {
      const prev = categoryStats.get(p.category) || { count: 0, totalStock: 0 };
      prev.count += 1;
      prev.totalStock += Number(p.stock || 0);
      categoryStats.set(p.category, prev);
    }

    const topCustomers = [...customerSpend.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }));

    const topProducts = [...productStats.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, stats]) => ({
        name,
        units: stats.units,
        revenue: Number(stats.revenue.toFixed(2)),
      }));

    const lowStock = products
      .filter((p) => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .map((p) => ({ name: p.productName, category: p.category, stock: p.stock }));

    const activeOrdersCount = orders.filter((o) => o.status !== "Cancelled").length;
    const totalActiveRevenue = Number(
      (revenueByStatus.Delivered + revenueByStatus.Pending).toFixed(2)
    );

    const snapshot = {
      totalOrders: orders.length,
      activeOrdersCount,
      avgOrderValue: activeOrdersCount
        ? Number((totalActiveRevenue / activeOrdersCount).toFixed(2))
        : 0,
      totalProducts: products.length,
      activeSuppliers: suppliers.filter((s) => s.status === "Active").length,
      revenueDelivered: Number(revenueByStatus.Delivered.toFixed(2)),
      revenuePending: Number(revenueByStatus.Pending.toFixed(2)),
      revenueCancelled: Number(revenueByStatus.Cancelled.toFixed(2)),
      pendingInvoices,
      topCustomers,
      topProducts,
      lowStock,
      products: products.map((p) => ({
        name: p.productName,
        category: p.category,
        price: p.price,
        stock: p.stock,
        status: p.status,
      })),
      categories: [...categoryStats.entries()].map(([name, s]) => ({
        name,
        ...s,
      })),
    };

    let structured = null;
    let source = "local-fallback";

    if (hasGeminiKey()) {
      try {
        const responseSchema = {
          type: "OBJECT",
          properties: {
            summary: { type: "STRING" },
            highlights: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: { type: "STRING" },
                  value: { type: "STRING" },
                },
                required: ["label", "value"],
              },
            },
            columns: { type: "ARRAY", items: { type: "STRING" } },
            rows: {
              type: "ARRAY",
              items: { type: "ARRAY", items: { type: "STRING" } },
            },
            actionRoute: {
              type: "STRING",
              enum: [
                "/admin-dashboard/orders",
                "/admin-dashboard/products",
                "/admin-dashboard/suppliers",
                "/admin-dashboard/categories",
                "",
              ],
            },
            actionLabel: { type: "STRING" },
          },
          required: ["summary", "highlights", "columns", "rows"],
        };

        structured = await callGemini({
          systemInstruction:
            "You are InvoiceGen AI, a senior financial & inventory analyst. Return a crisp executive summary (1-2 sentences), 2-3 key metric highlights, and a structured table (columns + rows) when comparing items/customers/invoices. Use ONLY numbers from the JSON snapshot. Format currency in ₹ with commas.",
          prompt: `Ledger Snapshot:\n${JSON.stringify(snapshot)}\n\nQuestion: ${question}`,
          responseSchema,
        });
        source = "gemini";
      } catch (aiErr) {
        console.warn("Gemini ask-ledger fallback:", aiErr.message);
      }
    }

    if (!structured) {
      const q = question.toLowerCase();
      if (q.includes("customer")) {
        structured = {
          summary: topCustomers.length
            ? `${topCustomers[0].name} leads total spend at ₹${topCustomers[0].total.toLocaleString()} across ${activeOrdersCount} active invoices.`
            : "No customer order data available yet.",
          highlights: [
            { label: "Active Revenue", value: `₹${totalActiveRevenue.toLocaleString()}` },
            { label: "Avg Invoice Value", value: `₹${snapshot.avgOrderValue.toLocaleString()}` },
          ],
          columns: ["Customer", "Total Spend"],
          rows: topCustomers.map((c) => [c.name, `₹${c.total.toLocaleString()}`]),
          actionRoute: "/admin-dashboard/orders",
          actionLabel: "View Invoices",
        };
      } else if (q.includes("product") || q.includes("selling") || q.includes("top")) {
        structured = {
          summary: topProducts.length
            ? `${topProducts[0].name} is your highest-earning SKU at ₹${topProducts[0].revenue.toLocaleString()} (${topProducts[0].units} units sold).`
            : "No itemized product sales recorded yet.",
          highlights: [
            { label: "Total SKUs", value: String(snapshot.totalProducts) },
            { label: "Top SKU Revenue", value: topProducts[0] ? `₹${topProducts[0].revenue.toLocaleString()}` : "₹0" },
          ],
          columns: ["Product", "Units Sold", "Revenue"],
          rows: topProducts.map((p) => [
            p.name,
            String(p.units),
            `₹${p.revenue.toLocaleString()}`,
          ]),
          actionRoute: "/admin-dashboard/products",
          actionLabel: "Manage Products",
        };
      } else if (q.includes("pending") || q.includes("revenue") || q.includes("sales")) {
        structured = {
          summary: `₹${snapshot.revenueDelivered.toLocaleString()} has been collected/delivered, with ₹${snapshot.revenuePending.toLocaleString()} pending across ${pendingInvoices.length} unpaid invoice(s).`,
          highlights: [
            { label: "Delivered", value: `₹${snapshot.revenueDelivered.toLocaleString()}` },
            { label: "Pending", value: `₹${snapshot.revenuePending.toLocaleString()}` },
          ],
          columns: ["Customer", "Pending Amount", "Date"],
          rows: pendingInvoices.map((inv) => [
            inv.customerName,
            `₹${inv.totalAmount.toLocaleString()}`,
            inv.date || "—",
          ]),
          actionRoute: "/admin-dashboard/orders",
          actionLabel: "Follow Up on Invoices",
        };
      } else if (q.includes("stock") || q.includes("low")) {
        structured = {
          summary: lowStock.length
            ? `${lowStock.length} SKU(s) are at or below 10 units and need attention.`
            : "All products are sufficiently stocked above 10 units.",
          highlights: [
            { label: "Low / Out of Stock", value: String(lowStock.length) },
            { label: "Total SKUs", value: String(snapshot.totalProducts) },
          ],
          columns: ["Product", "Category", "Stock Left"],
          rows: lowStock.map((p) => [p.name, p.category, `${p.stock} units`]),
          actionRoute: "/admin-dashboard/products",
          actionLabel: "Restock Products",
        };
      } else {
        structured = {
          summary: `You have ${snapshot.totalOrders} total invoices (₹${totalActiveRevenue.toLocaleString()} active value) across ${snapshot.totalProducts} products and ${snapshot.activeSuppliers} active suppliers.`,
          highlights: [
            { label: "Active Revenue", value: `₹${totalActiveRevenue.toLocaleString()}` },
            { label: "Avg Invoice", value: `₹${snapshot.avgOrderValue.toLocaleString()}` },
            { label: "Low Stock SKUs", value: String(lowStock.length) },
          ],
          columns: [],
          rows: [],
          actionRoute: "",
          actionLabel: "",
        };
      }
    }

    res.status(200).json({
      success: true,
      source,
      result: structured,
      answer: structured.summary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to analyze ledger" });
  }
};
