import type {Request,Response} from 'express';
import  { Readable } from "node:stream";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import multer from 'multer';

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

export const upload = multer({
    storage:multer.memoryStorage(),
    limits:{fileSize: 20 * 1024 * 1024}
});

export const uploadMiddleware = upload.single('file');

export async function upload_file(req:Request,res:Response):Promise<void>{
    try{
        if(!req.file){
            res.status(400).json({error:"No file uploaded"})
            return;
        }

        const form  = new FormData();

        form.append("file",
            new Blob([new Uint8Array(req.file.buffer)],{
                type: req.file.mimetype
            }),
            req.file.originalname
        );

        const upstream = await fetch( `${AGENT_URL}/ingest`,{
            method:"POST",
            body:form,
        })

        const result = await upstream.json();

        res.status(upstream.status).json(result);
    
    }catch(err){
        console.error("Document ingestion failed",err)
        res.status(502).json({
            error:"Agent service unreachable"
        })
    }
}


export async function chat(req:Request, res:Response) {
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Agent service error", status: upstream.status });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    Readable.fromWeb(upstream.body as unknown as NodeWebStream).pipe(res);
  } catch (err) {
    if (controller.signal.aborted) return;
    if (!res.headersSent) {
      res.status(502).json({ error: "Agent service unreachable" });
    } else {
      res.end();
    }
  }
};

export function callAgent( body:{message:string; history:unknown[]; top_k?:number}, signal:AbortSignal){
  return fetch(`${AGENT_URL}/chat`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body),
    signal
  });
}

export async function streamToClient(  body: ReadableStream<Uint8Array>,res: Response ){
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";
  let leftOver = "";
  let hadError = false;
  
  while(true){
    const { done,value } = await reader.read();
    if(done) break;

    const chunk = decoder.decode(value,{stream:true});
    res.write(chunk);

    leftOver += chunk;
    const lines = leftOver.split("\n")
    leftOver = lines.pop() ?? "";

    for (const line of lines){
      if(!line.startsWith("data:")) continue;

      try{
        const parsed = JSON.parse(line.slice(5).trim());
        if( parsed.type === "token") fullText += parsed.text;
        if( parsed.type === "error") hadError = true;
      } catch{

      }
    }
  }
  return {fullText, hadError};
}