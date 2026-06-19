const Church = require('../models/Church');

// Get all churches
exports.getAllChurches = async (req, res) => {
  try {
    const churches = await Church.find();
    res.json({
      success: true,
      count: churches.length,
      data: churches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single church by ID
exports.getChurchById = async (req, res) => {
  try {
    const church = await Church.findById(req.params.id);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church not found'
      });
    }
    res.json({
      success: true,
      data: church
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new church
exports.createChurch = async (req, res) => {
  try {
    const church = await Church.create(req.body);
    res.status(201).json({
      success: true,
      data: church
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update church
exports.updateChurch = async (req, res) => {
  try {
    const church = await Church.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church not found'
      });
    }
    res.json({
      success: true,
      data: church
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete church
exports.deleteChurch = async (req, res) => {
  try {
    const church = await Church.findByIdAndDelete(req.params.id);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: 'Church not found'
      });
    }
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
