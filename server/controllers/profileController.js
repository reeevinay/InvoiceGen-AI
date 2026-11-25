import Profile from "../models/profileModel.js";
import User from "../models/User.js";

// Get Profile for authenticated user
export const getProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user._id });

    if (!profile) {
      profile = await Profile.create({
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || "",
        role: req.user.role || "Staff",
        company: "StockPilot Inventory",
        address: "",
        joinDate: req.user.createdAt
          ? new Date(req.user.createdAt).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })
          : "",
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Update Profile for authenticated user
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, company, joinDate } = req.body;

    const updatePayload = {
      name: name ?? req.user.name,
      email: email ?? req.user.email,
      phone: phone ?? req.user.phone ?? "",
      address: address ?? "",
      company: company ?? "",
      joinDate: joinDate ?? "",
      role: req.user.role,
    };

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updatePayload },
      { new: true, upsert: true, runValidators: true }
    );

    // Keep core User fields in sync
    await User.findByIdAndUpdate(req.user._id, {
      name: updatePayload.name,
      email: updatePayload.email,
      phone: updatePayload.phone,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.code === 11000 ? "Email already in use" : "Server Error",
    });
  }
};