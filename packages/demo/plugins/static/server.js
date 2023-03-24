import express from "express";
import ReactDOMServer from 'react-dom/server';
import App from "./server-entry";

const app = express();
const port = process.env.PORT ?? 3000;
app.use("/assets", express.static("."));
app.get('*', async (request, response) => {
  let didError = false;
  const stream = ReactDOMServer.renderToPipeableStream(
    App(request),
    {
      bootstrapModules: ["/assets/client/client.js"],
      // bootstrapScripts: ["/client.mjs"],
      onShellReady: () => {
        response.statusCode = didError ? 500 : 200;
        response.setHeader('Content-type', 'text/html');
        stream.pipe(response);
      },
      onError: (error) => {
        didError = true;
        console.log(error);
        response.status(500).send('Internal Server Error');
      }
    }
  );
})

app.listen(port, () => {
  console.log(`Started listening at http://localhost:${port}`)
})
