import http from "http";

http.get("http://localhost:3000/src/assets/images/fiction_book_cover_1779809349705.png", (res) => {
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", res.headers);
});
