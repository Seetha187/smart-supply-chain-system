const mongoose = require("mongoose");
const csvParser = require("csv-parser");
const { Readable } = require("stream");
const Product = require("../models/Product");
const {
  buildRestockRecommendations,
  getLowStockProducts: findLowStockProducts,
} = require("../services/automationService");

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeSku = (sku) => String(sku || "").trim().toUpperCase();

const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from(buffer)
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, ""),
        })
      )
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
};

const getCsvValue = (row, field) => {
  return row[field] === undefined ? "" : String(row[field]).trim();
};

const parseCsvNumber = (row, field, fallback = 0) => {
  const rawValue = getCsvValue(row, field);

  if (rawValue === "") {
    return { value: fallback };
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0) {
    return { error: `${field} must be a non-negative number` };
  }

  return { value };
};

const buildCsvProduct = (row, rowNumber) => {
  const productName = getCsvValue(row, "productName");
  const sku = normalizeSku(row.sku);
  const quantityResult = parseCsvNumber(row, "quantity");
  const minimumStockResult = parseCsvNumber(row, "minimumStock", 0);
  const unitPriceResult = parseCsvNumber(row, "unitPrice", 0);
  const warehouseId = getCsvValue(row, "warehouseId");
  const errors = [];

  if (!productName) {
    errors.push("productName is required");
  }

  if (!sku) {
    errors.push("sku is required");
  }

  if (getCsvValue(row, "quantity") === "") {
    errors.push("quantity is required");
  } else if (quantityResult.error) {
    errors.push(quantityResult.error);
  }

  if (minimumStockResult.error) {
    errors.push(minimumStockResult.error);
  }

  if (unitPriceResult.error) {
    errors.push(unitPriceResult.error);
  }

  if (warehouseId && !isValidObjectId(warehouseId)) {
    errors.push("warehouseId must be a valid ID when provided");
  }

  if (errors.length > 0) {
    return {
      error: {
        row: rowNumber,
        sku: sku || getCsvValue(row, "sku") || "-",
        reason: errors.join(", "),
      },
    };
  }

  return {
    product: {
      productName,
      sku,
      category: getCsvValue(row, "category") || "General",
      quantity: quantityResult.value,
      minimumStock: minimumStockResult.value,
      unitPrice: unitPriceResult.value,
      ...(warehouseId ? { warehouseId } : {}),
    },
  };
};

const getProductOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
    return null;
  }

  const product = await Product.findById(id);

  if (!product) {
    res.status(404).json({
      success: false,
      message: "Product not found",
    });
    return null;
  }

  return product;
};

const createProduct = async (req, res) => {
  try {
    const {
      productName,
      sku,
      category,
      quantity,
      minimumStock,
      unitPrice,
      warehouseId,
    } = req.body;

    if (!productName || !sku) {
      return res.status(400).json({
        success: false,
        message: "Product name and SKU are required",
      });
    }

    const existingProduct = await Product.findOne({ sku });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    const product = await Product.create({
      productName,
      sku,
      category,
      quantity,
      minimumStock,
      unitPrice,
      warehouseId,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating product",
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
     console.error("GET PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.log("PRODUCT BY ID HIT", req.params.id);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching product",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await getProductOr404(req.params.id, res);

    if (!product) {
      return null;
    }

    const allowedFields = [
      "productName",
      "sku",
      "category",
      "quantity",
      "minimumStock",
      "unitPrice",
      "warehouseId",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updatedProduct = await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating product",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await getProductOr404(req.params.id, res);

    if (!product) {
      return null;
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting product",
    });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const products = await findLowStockProducts().populate(
      "createdBy",
      "name email role"
    );

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching low stock products",
    });
  }
};

const getRestockRecommendations = async (req, res) => {
  try {
    const recommendations = await buildRestockRecommendations();

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.log("RECOMMENDATIONS API HIT");
    return res.status(500).json({
      success: false,
      message: "Server error while fetching restock recommendations",
    });
  }
};

const importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    const rows = await parseCsvBuffer(req.file.buffer);
    const totalRows = rows.length;
    const skipped = [];
    const seenSkus = new Set();
    const candidates = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const { product, error } = buildCsvProduct(row, rowNumber);

      if (error) {
        skipped.push(error);
        return;
      }

      if (seenSkus.has(product.sku)) {
        skipped.push({
          row: rowNumber,
          sku: product.sku,
          reason: "Duplicate SKU in CSV",
        });
        return;
      }

      seenSkus.add(product.sku);
      candidates.push({ rowNumber, product });
    });

    const existingProducts = await Product.find({
      sku: { $in: candidates.map((candidate) => candidate.product.sku) },
    }).select("sku");
    const existingSkus = new Set(
      existingProducts.map((product) => normalizeSku(product.sku))
    );
    const productsToImport = [];

    candidates.forEach(({ rowNumber, product }) => {
      if (existingSkus.has(product.sku)) {
        skipped.push({
          row: rowNumber,
          sku: product.sku,
          reason: "SKU already exists",
        });
        return;
      }

      productsToImport.push({
        ...product,
        createdBy: req.user._id,
      });
    });

    const importedProducts =
      productsToImport.length > 0
        ? await Product.insertMany(productsToImport, { ordered: false })
        : [];

    return res.status(200).json({
      success: true,
      message: "Product import completed",
      totalRows,
      importedRows: importedProducts.length,
      skippedRows: skipped.length,
      errors: skipped,
      errorDetails: skipped,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while importing products",
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getRestockRecommendations,
  importProducts,
};
