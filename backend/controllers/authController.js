const asyncHandler = require("../middlewares/asyncHandler");
const userModel = require("../models/userModel");

exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const existingUser = await userModel.findIdByEmail(email);

  if (existingUser) {
    return res.status(409).json({ message: "This email is already registered. Please sign in instead." });
  }

  const userId = await userModel.create({ fullName, email, password });
  await userModel.createEmptyProfile(userId);

  res.status(201).json({ userId, fullName, email });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findByCredentials(email, password);

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json(user);
});
