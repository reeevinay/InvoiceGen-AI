import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

const restoreStockForOrder = async (order) => {
  if (!order?.items?.length) return;
  for (const item of order.items) {
    if (!item.productId) continue;
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock += Number(item.quantity || 0);
      if (product.stock > 0 && product.status === "Out of Stock") {
        product.status = "In Stock";
      }
      await product.save();
    }
  }
};

// Add Order
const addOrder = async (req, res) => {
  try {
    const { customerName, totalAmount, status, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    let computedTotal = Number(totalAmount || 0);
    const normalizedItems = [];

    if (Array.isArray(items) && items.length > 0) {
      computedTotal = 0;

      // Validate stock first before mutating any product
      for (const item of items) {
        const qty = Number(item.quantity);
        if (!item.productId || !Number.isFinite(qty) || qty <= 0) {
          return res.status(400).json({
            success: false,
            message: "Each order item must have a valid product and quantity >= 1",
          });
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found`,
          });
        }

        if (status !== "Cancelled" && product.stock < qty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.productName} (${product.stock} available)`,
          });
        }

        normalizedItems.push({
          productId: product._id,
          productName: product.productName,
          quantity: qty,
          price: product.price,
        });
        computedTotal += product.price * qty;
      }

      if (status !== "Cancelled") {
        for (const item of normalizedItems) {
          const product = await Product.findById(item.productId);
          product.stock = Math.max(0, product.stock - item.quantity);
          if (product.stock === 0) {
            product.status = "Out of Stock";
          }
          await product.save();
        }
      }
    }

    const order = new Order({
      customerName: customerName.trim(),
      items: normalizedItems,
      totalAmount: computedTotal,
      status: status || "Pending",
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order Added Successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get Orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Delete Order
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "Cancelled") {
      await restoreStockForOrder(order);
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Order Deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Update Order
const updateOrder = async (req, res) => {
  try {
    const existing = await Order.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const nextStatus = req.body.status || existing.status;

    if (existing.status !== "Cancelled" && nextStatus === "Cancelled") {
      await restoreStockForOrder(existing);
    }

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export { addOrder, getOrders, deleteOrder, updateOrder };