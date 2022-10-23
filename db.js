import {
  Sequelize,
  DataTypes,
  Model,
} from "sequelize";
//const { Sequelize, DataTypes, Model } = require('sequelize');
export const sequelize = new Sequelize('database', 'username', 'password', {
  dialect: 'sqlite',
  storage: 'database.sqlite',
});

