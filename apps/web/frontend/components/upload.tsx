"use client";

import { useRef, useState } from "react";
import { ingestFiles } from "@/lib/api";


type Status = "idle" | "uploading" | "done" | "error";

export default function UploadDocuments(){
    const inputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [fileNames,setFileNames]  = useState<string[]>([]);

    async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = Array.from(e.target.files ?? []);
        if(file.length === 0) return;

        setStatus("uploading");
        try{
            await ingestFiles(file);
            setFileNames((prev)=>[...prev, ...file.map((f)=>f.name)])
            setStatus("done");
        }catch{
            setStatus("error");
        }finally {
            e.target.value = "";
        }
    }


    return(
        <div className = "mb-4">
            <input
                ref = {inputRef}
                type= "file"
                multiple
                accept=".pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.webp,.bmp"
                onChange = {handleChange}
                className = "hidden"
            />
            <button
                onClick={()=>inputRef.current?.click()}
                disabled = {status ==="uploading"}
                className = "rounded border px-3 py-2 text-sm"
            >
                {status === "uploading" ? "Uploading...":"Upload documents"}

            </button>
            
            {status === "error" && (
                <p className= "mt-2 text-sm text-red-600">Upload Failed.Try again</p>
            )}
            
            {fileNames.length > 0 && (
                <ul className = "mt-2 text-sm text-gray-600">
                    {fileNames.map((name)=>(
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            )}

        </div>

    )
}