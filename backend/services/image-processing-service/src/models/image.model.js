const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.STRING(64),
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'user_id'
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_name'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'mime_type'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'file_size'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Image;
