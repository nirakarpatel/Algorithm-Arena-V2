const Resource = require('./Resource.model');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
exports.getResources = async (req, res, next) => {
  try {
    const { folder } = req.query;
    const filter = folder ? { folder } : {};
    const resources = await Resource.find(filter).sort('-createdAt');
    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new resource
// @route   POST /api/resources
// @access  Private/Admin
exports.createResource = async (req, res, next) => {
  try {
    const resource = await Resource.create({
      ...req.body,
      uploadedBy: req.user._id
    });
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private/Admin
exports.deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    
    await resource.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
