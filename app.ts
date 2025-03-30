import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";

import webhookRoutes from "./routes/webhook";
import flowRoutes from './routes/flow';
import body_parser from "body-parser";


const app = express();

app.use((req: express.Request,res: express.Response,next: express.NextFunction): void => {
    if (req.originalUrl === '/stripe/webhook') {  
      next();
    } else {
      body_parser.json()(req, res, next);
    }
  }
);


app.use("/webhook",webhookRoutes);
app.use("/flow",flowRoutes);

app.use("/",(req,res)=>{
  res.status(200).json(`server running on ${process.env.PORT}`)
});

app.use((req,res,next)=>{
  next(Error("End point not found"));
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error:unknown,req:Request,res:Response,next:NextFunction)=>{
  console.error("# error start #");
  console.error(error);
  console.error("# error end #");
  let errorMessage="An unknown error occured";
  if(error instanceof Error){
    errorMessage=error.message;
    res.status(500).json({error:errorMessage});
  }
});

export default app;