import app from "./app";
import env from "./util/validateEnv";

const portNo=env.PORT||process.env.PORT;

app.listen(portNo, () => {
  console.log("server is running on port " + portNo);
});


