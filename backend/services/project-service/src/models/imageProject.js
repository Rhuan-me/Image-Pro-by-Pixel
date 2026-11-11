const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ImageProject = sequelize.define('ImageProject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'project_id'
  },
  imageId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'image_id'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'image_project',
  timestamps: true
});

module.exports = ImageProject;