const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type HistoryMessage ={
    role: "user" | "assistant";
    content:string;

}

export async function ingestFiles(files: File[]) {
  return Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(`Ingest failed for ${file.name} (${response.status})`);
      return response.json();
    })
  );
}


export async function sendChatMessage(message:string, history: HistoryMessage[] = []){
    const response = await fetch(`${API_BASE_URL}/api/chat`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message,history}),
    })

    if(!response.ok){
        throw new Error(`Failed to send message(${response.status})`)
    }
    return response;
}