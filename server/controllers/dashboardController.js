import User from "../models/User.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Supplier from "../models/supplierModel.js";
import Category from "../models/Category.js";

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalSuppliers,
      totalCategories,
      orders,
      lowStockProducts,
      outOfStockCount,
      inStockHealthyCount,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Supplier.countDocuments(),
      Category.countDocuments(),
      Order.find().select("totalAmount status"),
      Product.find({ stock: { $lte: 10 } }).sort({ stock: 1 }).limit(6),
      Product.countDocuments({ $or: [{ stock: { $lte: 0 } }, { status: "Out of Stock" }] }),
      Product.countDocuments({ stock: { $gt: 10 }, status: "In Stock" }),
      Order.find().sort({ createdAt: -1 }).limit(5),
    ]);

    const revenue = orders.reduce((sum, order) => {
      if (order.status === "Cancelled") return sum;
      return sum + Number(order.totalAmount || 0);
    }, 0);

    const lowStockCount = Math.max(0, totalProducts - outOfStockCount - inStockHealthyCount);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalSuppliers,
        totalCategories,
        revenue,
      },
      lowStockProducts,
      recentOrders,
      stockBreakdown: {
        inStock: inStockHealthyCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export { getDashboardStats };