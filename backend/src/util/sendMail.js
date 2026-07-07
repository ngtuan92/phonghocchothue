const nodemailer = require("nodemailer");
require('dotenv').config();

const EMAIL = process.env.EMAIL_SENDMAIL;
const PASS = process.env.PASSWORD_SENDMAIL;

const mail = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: EMAIL,
      pass: PASS,
    },
  });

module.exports = mail;

// const info = await mail.sendMail({
//   from: '"Fred Foo 👻" <foo@example.com>', // sender address
//   to: "bar@example.com, baz@example.com", // list of receivers
//   subject: "Hello ✔", // Subject line
//   text: "Hello world?", // plain text body
//   html: "<b>Hello world?</b>", // html body
// });