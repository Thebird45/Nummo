import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log(`Nummo API corriendo en http://localhost:${env.port}`);
});
