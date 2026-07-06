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

// @desc    Create new resource (LINK / JSON — external URL)
// @route   POST /api/resources
// @access  Private/Admin
exports.createResource = async (req, res, next) => {
  try {
    if (!req.body.url) {
      return res.status(400).json({ success: false, message: 'A URL is required for link resources' });
    }
    // Reject non-shareable URLs. blob:/data: links only resolve in the uploader's
    // own browser session, so they break for every other user. PDFs must go
    // through POST /api/resources/upload instead.
    if (/^(blob:|data:)/i.test(req.body.url.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Local file (blob/data) URLs cannot be shared. Upload the PDF file instead of pasting a generated link.',
      });
    }
    const { fileData, ...safeBody } = req.body; // never accept raw fileData here
    const resource = await Resource.create({
      ...safeBody,
      uploadedBy: req.user._id
    });
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a file-backed resource (PDF) — stored in DB, served via /:id/file
// @route   POST /api/resources/upload
// @access  Private/Admin
exports.uploadResource = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { title, folder, isSolution } = req.body;
    if (!title || !folder) {
      return res.status(400).json({ success: false, message: 'Title and folder are required' });
    }

    const resource = await Resource.create({
      title,
      folder,
      isSolution: isSolution === 'true' || isSolution === true,
      type: 'PDF',
      mimeType: req.file.mimetype,
      fileData: req.file.buffer.toString('base64'),
      sizeBytes: req.file.size,
      uploadedBy: req.user._id,
    });

    // Store a stable, accessible endpoint as the URL.
    resource.url = `/api/resources/${resource._id}/file`;
    await resource.save();

    const data = resource.toObject();
    delete data.fileData;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream a stored file (PDF) so every user can access it
// @route   GET /api/resources/:id/file
// @access  Public (study materials; id is an unguessable ObjectId)
exports.getResourceFile = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id).select('+fileData mimeType title');
    if (!resource || !resource.fileData) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const buffer = Buffer.from(resource.fileData, 'base64');
    res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resource.title || 'resource')}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(buffer);
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
