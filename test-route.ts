import express from "express";

const app = express();
app.get('/src/assets/images/:filename', (req, res) => {
  console.log("filename param:", req.params.filename);
  res.send('ok');
});
app.listen(3001, () => "listening");
