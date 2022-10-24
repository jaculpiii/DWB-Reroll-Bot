import {
  sequelize,
} from "../db.js";
import {
  DataTypes,
  Model,
} from "sequelize";

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  currency: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  indexes: [{ unique: true, fields: ['id'] }]
});

//console.log(User === sequelize.models.User);

